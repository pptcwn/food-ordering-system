import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaClient } from '@food-ordering/database';
import { QUEUE_NAMES, OrderStatus, PaymentStatus } from '@food-ordering/types';
import { Slip2GoService } from '../services/slip2go.service';
import { TelegramService } from '../services/telegram.service';
import * as Minio from 'minio';

@Processor(QUEUE_NAMES.PAYMENT_EVENTS)
export class PaymentEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentEventsProcessor.name);
  private prisma = new PrismaClient();
  private minioClient: Minio.Client;

  constructor(
    private slip2goService: Slip2GoService,
    private telegramService: TelegramService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private notificationsQueue: Queue,
  ) {
    super();
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`📥 Processing payment job: ${job.name} (Job ID: ${job.id})`);

    if (job.name === 'VERIFY_SLIP') {
      return this.handleVerifySlip(job.data);
    }
  }

  private async handleVerifySlip(data: {
    orderId: string;
    paymentId: string;
    slipId: string;
    bucket: string;
    objectKey: string;
  }) {
    const { orderId, paymentId, bucket, objectKey } = data;

    // 1. Fetch Order with Payment and Branch
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        branch: true,
      },
    });

    if (!order || !order.payment) {
      this.logger.error(`Order or payment not found: ${orderId}`);
      return { success: false, reason: 'Order not found' };
    }

    if (order.paymentStatus === PaymentStatus.VERIFIED) {
      this.logger.warn(`Order ${order.orderNo} is already verified.`);
      return { success: true, message: 'Already verified' };
    }

    // 2. Fetch Slip Buffer from MinIO
    let imageBuffer: Buffer;
    try {
      const stream = await this.minioClient.getObject(bucket, objectKey);
      const chunks: Buffer[] = [];
      imageBuffer = await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      this.logger.error(`Failed to download slip from MinIO: ${bucket}/${objectKey}`, error);
      return { success: false, reason: 'MinIO download failed' };
    }

    // 3. Call Slip2Go OCR Verification API
    const slipResult = await this.slip2goService.verifySlip(imageBuffer, objectKey.split('/').pop());

    if (!slipResult.success || !slipResult.data) {
      this.logger.warn(`Slip2Go rejected slip for order ${order.orderNo}: ${slipResult.message}`);
      await this.markPaymentFailed(order, 'Slip2Go verification failed or invalid QR');
      return { success: false, reason: slipResult.message };
    }

    // 4. Validate Business Rules (Amount, Duplicate, Receiver, Time)
    const validation = this.slip2goService.validateBusinessRules(
      slipResult.data,
      Number(order.total),
      order.createdAt,
      order.branch.paymentReceiverValue,
    );

    if (!validation.isValid || !validation.transactionRef) {
      this.logger.warn(`Business validation failed for order ${order.orderNo}: ${validation.errorMessage}`);
      await this.markPaymentFailed(order, validation.errorMessage || 'Invalid business rules');
      return { success: false, reason: validation.errorMessage };
    }

    // 5. Check Duplicate Slip (Anti-Fraud protection via unique transaction_ref)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { transactionRef: validation.transactionRef },
    });

    if (existingPayment && existingPayment.id !== order.payment.id) {
      this.logger.error(`🚨 DUPLICATE SLIP DETECTED! Ref: ${validation.transactionRef} already used on Payment ${existingPayment.id}`);
      await this.markPaymentFailed(order, `สลิปนี้เคยถูกใช้งานในระบบแล้ว (เลขอ้างอิงซ้ำ: ${validation.transactionRef})`);
      return { success: false, reason: 'Duplicate slip reference' };
    }

    // 6. All Validations Passed -> Atomic Database Transaction
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const p = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.VERIFIED,
            transactionRef: validation.transactionRef,
            amount: validation.amount || order.total,
            transferDatetime: validation.transferDatetime || new Date(),
            senderName: validation.senderName,
            senderBank: validation.senderBank,
            receiverName: validation.receiverName,
            receiverBank: validation.receiverBank,
            rawResponse: validation.rawResponse || undefined,
            verifiedAt: new Date(),
          },
        });

        const o = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.VERIFIED,
            orderStatus: OrderStatus.PAID,
            paidAt: new Date(),
          },
          include: { branch: true },
        });

        await tx.orderStatusLog.create({
          data: {
            orderId,
            fromStatus: order.orderStatus,
            toStatus: OrderStatus.PAID,
            changedBy: 'SLIP2GO_WORKER',
            reason: `Slip verified successfully (Ref: ${validation.transactionRef})`,
          },
        });

        return { payment: p, order: o };
      });

      this.logger.log(`🎉 Payment VERIFIED for order: ${order.orderNo} | Ref: ${validation.transactionRef}`);

      // 7. Enqueue Notifications
      await this.notificationsQueue.add('TELEGRAM_PAYMENT_VERIFIED', {
        orderId: order.id,
        orderNo: order.orderNo,
        branchName: order.branch.name,
        branchTelegramChatId: order.branch.telegramChatId,
        total: Number(order.total),
        transactionRef: validation.transactionRef,
        senderName: validation.senderName,
      });

      if (order.lineUserId) {
        await this.notificationsQueue.add('LINE_PUSH_NOTIFICATION', {
          lineUserId: order.lineUserId,
          message: `✅ ชำระเงินสำเร็จแล้ว!\n\nออเดอร์ #${order.orderNo}\nยอดเงิน: ฿${order.total}\n\nทางร้านกำลังเตรียมอาหารให้คุณครับ 🍳`,
        });
      }

      return { success: true, transactionRef: validation.transactionRef };
    } catch (dbError: any) {
      if (dbError.code === 'P2002') {
        this.logger.error(`Duplicate transaction_ref caught by DB constraint: ${validation.transactionRef}`);
        await this.markPaymentFailed(order, 'สลิปนี้ถูกใช้งานไปแล้ว (Unique Constraint Violation)');
        return { success: false, reason: 'Duplicate slip reference' };
      }
      throw dbError;
    }
  }

  private async markPaymentFailed(order: any, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          orderStatus: OrderStatus.PAYMENT_FAILED,
        },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: order.orderStatus,
          toStatus: OrderStatus.PAYMENT_FAILED,
          changedBy: 'SLIP2GO_WORKER',
          reason,
        },
      });
    });

    // Alert Telegram Admin
    await this.notificationsQueue.add('TELEGRAM_PAYMENT_FAILED', {
      orderId: order.id,
      orderNo: order.orderNo,
      branchName: order.branch.name,
      branchTelegramChatId: order.branch.telegramChatId,
      reason,
    });
  }
}
