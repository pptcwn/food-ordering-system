import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@food-ordering/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Verify LINE ID Token from LIFF SDK and create/update customer account
   */
  async loginWithLine(idToken: string) {
    try {
      const channelId = this.configService.get<string>('LINE_CHANNEL_ID');
      // Verify ID token with official LINE API
      const verifyRes = await axios.post(
        'https://api.line.me/oauth2/v2.1/verify',
        new URLSearchParams({
          id_token: idToken,
          client_id: channelId || '',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const { sub: lineUserId, name: displayName, picture: pictureUrl } = verifyRes.data;

      if (!lineUserId) {
        throw new UnauthorizedException('Invalid LINE ID token');
      }

      // Check if LineUser exists
      let lineUser = await this.prisma.lineUser.findUnique({
        where: { lineUserId },
        include: {
          user: {
            include: {
              addresses: {
                where: { isDefault: true },
                take: 1,
              },
            },
          },
        },
      });

      let user = lineUser?.user;

      if (!lineUser) {
        // Create new User & LineUser
        user = await this.prisma.user.create({
          data: {
            name: displayName || 'LINE Customer',
            role: UserRole.CUSTOMER,
            lineUser: {
              create: {
                lineUserId,
                displayName: displayName || 'LINE Customer',
                pictureUrl: pictureUrl || null,
              },
            },
          },
          include: {
            addresses: true,
          },
        });
      } else {
        // Update line profile
        await this.prisma.lineUser.update({
          where: { lineUserId },
          data: {
            displayName: displayName || lineUser.displayName,
            pictureUrl: pictureUrl || lineUser.pictureUrl,
          },
        });
      }

      const tokens = this.generateTokens(user!.id, user!.role, lineUserId, user!.email || undefined);

      const hasPhone = !!user!.phone && user!.phone.length >= 9;
      const hasAddress = user!.addresses && user!.addresses.length > 0;
      const hasCompletedProfile = hasPhone && hasAddress;

      return {
        ...tokens,
        user: {
          id: user!.id,
          name: user!.name,
          phone: user!.phone,
          role: user!.role,
          lineUserId,
          pictureUrl,
        },
        hasCompletedProfile,
        defaultAddress: user!.addresses?.[0] || null,
      };
    } catch (error: any) {
      this.logger.error('Failed to verify LINE ID token', error.response?.data || error.message);
      throw new UnauthorizedException('LINE login failed: ' + (error.response?.data?.error_description || error.message));
    }
  }

  /**
   * Admin / Staff Login with Email & Password
   */
  async loginAdmin(email: string, password: string) {
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { staff: true },
    });

    // Auto-bootstrap initial Super Admin account if email matches default
    if (!user && email === 'admin@foodordering.com') {
      const hash = await bcrypt.hash(password || 'admin123', 10);
      user = await this.prisma.user.create({
        data: {
          email: 'admin@foodordering.com',
          name: 'System Super Admin',
          phone: '0812345678',
          role: UserRole.SUPER_ADMIN,
          passwordHash: hash,
          isActive: true,
        },
        include: { staff: true },
      });
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // If user has no passwordHash yet (seeded without hash)
    if (!user.passwordHash) {
      const hash = await bcrypt.hash(password, 10);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash },
        include: { staff: true },
      });
    } else {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    }

    const tokens = this.generateTokens(user.id, user.role, undefined, user.email || undefined);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.staff?.branchId || null,
      },
    };
  }

  /**
   * Refresh JWT Token
   */
  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'super_secret_refresh_jwt_key_change_in_production');
      const payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { lineUser: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User no longer exists or is inactive');
      }

      return this.generateTokens(user.id, user.role, user.lineUser?.lineUserId, user.email || undefined);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokens(userId: string, role: string, lineUserId?: string, email?: string) {
    const payload = { sub: userId, role, lineUserId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'super_secret_jwt_key_change_in_production_min_32_chars'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'super_secret_refresh_jwt_key_change_in_production'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    return { accessToken, refreshToken };
  }
}
