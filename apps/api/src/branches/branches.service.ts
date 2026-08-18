import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

  async getAllBranches() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      include: {
        openingHours: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getBranchById(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        openingHours: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
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
