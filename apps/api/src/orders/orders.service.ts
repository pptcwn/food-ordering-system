import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import {
  OrderType,
  OrderStatus,
  PaymentStatus,
  QUEUE_NAMES,
} from '@food-ordering/types';
import { APP_CONFIG } from '@food-ordering/config';

export interface CreateOrderDto {
  branchId: string;
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  addressId?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  note?: string;
  sessionId?: string;
  couponCode?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  reason?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    @InjectQueue(QUEUE_NAMES.ORDER_EVENTS) private orderEventsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ORDER_EXPIRATION) private orderExpirationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private notificationsQueue: Queue,
  ) {}

  /**
   * Calculate distance in kilometers using Haversine formula
   */
  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Create new Order from customer Cart with full business validation and DB transaction
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    // 1. Validate Customer Information
    const customerName = dto.customerName?.trim();
    if (!customerName) {
      throw new BadRequestException('Customer name is required');
    }

    const customerPhone = dto.customerPhone?.replace(/[^0-9]/g, '');
    if (!customerPhone || !/^0[0-9]{8,9}$/.test(customerPhone)) {
      throw new BadRequestException('Valid Thai phone number is required (e.g. 0812345678)');
    }

    if (dto.orderType === OrderType.DELIVERY && !dto.deliveryAddress && !dto.addressId) {
      throw new BadRequestException('Delivery address or pinned location is required for Delivery orders');
    }

    // 2. Fetch Customer Cart with all Items
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        branch: true,
        items: {
          include: {
            product: true,
            variant: true,
            modifiers: {
              include: { modifier: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Cart not found');
    }

    // 3. Re-validate Branch & Operating Hours
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { openingHours: true },
    });

    if (!branch || !branch.isActive) {
      throw new BadRequestException('The selected branch is currently closed or inactive');
    }

    // 4. Strict Re-validation of Product Availability (Sold-Out Gate)
    const unavailableItems = cart.items.filter(
      (item) => !item.product.isActive || !item.product.isAvailable,
    );

    if (unavailableItems.length > 0) {
      throw new BadRequestException({
        code: 'PRODUCT_SOLD_OUT',
        message: 'มีสินค้าบางรายการในตะกร้าหมดแล้ว กรุณาตรวจสอบตะกร้าของคุณ',
        products: unavailableItems.map((i) => ({
          id: i.productId,
          name: i.product.name,
        })),
      });
    }

    // 5. Calculate Subtotal
    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of cart.items) {
      const unitPrice = item.variant
        ? Number(item.variant.price)
        : Number(item.product.basePrice);

      let modifiersTotal = 0;
      const modifierRecords: any[] = [];

      for (const m of item.modifiers) {
        const modPrice = Number(m.modifier.price);
        modifiersTotal += modPrice;
        modifierRecords.push({
          modifierId: m.modifier.id,
          modifierName: m.modifier.name,
          price: modPrice,
        });
      }

      const itemLineTotal = (unitPrice + modifiersTotal) * item.quantity;
      subtotal += itemLineTotal;

      orderItemsData.push({
        productId: item.productId,
        productVariantId: item.productVariantId,
        productName: item.product.name,
        variantName: item.variant?.name || null,
        unitPrice,
        quantity: item.quantity,
        subtotal: itemLineTotal,
        specialNote: item.specialNote,
        modifiers: {
          create: modifierRecords,
        },
      });
    }

    // 6. Calculate Distance-Based Delivery Fee
    let deliveryFee = 0;
    if (dto.orderType === OrderType.DELIVERY) {
      if (dto.deliveryLatitude && dto.deliveryLongitude) {
        const branchLat = branch.latitude ? Number(branch.latitude) : 13.7563;
        const branchLon = branch.longitude ? Number(branch.longitude) : 100.5018;
        const distanceKm = this.calculateDistanceKm(
          branchLat,
          branchLon,
          dto.deliveryLatitude,
          dto.deliveryLongitude,
        );

        const baseFee = 20;
        const ratePerKm = 8;
        const baseDistance = 3;

        deliveryFee = baseFee;
        if (distanceKm > baseDistance) {
          deliveryFee += Math.ceil(distanceKm - baseDistance) * ratePerKm;
        }
      } else {
        deliveryFee = 30; // Standard flat delivery fee fallback
      }
    }

    // 7. Validate and Apply Coupon (if provided)
    let discount = 0;
    let couponId: string | undefined = undefined;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.trim().toUpperCase() },
        include: { promotion: true },
      });

      if (coupon && coupon.isActive && coupon.promotion?.isActive) {
        const promo = coupon.promotion;
        const now = new Date();
        const isValidDate = new Date(promo.startDate) <= now && new Date(promo.endDate) >= now;
        const hasRemainingUsage = coupon.usedCount < coupon.maxUsage;
        const meetsMinSpend = subtotal >= Number(promo.minSpend || 0);

        if (isValidDate && hasRemainingUsage && meetsMinSpend) {
          couponId = coupon.id;
          const discountVal = Number(promo.discountValue);
          if (promo.type === 'PERCENTAGE_DISCOUNT') {
            discount = Math.round((subtotal * discountVal) / 100);
          } else if (promo.type === 'FIXED_DISCOUNT') {
            discount = Math.min(discountVal, subtotal);
          } else if (promo.type === 'FREE_DELIVERY') {
            discount = deliveryFee;
          }
        }
      }
    }

    const total = Math.max(0, subtotal + deliveryFee - discount);


    // 6. Generate Unique Order Number: XC{YYMMDD}-{4 digit sequence}
    const orderNo = await this.generateOrderNumber();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // 7. Atomic DB Transaction: Create Order, Items, Payment, Log & Clear Cart
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNo,
          userId,
          branchId: dto.branchId,
          orderType: dto.orderType,
          subtotal,
          discount,
          deliveryFee,
          total,
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING_PAYMENT,
          customerName,
          customerPhone,
          addressId: dto.addressId,
          deliveryAddress: dto.deliveryAddress,
          deliveryLatitude: dto.deliveryLatitude,
          deliveryLongitude: dto.deliveryLongitude,
          note: dto.note,
          expiresAt,
          items: {
            create: orderItemsData,
          },
          payment: {
            create: {
              amount: total,
              provider: 'PROMPTPAY',
              currency: 'THB',
              status: PaymentStatus.PENDING,
            },
          },
          statusLogs: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PENDING_PAYMENT,
              changedBy: userId || 'CUSTOMER',
              reason: 'Order created by customer',
            },
          },
        },
        include: {
          items: {
            include: { modifiers: true },
          },
          payment: true,
          branch: true,
        },
      });

      // Clear Cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Increment coupon usage count
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return createdOrder;
    });

    this.logger.log(`🛒 Order created: ${order.orderNo} | Total: ฿${order.total}`);

    // 8. Queue Background Events
    try {
      // Order Created Event
      await this.orderEventsQueue.add('ORDER_CREATED', {
        orderId: order.id,
        orderNo: order.orderNo,
        branchId: order.branchId,
        total: Number(order.total),
      });

      // Telegram Admin Alert
      await this.notificationsQueue.add('TELEGRAM_ORDER_CREATED', {
        orderId: order.id,
        orderNo: order.orderNo,
        branchId: order.branchId,
        branchName: order.branch.name,
        customerName: order.customerName,
        orderType: order.orderType,
        total: Number(order.total),
        items: order.items.map((i) => ({
          name: i.productName,
          variant: i.variantName,
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
        })),
      });

      // Auto-Expiration Job (15 minutes)
      await this.orderExpirationQueue.add(
        'CHECK_ORDER_EXPIRATION',
        { orderId: order.id },
        { delay: 15 * 60 * 1000 },
      );
    } catch (err) {
      this.logger.warn(`Could not enqueue order background jobs: ${err}`);
    }

    // 9. Realtime WebSocket Broadcast
    this.eventsGateway.emitOrderStatusChanged({
      orderId: order.id,
      orderNo: order.orderNo,
      branchId: order.branchId,
      status: order.orderStatus as OrderStatus,
      paymentStatus: order.paymentStatus as PaymentStatus,
    });

    return order;
  }

  /**
   * Get Order by ID with full relations
   */
  async getOrderById(id: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            modifiers: true,
            product: true,
          },
        },
        payment: {
          include: { slips: true },
        },
        branch: true,
        delivery: {
          include: { deliveryStaff: true },
        },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Lightweight status check for customer tracking screen
   */
  async getOrderStatus(id: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      select: {
        id: true,
        orderNo: true,
        orderStatus: true,
        paymentStatus: true,
        orderType: true,
        expiresAt: true,
        paidAt: true,
        preparingAt: true,
        readyAt: true,
        outForDeliveryAt: true,
        deliveredAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * List Customer Orders
   */
  async getCustomerOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payment: true,
        branch: true,
      },
    });
  }

  /**
   * List Admin Orders with Filters
   */
  async getAdminOrders(branchId?: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { orderStatus: status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { modifiers: true },
        },
        payment: true,
        branch: true,
        delivery: {
          include: { deliveryStaff: true },
        },
      },
    });
  }

  async getOrderForStaff(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Admin / Kitchen Manual Status Update (PREPARING, READY, CANCELLED, etc.)
   */
  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto, changedBy = 'ADMIN') {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const previousStatus = order.orderStatus;
    const timestamps: any = {};

    if (dto.status === OrderStatus.PREPARING) timestamps.preparingAt = new Date();
    if (dto.status === OrderStatus.READY) timestamps.readyAt = new Date();
    if (dto.status === OrderStatus.OUT_FOR_DELIVERY) timestamps.outForDeliveryAt = new Date();
    if (dto.status === OrderStatus.DELIVERED) timestamps.deliveredAt = new Date();
    if (dto.status === OrderStatus.COMPLETED) timestamps.completedAt = new Date();

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: {
          orderStatus: dto.status,
          ...timestamps,
        },
        include: { branch: true },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          fromStatus: previousStatus,
          toStatus: dto.status,
          changedBy,
          reason: dto.reason || `Status updated to ${dto.status}`,
        },
      });

      return o;
    });

    // Realtime Broadcast
    this.eventsGateway.emitOrderStatusChanged({
      orderId: updatedOrder.id,
      orderNo: updatedOrder.orderNo,
      branchId: updatedOrder.branchId,
      status: updatedOrder.orderStatus as OrderStatus,
      paymentStatus: updatedOrder.paymentStatus as PaymentStatus,
    });

    // Enqueue LINE Customer & Telegram Admin Notifications
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
      this.logger.warn(`Could not enqueue notification: ${err}`);
    }

    return updatedOrder;
  }

  /**
   * Helper: Generate unique formatted order number (e.g. XC260818-0042)
   */
  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = `XC${yy}${mm}${dd}`;

    const countToday = await this.prisma.order.count({
      where: {
        orderNo: { startsWith: datePrefix },
      },
    });

    const sequence = String(countToday + 1).padStart(4, '0');
    return `${datePrefix}-${sequence}`;
  }
}
