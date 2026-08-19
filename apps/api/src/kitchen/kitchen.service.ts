import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrderStatus, PaymentStatus, QUEUE_NAMES } from '@food-ordering/types';

// Valid transitions Kitchen staff are allowed to perform
const KITCHEN_ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PAID]:        [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]:   [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]:   [OrderStatus.READY],
};

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private notificationsQueue: Queue,
  ) {}

  /**
   * Get all active kitchen orders for a branch (CONFIRMED, PREPARING, READY)
   * Sorted by createdAt ASC — oldest first, so kitchen works FIFO
   */
  async getKitchenOrders(branchId?: string) {
    return this.prisma.order.findMany({
      where: {
        orderStatus: {
          in: [OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY],
        },
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            modifiers: {
              include: { modifier: { select: { id: true, name: true } } },
            },
          },
        },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Get a single order detail for kitchen display
   */
  async getKitchenOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            modifiers: { include: { modifier: true } },
          },
        },
        branch: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /**
   * Kitchen status transition: PAID → CONFIRMED → PREPARING → READY
   * Enforces allowed transitions to prevent invalid state changes
   */
  async updateKitchenStatus(
    id: string,
    targetStatus: OrderStatus,
    staffName = 'KITCHEN',
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const currentStatus = order.orderStatus as OrderStatus;
    const allowed = KITCHEN_ALLOWED_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${targetStatus}. ` +
        `Allowed transitions: ${allowed.join(', ') || 'none'}`,
      );
    }

    const timestamps: Partial<Record<string, Date>> = {};
    if (targetStatus === OrderStatus.CONFIRMED) timestamps.confirmedAt = new Date();
    if (targetStatus === OrderStatus.PREPARING) timestamps.preparingAt = new Date();
    if (targetStatus === OrderStatus.READY) timestamps.readyAt = new Date();

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: { orderStatus: targetStatus, ...timestamps },
        include: { branch: true },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          changedBy: staffName,
          reason: `Kitchen updated to ${targetStatus}`,
        },
      });

      return o;
    });

    // Emit realtime update to kitchen + branch rooms
    this.eventsGateway.emitOrderStatusChanged({
      orderId: updatedOrder.id,
      orderNo: updatedOrder.orderNo,
      branchId: updatedOrder.branchId,
      status: updatedOrder.orderStatus as OrderStatus,
      paymentStatus: updatedOrder.paymentStatus as PaymentStatus,
    });

    // Notify customer via LINE when order is READY
    if (targetStatus === OrderStatus.READY) {
      try {
        await this.notificationsQueue.add('NOTIFY_STATUS_CHANGE', {
          orderId: updatedOrder.id,
          orderNo: updatedOrder.orderNo,
          status: updatedOrder.orderStatus,
          branchId: updatedOrder.branchId,
          customerName: updatedOrder.customerName,
          lineUserId: updatedOrder.lineUserId,
        });
      } catch (err) {
        this.logger.warn(`Could not enqueue READY notification: ${err}`);
      }
    }

    this.logger.log(`🍳 Kitchen order ${updatedOrder.orderNo}: ${currentStatus} → ${targetStatus}`);
    return updatedOrder;
  }

  /**
   * Toggle product availability (Sold Out / Available) — Kitchen can do this directly
   * Invalidates Redis menu cache and emits WebSocket event
   */
  async toggleProductAvailability(productId: string, isAvailable: boolean) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { isAvailable },
    });

    // Emit realtime product.availability.changed to LIFF menus
    this.eventsGateway.emitProductAvailabilityChanged({
      productId: updated.id,
      branchId: updated.branchId ?? '',
      isAvailable: updated.isAvailable,
    });

    this.logger.log(
      `🔄 Product ${updated.name} availability → ${isAvailable ? 'AVAILABLE' : 'SOLD OUT'}`,
    );
    return { id: updated.id, name: updated.name, isAvailable: updated.isAvailable };
  }
}
