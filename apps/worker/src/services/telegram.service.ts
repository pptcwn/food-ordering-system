import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly defaultAdminChatId: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.defaultAdminChatId = this.configService.get<string>('TELEGRAM_ADMIN_CHAT_ID', '');
  }

  /**
   * Send Markdown/HTML formatted message to Telegram Chat / Group
   */
  async sendMessage(chatId: string | undefined, message: string): Promise<boolean> {
    const targetChatId = chatId || this.defaultAdminChatId;

    if (!this.botToken || !targetChatId) {
      this.logger.warn(`Telegram not configured (BOT_TOKEN or CHAT_ID missing). Mocking alert:\n${message}`);
      return false;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML',
      });
      this.logger.log(` Telegram message sent to chat: ${targetChatId}`);
      return true;
    } catch (error: any) {
      this.logger.error('Failed to send Telegram message', error.response?.data || error.message);
      return false;
    }
  }

  formatOrderCreatedAlert(data: {
    orderNo: string;
    branchName: string;
    customerName: string;
    orderType: string;
    total: number;
    items: { name: string; variant?: string; quantity: number; subtotal: number }[];
  }): string {
    const itemsList = data.items
      .map((i) => `• ${i.name}${i.variant ? ` (${i.variant})` : ''} x${i.quantity} — ฿${i.subtotal}`)
      .join('\n');

    return `🛒 <b>ออเดอร์ใหม่เข้ามา</b>\n\n` +
      `<b>Order:</b> #${data.orderNo}\n` +
      `<b>สาขา:</b> ${data.branchName}\n` +
      `<b>ลูกค้า:</b> ${data.customerName}\n` +
      `<b>ประเภท:</b> ${data.orderType}\n\n` +
      `<b>รายการ:</b>\n${itemsList}\n\n` +
      `<b>ยอดรวม:</b> ฿${data.total}\n` +
      `<b>สถานะ:</b> 🟡 รอชำระเงิน`;
  }

  formatPaymentVerifiedAlert(data: {
    orderNo: string;
    branchName: string;
    total: number;
    transactionRef: string;
    senderName?: string;
  }): string {
    return `✅ <b>ชำระเงินสำเร็จ (Slip Verified)</b>\n\n` +
      `<b>Order:</b> #${data.orderNo}\n` +
      `<b>สาขา:</b> ${data.branchName}\n` +
      `<b>ยอดเงิน:</b> ฿${data.total}\n` +
      `<b>ผู้โอน:</b> ${data.senderName || '-'}\n` +
      `<b>Ref:</b> <code>${data.transactionRef}</code>\n\n` +
      `<b>สถานะ:</b> 🍳 ส่งเข้าครัวแล้ว (PAID)`;
  }

  formatPaymentFailedAlert(data: {
    orderNo: string;
    branchName: string;
    reason: string;
  }): string {
    return `⚠️ <b>ตรวจสลิปไม่ผ่าน / ต้องการตรวจสอบ</b>\n\n` +
      `<b>Order:</b> #${data.orderNo}\n` +
      `<b>สาขา:</b> ${data.branchName}\n` +
      `<b>สาเหตุ:</b> ${data.reason}\n\n` +
      `กรุณาตรวจสอบในระบบ Admin Dashboard`;
  }

  formatDeliveryCompletedAlert(data: {
    orderNo: string;
    branchName: string;
    riderName?: string;
  }): string {
    return `🎉 <b>จัดส่งสำเร็จแล้ว (DELIVERED)</b>\n\n` +
      `<b>Order:</b> #${data.orderNo}\n` +
      `<b>สาขา:</b> ${data.branchName}\n` +
      `<b>ผู้จัดส่ง:</b> ${data.riderName || 'Staff'}\n` +
      `<b>สถานะ:</b> จัดส่งถึงลูกค้าเรียบร้อยแล้ว`;
  }
}
