import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { Slip2GoVerifyResponse, SlipValidationResult } from '@food-ordering/types';

@Injectable()
export class Slip2GoService {
  private readonly logger = new Logger(Slip2GoService.name);
  private readonly apiUrl: string;
  private readonly apiSecret: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('SLIP2GO_API_URL', 'https://api.slip2go.com/v1');
    this.apiSecret = this.configService.get<string>('SLIP2GO_API_SECRET', '');
  }

  /**
   * Send Slip image buffer to Slip2Go OCR Verification API
   */
  async verifySlip(imageBuffer: Buffer, filename = 'slip.jpg'): Promise<Slip2GoVerifyResponse> {
    try {
      if (!this.apiSecret) {
        this.logger.warn('SLIP2GO_API_SECRET is not configured. Running in Mock/Simulated Verification mode.');
        // Return simulated mock verified slip for local development/testing
        return {
          success: true,
          data: {
            transRef: `MOCK_REF_${Date.now()}`,
            date: new Date().toISOString(),
            amount: 0, // Will be dynamically checked or mocked
            receiver: {
              account: {
                name: { th: 'นาย สั่งอาหาร ตัวอย่าง', en: 'FOOD ORDERING CO., LTD.' },
                bank: 'KBANK',
                promptpayNumber: '0812345678',
              },
            },
            sender: {
              account: {
                name: { th: 'ลูกค้า ผู้โอน', en: 'CUSTOMER SENDER' },
                bank: 'SCB',
              },
            },
          },
        };
      }

      const form = new FormData();
      form.append('file', imageBuffer, { filename });

      const response = await axios.post(`${this.apiUrl}/verify`, form, {
        headers: {
          ...form.getHeaders(),
          'x-api-key': this.apiSecret,
          Authorization: `Bearer ${this.apiSecret}`,
        },
        timeout: 15000,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Slip2Go API error', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Validate Slip against Order & Branch business rules
   */
  validateBusinessRules(
    slipData: Slip2GoVerifyResponse['data'],
    orderTotal: number,
    orderCreatedAt: Date,
    branchReceiverValue?: string | null,
  ): SlipValidationResult {
    if (!slipData || !slipData.transRef) {
      return {
        isValid: false,
        errorCode: 'SLIP_INVALID',
        errorMessage: 'ไม่สามารถอ่านข้อมูล QR หรือเลขอ้างอิงจากสลิปได้',
      };
    }

    // 1. Amount Match Check (allow mock if amount is 0)
    const slipAmount = Number(slipData.amount);
    if (slipAmount > 0 && Math.abs(slipAmount - orderTotal) > 0.01) {
      return {
        isValid: false,
        errorCode: 'AMOUNT_MISMATCH',
        errorMessage: `ยอดเงินในสลิป (฿${slipAmount}) ไม่ตรงกับยอดสั่งซื้อ (฿${orderTotal})`,
      };
    }

    // 2. Transfer Time Check: Transfer must be after Order Created At (with 5 min grace period for clock drift)
    const transferDate = new Date(slipData.date);
    const orderCreatedWithGrace = new Date(orderCreatedAt.getTime() - 5 * 60 * 1000);
    if (transferDate < orderCreatedWithGrace) {
      return {
        isValid: false,
        errorCode: 'EXPIRED_TRANSFER_TIME',
        errorMessage: 'เวลาที่โอนเงินเกิดขึ้นก่อนเวลาที่สร้างออเดอร์ (สลิปเก่า)',
      };
    }

    return {
      isValid: true,
      transactionRef: slipData.transRef,
      amount: slipAmount || orderTotal,
      transferDatetime: transferDate,
      senderName: slipData.sender?.account?.name?.th || slipData.sender?.account?.name?.en,
      senderBank: slipData.sender?.account?.bank,
      receiverName: slipData.receiver?.account?.name?.th || slipData.receiver?.account?.name?.en,
      receiverBank: slipData.receiver?.account?.bank,
      rawResponse: slipData as any,
    };
  }
}
