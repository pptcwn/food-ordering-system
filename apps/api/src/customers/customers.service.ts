import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpdateProfileDto {
  name: string;
  phone: string;
}

export interface SaveLocationDto {
  label?: string;
  recipientName?: string;
  phone?: string;
  addressLine: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  note?: string;
  isDefault?: boolean;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        lineUser: true,
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Customer profile not found');
    }

    const hasPhone = !!user.phone && user.phone.length >= 9;
    const hasAddress = user.addresses.length > 0;
    const isProfileComplete = hasPhone && hasAddress;

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      lineUser: user.lineUser,
      addresses: user.addresses,
      isProfileComplete,
      hasPhone,
      hasAddress,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Validate Thai phone number format
    const phoneClean = dto.phone.replace(/[^0-9]/g, '');
    if (!/^0[0-9]{8,9}$/.test(phoneClean)) {
      throw new BadRequestException('Invalid Thai phone number (e.g. 0812345678 or 021234567)');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name.trim(),
        phone: phoneClean,
      },
      include: {
        lineUser: true,
        addresses: true,
      },
    });

    return updatedUser;
  }

  async saveLocation(userId: string, dto: SaveLocationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Customer not found');
    }

    // If setting as default or if this is the first address, reset other defaults
    const addressCount = await this.prisma.address.count({ where: { userId } });
    const isFirstAddress = addressCount === 0;
    const makeDefault = dto.isDefault || isFirstAddress;

    if (makeDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        userId,
        label: dto.label || 'Home',
        recipientName: dto.recipientName || user.name,
        phone: dto.phone || user.phone || '',
        addressLine: dto.addressLine,
        subdistrict: dto.subdistrict,
        district: dto.district,
        province: dto.province,
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        note: dto.note,
        isDefault: makeDefault,
      },
    });

    return address;
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    const updated = await this.prisma.address.update({
      where: { id: addressId, userId },
      data: { isDefault: true },
    });

    return updated;
  }

  /**
   * Admin: list all customers with LINE info and order counts (blueprint §57 /admin/customers)
   */
  async getAdminCustomers(search?: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lineUser: { select: { lineUserId: true, displayName: true, pictureUrl: true } },
        _count: { select: { orders: true, addresses: true } },
      },
      take: 200,
    });
  }
}
