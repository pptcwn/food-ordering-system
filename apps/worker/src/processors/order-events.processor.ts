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

      // Only expire if still in PENDING_PAYMENT state and not paid
      if (
        order.orderStatus === OrderStatus.PENDING_PAYMENT &&
        order.paymentStatus === PaymentStatus.PENDING
      ) {
        const now = new Date();
        if (now >= order.expiresAt) {
          await this.prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: orderId },
              data: {
                orderStatus: OrderStatus.EXPIRED,
                paymentStatus: PaymentStatus.FAILED,
              },
            });

            await tx.orderStatusLog.create({
              data: {
                orderId,
                fromStatus: OrderStatus.PENDING_PAYMENT,
                toStatus: OrderStatus.EXPIRED,
                changedBy: 'EXPIRATION_WORKER',
                reason: 'Order payment window expired (15 minutes limit)',
              },
            });
          });

          this.logger.log(`⏳ Order expired due to non-payment: ${order.orderNo}`);
        }
      }
    }
  }
}
