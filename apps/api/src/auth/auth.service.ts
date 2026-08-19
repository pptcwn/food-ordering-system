import { Injectable, UnauthorizedException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
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
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      this.logger.log(`Admin login attempt for: ${cleanEmail}`);

      let user = await this.prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { staff: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

      // A staff account without a provisioned password is not login-capable.
      if (!user.passwordHash) {
        throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
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
    } catch (err: any) {
      this.logger.error(`loginAdmin error: ${err.message}`, err.stack);
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(err.message || 'การเข้าสู่ระบบล้มเหลว');
    }
  }

  /**
   * Refresh JWT Token
   */
  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret = this.requiredSecret('JWT_REFRESH_SECRET');
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

  /**
   * Provides deterministic identities for an explicitly enabled local demo.
   * This deliberately does not share the LINE verification path and is hidden
   * outside development so it cannot become a production authentication fallback.
   */
  async loginDevelopmentCustomer() {
    this.assertDevelopmentDemoEnabled();
    const email = this.requiredDevelopmentValue('DEV_DEMO_CUSTOMER_EMAIL');
    const name = this.configService.get<string>('DEV_DEMO_CUSTOMER_NAME')?.trim() || 'Local Demo Customer';
    const lineUserId = `dev-demo:${email}`;

    const user = await this.prisma.user.upsert({
      where: { email },
      update: { name, role: UserRole.CUSTOMER, isActive: true },
      create: {
        email,
        name,
        role: UserRole.CUSTOMER,
        lineUser: { create: { lineUserId, displayName: name } },
      },
      include: { lineUser: true, addresses: { where: { isDefault: true }, take: 1 } },
    });

    // A prior local run may have created the user before the demo LINE record.
    if (!user.lineUser) {
      await this.prisma.lineUser.upsert({
        where: { userId: user.id },
        update: { lineUserId, displayName: name },
        create: { userId: user.id, lineUserId, displayName: name },
      });
    }

    const tokens = this.generateTokens(user.id, UserRole.CUSTOMER, lineUserId, user.email || undefined);
    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: UserRole.CUSTOMER, lineUserId },
      hasCompletedProfile: false,
      defaultAddress: user.addresses[0] || null,
      demo: true,
    };
  }

  async loginDevelopmentStaff(role: 'admin' | 'kitchen') {
    this.assertDevelopmentDemoEnabled();
    if (role !== 'admin' && role !== 'kitchen') throw new NotFoundException('Not found');

    const branch = await this.ensureDevelopmentBranch();
    const config = role === 'admin'
      ? { emailKey: 'DEV_DEMO_STAFF_EMAIL', passwordKey: 'DEV_DEMO_STAFF_PASSWORD', name: 'Local Demo Admin', role: UserRole.ADMIN }
      : { emailKey: 'DEV_DEMO_KITCHEN_EMAIL', passwordKey: 'DEV_DEMO_KITCHEN_PASSWORD', name: 'Local Demo Kitchen', role: UserRole.KITCHEN };
    const email = this.requiredDevelopmentValue(config.emailKey);
    const password = this.requiredDevelopmentValue(config.passwordKey);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        name: config.name,
        role: config.role,
        passwordHash,
        isActive: true,
        staff: { upsert: { update: { branchId: branch.id, role: config.role, isActive: true }, create: { branchId: branch.id, role: config.role } } },
      },
      create: {
        email,
        name: config.name,
        role: config.role,
        passwordHash,
        staff: { create: { branchId: branch.id, role: config.role } },
      },
      include: { staff: true },
    });
    const tokens = this.generateTokens(user.id, user.role, undefined, user.email || undefined);
    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.staff?.branchId || null },
      demo: true,
    };
  }

  private async ensureDevelopmentBranch() {
    const code = this.requiredDevelopmentValue('DEV_DEMO_BRANCH_CODE');
    const name = this.configService.get<string>('DEV_DEMO_BRANCH_NAME')?.trim() || 'Local Demo Branch';
    return this.prisma.branch.upsert({
      where: { code },
      update: { name, isActive: true },
      create: { code, name, isActive: true, openingTime: '00:00', closingTime: '23:59', lastOrderTime: '23:59' },
    });
  }

  private assertDevelopmentDemoEnabled() {
    if (this.configService.get<string>('NODE_ENV') !== 'development' || this.configService.get<string>('DEV_DEMO_ENABLED') !== 'true') {
      // Do not advertise a development authentication surface outside its explicit local opt-in.
      throw new NotFoundException('Not found');
    }
  }

  private requiredDevelopmentValue(name: string): string {
    const value = this.configService.get<string>(name)?.trim();
    if (!value) throw new BadRequestException(`${name} must be configured before using the local demo`);
    return value;
  }

  private generateTokens(userId: string, role: string, lineUserId?: string, email?: string) {
    const payload = { sub: userId, role, lineUserId, email };

    const secret = this.requiredSecret('JWT_SECRET');
    const refreshSecret = this.requiredSecret('JWT_REFRESH_SECRET');

    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '30d',
    });

    return { accessToken, refreshToken };
  }

  private requiredSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
    const secret = this.configService.get<string>(name)?.trim();
    if (!secret) throw new UnauthorizedException(`${name} is not configured`);
    return secret;
  }
}
