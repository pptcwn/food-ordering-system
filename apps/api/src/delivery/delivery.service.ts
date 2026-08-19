import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { EventsGateway } from '../websocket/events.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DeliveryStatus, OrderStatus, PaymentStatus, QUEUE_NAMES } from '@food-ordering/types';
import { BUCKET_NAMES, APP_CONFIG } from '@food-ordering/config';
import { v4 as uuidv4 } from 'uuid';

export interface CalculateFeeDto {
  branchId: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
    private eventsGateway: EventsGateway,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private notificationsQueue: Queue,
  ) {}

  // ------------------------------------------------------------------
  // Distance & Delivery Fee Calculation (Blueprint §71)
  // ------------------------------------------------------------------

  /**
   * Calculate distance in kilometers using Haversine formula
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Rounded to 1 decimal place
  }

  /**
   * Compute delivery fee based on branch location and customer coordinates
   */
  async calculateDeliveryFee(dto: CalculateFeeDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      select: { id: true, name: true, latitude: true, longitude: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Fallback coordinates if branch coordinates not set (Bangkok center fallback)
    const branchLat = branch.latitude ? Number(branch.latitude) : 13.7563;
    const branchLon = branch.longitude ? Number(branch.longitude) : 100.5018;

    const distanceKm = this.calculateDistanceKm(
      branchLat,
      branchLon,
      dto.latitude,
      dto.longitude,
    );

    // Delivery Fee Tier:
    // 0 - 3 km: Base fee ฿20
    // > 3 km: ฿20 + ฿8/km
    const baseFee = 20;
    const ratePerKm = 8;
    const baseDistance = 3;

    let fee = baseFee;
    if (distanceKm > baseDistance) {
      const extraKm = Math.ceil(distanceKm - baseDistance);
      fee += extraKm * ratePerKm;
    }

    const maxDeliveryRadiusKm = 20;
    const isDeliverable = distanceKm <= maxDeliveryRadiusKm;

    return {
      branchId: branch.id,
      branchName: branch.name,
      distanceKm,
      fee: isDeliverable ? fee : null,
      isDeliverable,
      message: isDeliverable
        ? `ระยะทาง ${distanceKm} กม. — ค่าจัดส่ง ฿${fee}`
        : `อยู่นอกพื้นที่จัดส่ง (เกิน ${maxDeliveryRadiusKm} กม.)`,
    };
  }

  // ------------------------------------------------------------------
  // Delivery Staff CRUD
  // ------------------------------------------------------------------

  async getDeliveryStaff(branchId?: string) {
    return this.prisma.deliveryStaff.findMany({
      where: {
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  // ------------------------------------------------------------------
  // Delivery Job Queries (Blueprint §25)
  // ------------------------------------------------------------------

  async getDeliveries(branchId?: string, status?: DeliveryStatus) {
    return this.prisma.delivery.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(branchId ? { order: { branchId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            items: { include: { product: { select: { id: true, name: true } } } },
            branch: { select: { id: true, name: true } },
          },
        },
        deliveryStaff: true,
      },
    });
  }

  async getDelivery(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: { include: { branch: true, items: { include: { product: true } } } },
        deliveryStaff: true,
      },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  async getOrderForDelivery(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getDeliveryStaffById(id: string) {
    const staff = await this.prisma.deliveryStaff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Delivery staff not found');
    return staff;
  }

  async getPendingJobsForRider(staffId: string) {
    const staff = await this.prisma.deliveryStaff.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Delivery staff not found');

    return this.prisma.delivery.findMany({
      where: {
        status: { in: [DeliveryStatus.UNASSIGNED, DeliveryStatus.ASSIGNED] },
        order: { branchId: staff.branchId },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        order: {
          include: { items: { include: { product: { select: { id: true, name: true } } } } },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // Assignment & Lifecycle (Blueprint §24, §26, §29)
  // ------------------------------------------------------------------

  async assignDelivery(orderId: string, deliveryStaffId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.orderStatus !== OrderStatus.READY) {
      throw new BadRequestException('Order must be READY before assigning delivery');
    }
    if (order.delivery) {
      throw new ConflictException('A delivery is already assigned to this order');
    }

    const staff = await this.prisma.deliveryStaff.findUnique({ where: { id: deliveryStaffId } });
    if (!staff || !staff.isActive) throw new NotFoundException('Delivery staff not found or inactive');

    const delivery = await this.prisma.$transaction(async (tx) => {
      const d = await tx.delivery.create({
        data: {
          orderId: order.id,
          deliveryStaffId,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: new Date(),
        },
        include: { deliveryStaff: true },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.OUT_FOR_DELIVERY },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.READY,
          toStatus: OrderStatus.OUT_FOR_DELIVERY,
          changedBy: 'SYSTEM',
          reason: `Assigned to ${staff.name}`,
        },
      });

      return d;
    });

    // Realtime event
    this.eventsGateway.emitOrderStatusChanged({
      orderId: order.id,
      orderNo: order.orderNo,
      branchId: order.branchId,
      status: OrderStatus.OUT_FOR_DELIVERY,
      paymentStatus: order.paymentStatus as PaymentStatus,
    });

    this.logger.log(`🚚 Delivery assigned: Order ${order.orderNo} → ${staff.name}`);
    return delivery;
  }

  async markPickedUp(deliveryId: string) {
    return this._transitionDelivery(deliveryId, DeliveryStatus.PICKED_UP, { pickedUpAt: new Date() });
  }

  async markOutForDelivery(deliveryId: string) {
    return this._transitionDelivery(deliveryId, DeliveryStatus.OUT_FOR_DELIVERY, {
      outForDeliveryAt: new Date(),
    });
  }

  /**
   * Blueprint §26 & §29 — Mark delivered with optional Proof of Delivery Photo
   */
  async markDelivered(
    deliveryId: string,
    proofFile?: { mimetype: string; size: number; buffer: Buffer },
    note?: string,
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: { include: { branch: true } } },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');

    let proofObjectKey: string | undefined = undefined;

    // Upload Proof Photo to MinIO if provided
    if (proofFile && proofFile.buffer) {
      try {
        const ext = proofFile.mimetype.split('/')[1] || 'jpg';
        const now = new Date();
        proofObjectKey = `delivery-proofs/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${uuidv4()}.${ext}`;

        await this.minioService.uploadFile(
          BUCKET_NAMES.DELIVERY,
          proofObjectKey,
          proofFile.buffer,
          proofFile.mimetype,
        );
        this.logger.log(`📸 Stored delivery proof photo: ${proofObjectKey}`);
      } catch (err) {
        this.logger.warn(`Could not upload delivery proof photo: ${err}`);
      }
    }

    const updatedDelivery = await this.prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
          note: proofObjectKey ? `[PROOF:${proofObjectKey}] ${note || ''}` : note || delivery.note,
        },
        include: { deliveryStaff: true, order: { include: { branch: true } } },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          orderStatus: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: delivery.orderId,
          fromStatus: OrderStatus.OUT_FOR_DELIVERY,
          toStatus: OrderStatus.DELIVERED,
          changedBy: d.deliveryStaff?.name ?? 'DELIVERY',
          reason: 'Order delivered to customer with confirmation',
        },
      });

      return d;
    });

    // Realtime WS
    this.eventsGateway.emitOrderStatusChanged({
      orderId: delivery.orderId,
      orderNo: delivery.order.orderNo,
      branchId: delivery.order.branchId,
      status: OrderStatus.DELIVERED,
      paymentStatus: delivery.order.paymentStatus as PaymentStatus,
    });

    // Notify LINE customer + Telegram admin
    try {
      await this.notificationsQueue.add('NOTIFY_STATUS_CHANGE', {
        orderId: delivery.orderId,
        orderNo: delivery.order.orderNo,
        status: OrderStatus.DELIVERED,
        branchId: delivery.order.branchId,
        customerName: delivery.order.customerName,
        lineUserId: delivery.order.lineUserId,
        deliveryStaffName: updatedDelivery.deliveryStaff?.name,
      });
    } catch (err) {
      this.logger.warn(`Could not enqueue DELIVERED notification: ${err}`);
    }

    this.logger.log(`✅ Delivered: Order ${delivery.order.orderNo}`);
    return updatedDelivery;
  }

  async markFailed(deliveryId: string, note?: string) {
    return this._transitionDelivery(deliveryId, DeliveryStatus.FAILED, { note });
  }

  private async _transitionDelivery(
    deliveryId: string,
    status: DeliveryStatus,
    extra: Record<string, any> = {},
  ) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Delivery not found');

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status, ...extra },
      include: { deliveryStaff: true },
    });
  }
}
