import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionType } from '@food-ordering/types';

export interface ValidateCouponDto {
  code: string;
  subtotal: number;
  branchId?: string;
}

export interface CreatePromotionDto {
  branchId?: string;
  name: string;
  description?: string;
  type: PromotionType;
  discountValue: number;
  minSpend?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface CreateCouponDto {
  promotionId: string;
  code: string;
  maxUsage?: number;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate a coupon code and calculate the exact discount amount
   */
  async validateCoupon(dto: ValidateCouponDto) {
    const code = dto.code?.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Coupon code is required');
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        promotion: {
          include: { branch: { select: { id: true, name: true } } },
        },
      },
    });

    if (!coupon || !coupon.isActive) {
      throw new NotFoundException('รหัสคูปองไม่ถูกต้อง หรือถูกปิดการใช้งานแล้ว');
    }

    const promo = coupon.promotion;
    if (!promo || !promo.isActive) {
      throw new BadRequestException('โปรโมชั่นนี้หมดอายุหรือไม่สามารถใช้งานได้');
    }

    const now = new Date();
    if (new Date(promo.startDate) > now || new Date(promo.endDate) < now) {
      throw new BadRequestException('คูปองนี้หมดอายุการใช้งานแล้ว');
    }

    if (coupon.usedCount >= coupon.maxUsage) {
      throw new BadRequestException('คูปองนี้ถูกใช้งานครบจำนวนสิทธิ์แล้ว');
    }

    if (promo.branchId && dto.branchId && promo.branchId !== dto.branchId) {
      throw new BadRequestException(
        `คูปองนี้สามารถใช้ได้เฉพาะสาขา ${promo.branch?.name || promo.branchId} เท่านั้น`,
      );
    }

    const minSpend = Number(promo.minSpend || 0);
    if (dto.subtotal < minSpend) {
      throw new BadRequestException(
        `ยอดสั่งซื้อขั้นต่ำสำหรับคูปองนี้คือ ฿${minSpend.toLocaleString()} (ยอดปัจจุบัน ฿${dto.subtotal.toLocaleString()})`,
      );
    }

    // Calculate discount
    let discount = 0;
    const discountVal = Number(promo.discountValue);

    if (promo.type === 'PERCENTAGE_DISCOUNT') {
      discount = Math.round((dto.subtotal * discountVal) / 100);
    } else if (promo.type === 'FIXED_DISCOUNT') {
      discount = Math.min(discountVal, dto.subtotal);
    } else if (promo.type === 'FREE_DELIVERY') {
      discount = 0; // Handled separately on delivery fee
    }

    return {
      isValid: true,
      couponId: coupon.id,
      code: coupon.code,
      promotionName: promo.name,
      type: promo.type,
      discount,
      minSpend,
      message: `ใช้คูปองสำเร็จ! ลดทันที ฿${discount.toLocaleString()}`,
    };
  }

  // ----------------------------------------------------
  // Admin Promotions CRUD (Blueprint §32, §45)
  // ----------------------------------------------------

  async getAdminPromotions(branchId?: string) {
    return this.prisma.promotion.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        coupons: {
          select: {
            id: true,
            code: true,
            maxUsage: true,
            usedCount: true,
            isActive: true,
          },
        },
      },
    });
  }

  async createPromotion(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        branchId: dto.branchId || null,
        name: dto.name,
        description: dto.description,
        type: dto.type as any,
        discountValue: dto.discountValue,
        minSpend: dto.minSpend || 0,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: { branch: true },
    });
  }

  async createCoupon(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`รหัสคูปอง "${code}" มีอยู่ในระบบแล้ว`);
    }

    return this.prisma.coupon.create({
      data: {
        promotionId: dto.promotionId,
        code,
        maxUsage: dto.maxUsage || 100,
        isActive: true,
      },
      include: { promotion: true },
    });
  }

  async toggleCouponStatus(id: string, isActive: boolean) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.delete({ where: { id } });
  }
}
