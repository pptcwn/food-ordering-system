import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBranchSettingsDtoType, UpdateBranchStorefrontDtoType } from '@food-ordering/validation';
import { requireBranchAccess } from '../common/authz/branch-access';

export interface BranchDistance {
  id: string;
  name: string;
  code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
  isOpen: boolean;
  openingTime: string | null;
  closingTime: string | null;
  telegramEnabled: boolean;
}

@Injectable()
export class BranchesService {
  private readonly legacyMinioUrl = 'http://34.126.172.168:9000';
  private readonly publicMinioUrl = process.env.MINIO_PUBLIC_PRODUCTS_URL || this.legacyMinioUrl;

  constructor(private prisma: PrismaService) {}

  async getAllBranches() {
    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        address: true,
        latitude: true,
        longitude: true,
        freeDeliveryDistanceKm: true,
        deliveryFeePerKm: true,
        openingTime: true,
        closingTime: true,
        lastOrderTime: true,
        storefrontCoverUrl: true,
        storefrontProfileUrl: true,
        storefrontHeadline: true,
        storefrontSubheadline: true,
        storefrontThemeColor: true,
        paymentReceiverType: true,
        paymentReceiverValue: true,
        paymentReceiverName: true,
        paymentReceiverBank: true,
        openingHours: true,
      },
      orderBy: { name: 'asc' },
    });
    return branches.map((branch) => this.withPublicStorefrontUrls(branch));
  }

  async getBranchById(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        address: true,
        latitude: true,
        longitude: true,
        freeDeliveryDistanceKm: true,
        deliveryFeePerKm: true,
        openingTime: true,
        closingTime: true,
        lastOrderTime: true,
        storefrontCoverUrl: true,
        storefrontProfileUrl: true,
        storefrontHeadline: true,
        storefrontSubheadline: true,
        storefrontThemeColor: true,
        paymentReceiverType: true,
        paymentReceiverValue: true,
        paymentReceiverName: true,
        paymentReceiverBank: true,
        openingHours: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return this.withPublicStorefrontUrls(branch);
  }

  private withPublicStorefrontUrls<T extends { storefrontCoverUrl: string | null; storefrontProfileUrl: string | null }>(branch: T): T {
    return {
      ...branch,
      storefrontCoverUrl: branch.storefrontCoverUrl?.replace(this.legacyMinioUrl, this.publicMinioUrl) ?? null,
      storefrontProfileUrl: branch.storefrontProfileUrl?.replace(this.legacyMinioUrl, this.publicMinioUrl) ?? null,
    };
  }

  async updateStorefront(id: string, dto: UpdateBranchStorefrontDtoType, user: any) {
    requireBranchAccess(user, id);
    await this.getBranchById(id);

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async updateSettings(id: string, dto: UpdateBranchSettingsDtoType, user: any) {
    requireBranchAccess(user, id);
    await this.getBranchById(id);

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async removeBranch(id: string, user: any) {
    requireBranchAccess(user, id);
    const branch = await this.getBranchById(id);

    if (!branch.isActive) {
      throw new NotFoundException('Branch not found');
    }

    const activeBranchCount = await this.prisma.branch.count({ where: { isActive: true } });
    if (activeBranchCount <= 1) {
      throw new ConflictException('At least one active branch is required');
    }

    // Keep orders, payments, and audit history intact while removing the branch from use.
    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Find nearest branch based on customer's pinned coordinates using Haversine formula
   */
  async findNearestBranch(latitude: number, longitude: number): Promise<BranchDistance | null> {
    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
      include: { openingHours: true },
    });

    if (branches.length === 0) {
      return null;
    }

    const currentDay = new Date().getDay(); // 0-6
    const currentTime = new Date().toTimeString().slice(0, 5); // "HH:MM"

    const branchesWithDistances: BranchDistance[] = branches
      .filter((b) => b.latitude !== null && b.longitude !== null)
      .map((b) => {
        const branchLat = Number(b.latitude);
        const branchLng = Number(b.longitude);
        const distanceKm = this.calculateHaversineDistance(latitude, longitude, branchLat, branchLng);

        // Check if currently open
        const todayHour = b.openingHours.find((h) => h.dayOfWeek === currentDay);
        let isOpen = true;
        if (todayHour) {
          isOpen = !todayHour.isClosed && currentTime >= todayHour.openTime && currentTime <= todayHour.closeTime;
        }

        return {
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address,
          latitude: branchLat,
          longitude: branchLng,
          distanceKm: Math.round(distanceKm * 100) / 100,
          isOpen,
          openingTime: b.openingTime,
          closingTime: b.closingTime,
          telegramEnabled: b.telegramEnabled,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return branchesWithDistances[0] || null;
  }

  /**
   * Haversine formula to compute great-circle distance between two points in km
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
