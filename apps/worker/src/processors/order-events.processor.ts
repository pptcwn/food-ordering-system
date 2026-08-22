import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@food-ordering/database';
import { QUEUE_NAMES, OrderStatus, PaymentStatus } from '@food-ordering/types';

@Processor(QUEUE_NAMES.ORDER_EXPIRATION)
export class OrderEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderEventsProcessor.name);
  private prisma = new PrismaClient();

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'CHECK_ORDER_EXPIRATION') {
      const { orderId } = job.data;
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) return;

      // Cancel only after payment is definitively absent or failed. Keep a
      // payment being verified intact so a slow provider response is not lost.
      const shouldCancel =
        (order.orderStatus === OrderStatus.PENDING_PAYMENT && order.paymentStatus === PaymentStatus.PENDING) ||
        (order.orderStatus === OrderStatus.PAYMENT_FAILED && order.paymentStatus === PaymentStatus.FAILED);

      if (shouldCancel) {
        const now = new Date();
        if (now >= order.expiresAt) {
          await this.prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: orderId },
              data: {
                orderStatus: OrderStatus.CANCELLED,
                paymentStatus: PaymentStatus.FAILED,
              },
            });

            await tx.orderStatusLog.create({
              data: {
                orderId,
                fromStatus: order.orderStatus,
                toStatus: OrderStatus.CANCELLED,
                changedBy: 'EXPIRATION_WORKER',
                reason: 'ยกเลิกอัตโนมัติ: ไม่ชำระเงินสำเร็จภายใน 2 นาที',
              },
            });
          });

          this.logger.log(`⏳ Order cancelled due to non-payment: ${order.orderNo}`);
        }
      }
    }
  }
}
