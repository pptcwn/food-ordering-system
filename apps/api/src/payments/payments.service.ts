import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { EventsGateway } from '../websocket/events.gateway';
import {
  OrderStatus,
  PaymentStatus,
  QUEUE_NAMES,
} from '@food-ordering/types';
import { BUCKET_NAMES, APP_CONFIG } from '@food-ordering/config';

export interface UploadedFileDto {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
    private eventsGateway: EventsGateway,
    @InjectQueue(QUEUE_NAMES.PAYMENT_EVENTS) private paymentEventsQueue: Queue,
  ) {}

  /**
   * Upload and process Payment Slip from customer
   */
  async uploadSlip(
    orderId: string,
    file: UploadedFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('Payment slip image file is required');
    }

    // 1. Check MIME type and File Size
    const allowedMimeTypes = APP_CONFIG.ALLOWED_IMAGE_MIME_TYPES as readonly string[];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, and WebP images are supported');
    }

    if (file.size > APP_CONFIG.MAX_SLIP_SIZE_BYTES) {
      throw new BadRequestException('File size must not exceed 5 MB');
    }

    // 2. Fetch Order and Payment
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        branch: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderStatus === OrderStatus.PAID || order.paymentStatus === PaymentStatus.VERIFIED) {
      throw new BadRequestException('This order has already been paid and verified');
    }

    if (order.orderStatus === OrderStatus.EXPIRED || order.orderStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Cannot upload slip for ${order.orderStatus} order`);
    }

    // 3. Upload File to MinIO Private Bucket (food-slips)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const extension = file.originalname.split('.').pop() || 'jpg';
    const objectKey = `payment-slips/${year}/${month}/${day}/${uuidv4()}.${extension}`;

    await this.minioService.uploadFile(
      BUCKET_NAMES.SLIPS,
      objectKey,
      file.buffer,
      file.mimetype,
    );

    this.logger.log(` Slip uploaded to MinIO: ${BUCKET_NAMES.SLIPS}/${objectKey}`);

    // 4. Update Database in Transaction
    let payment = order.payment;
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.total,
          provider: 'PROMPTPAY',
          currency: 'THB',
          status: PaymentStatus.VERIFYING,
        },
      });
    }

    const updatedData = await this.prisma.$transaction(async (tx) => {
      // Create PaymentSlip record
      const slip = await tx.paymentSlip.create({
        data: {
          paymentId: payment!.id,
          bucket: BUCKET_NAMES.SLIPS,
          objectKey,
          mimeType: file.mimetype,
          size: file.size,
        },
      });

      // Update Payment status to VERIFYING
      const p = await tx.payment.update({
        where: { id: payment!.id },
        data: {
          status: PaymentStatus.VERIFYING,
        },
      });

      // Update Order status to PAYMENT_VERIFYING
      const o = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.VERIFYING,
          orderStatus: OrderStatus.PAYMENT_VERIFYING,
        },
      });

      // Log status
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: order.orderStatus,
          toStatus: OrderStatus.PAYMENT_VERIFYING,
          changedBy: 'CUSTOMER',
          reason: 'Customer uploaded payment slip',
        },
      });

      return { slip, payment: p, order: o };
    });

    // 5. Realtime WebSocket Broadcast
    this.eventsGateway.emitOrderStatusChanged({
      orderId: order.id,
      orderNo: order.orderNo,
      branchId: order.branchId,
      status: OrderStatus.PAYMENT_VERIFYING,
      paymentStatus: PaymentStatus.VERIFYING,
    });

    // 6. Enqueue BullMQ Job for Background Slip2Go OCR Verification
    try {
      await this.paymentEventsQueue.add(
        'VERIFY_SLIP',
        {
          orderId: order.id,
          paymentId: payment.id,
          slipId: updatedData.slip.id,
          bucket: BUCKET_NAMES.SLIPS,
          objectKey,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
      this.logger.log(` Enqueued VERIFY_SLIP job for order: ${order.orderNo}`);
    } catch (err) {
      this.logger.error(`Failed to enqueue VERIFY_SLIP job: ${err}`);
    }

    return {
      success: true,
      message: 'อัปโหลดสลิปเรียบร้อยแล้ว ระบบกำลังตรวจสอบความถูกต้องของการชำระเงิน',
      paymentId: payment.id,
      orderStatus: OrderStatus.PAYMENT_VERIFYING,
    };
  }

  /**
   * Get payment details with private presigned URL for slip image
   */
  async getPaymentDetails(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        slips: {
          orderBy: { uploadedAt: 'desc' },
        },
        order: {
          include: { branch: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Generate presigned URLs for private slips
    const slipsWithPresignedUrls = await Promise.all(
      payment.slips.map(async (s) => {
        let presignedUrl = '';
        try {
          presignedUrl = await this.minioService.getPresignedUrl(
            s.bucket,
            s.objectKey,
            APP_CONFIG.PRESIGNED_URL_EXPIRATION_SECONDS,
          );
        } catch (e) {
          this.logger.warn(`Could not generate presigned URL for ${s.objectKey}: ${e}`);
        }
        return {
          id: s.id,
          uploadedAt: s.uploadedAt,
          mimeType: s.mimeType,
          size: s.size,
          presignedUrl,
        };
      }),
    );

    return {
      id: payment.id,
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionRef: payment.transactionRef,
      transferDatetime: payment.transferDatetime,
      senderName: payment.senderName,
      senderBank: payment.senderBank,
      receiverName: payment.receiverName,
      receiverBank: payment.receiverBank,
      verifiedAt: payment.verifiedAt,
      slips: slipsWithPresignedUrls,
    };
  }
  /**
   * Admin: list all payments with optional status filter (blueprint §32)
   */
  async getAdminPayments(status?: string, branchId?: string) {
    return this.prisma.payment.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(branchId ? { order: { branchId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            total: true,
            orderStatus: true,
            customerName: true,
            customerPhone: true,
            branch: { select: { id: true, name: true } },
          },
        },
        slips: { select: { id: true, uploadedAt: true, mimeType: true } },
      },
      take: 100,
    });
  }
}
