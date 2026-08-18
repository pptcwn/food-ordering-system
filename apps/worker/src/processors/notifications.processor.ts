import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES, OrderStatus } from '@food-ordering/types';
import { TelegramService } from '../services/telegram.service';
import { LineNotifyService } from '../services/line-notify.service';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private telegramService: TelegramService,
    private lineNotifyService: LineNotifyService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`📨 Processing notification job: ${job.name}`);

    switch (job.name) {
      case 'TELEGRAM_ORDER_CREATED': {
        const text = this.telegramService.formatOrderCreatedAlert(job.data);
        await this.telegramService.sendMessage(job.data.branchTelegramChatId, text);
        break;
      }

      case 'TELEGRAM_PAYMENT_VERIFIED': {
        const text = this.telegramService.formatPaymentVerifiedAlert(job.data);
        await this.telegramService.sendMessage(job.data.branchTelegramChatId, text);
        break;
      }

      case 'TELEGRAM_PAYMENT_FAILED': {
        const text = this.telegramService.formatPaymentFailedAlert(job.data);
        await this.telegramService.sendMessage(job.data.branchTelegramChatId, text);
        break;
      }

      case 'NOTIFY_STATUS_CHANGE': {
        const { orderNo, status, lineUserId } = job.data;
        if (lineUserId) {
          let msg = '';
          if (status === OrderStatus.PREPARING) {
            msg = `🍳 ออเดอร์ #${orderNo}\nห้องครัวกำลังเริ่มทำอาหารให้คุณแล้วครับ`;
          } else if (status === OrderStatus.READY) {
            msg = `📦 ออเดอร์ #${orderNo}\nอาหารของคุณทำเสร็จเรียบร้อย พร้อมจัดส่ง/พร้อมรับแล้วครับ`;
          } else if (status === OrderStatus.OUT_FOR_DELIVERY) {
            msg = `🛵 ออเดอร์ #${orderNo}\nพนักงานส่งกำลังนำอาหารไปส่งให้คุณแล้วครับ`;
          } else if (status === OrderStatus.DELIVERED) {
            msg = `✅ ออเดอร์ #${orderNo}\nจัดส่งอาหารเรียบร้อยแล้ว ขอบคุณที่สั่งอาหารกับเราครับ! 🙏`;
          }

          if (msg) {
            await this.lineNotifyService.sendPushMessage(lineUserId, msg);
          }
        }
        break;
      }

      case 'LINE_PUSH_NOTIFICATION': {
        await this.lineNotifyService.sendPushMessage(job.data.lineUserId, job.data.message);
        break;
      }
    }
  }
}
