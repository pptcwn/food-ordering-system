import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { Slip2GoVerifyResponse, SlipValidationResult } from '@food-ordering/types';

export interface SlipVerificationContext {
  orderTotal: number;
  orderCreatedAt: Date;
  receiverValue?: string | null;
  receiverType?: string | null;
}

@Injectable()
export class Slip2GoService {
  private readonly logger = new Logger(Slip2GoService.name);
  private readonly apiUrl: string;
  private readonly apiSecret: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('SLIP2GO_API_URL', '');
    this.apiSecret = this.configService.get<string>('SLIP2GO_API_SECRET', '');
  }

  /**
   * Send Slip image buffer to Slip2Go OCR Verification API
   */
  async verifySlip(
    imageBuffer: Buffer,
    filename = 'slip.jpg',
    context?: SlipVerificationContext,
  ): Promise<Slip2GoVerifyResponse> {
    try {
      if (!this.apiSecret || !this.apiUrl) {
        this.logger.error('Slip2Go API URL or secret is not configured. Failing verification to prevent unauthorized payments.');
        return {
          success: false,
          message: 'Server configuration error: SLIP2GO_API_URL or SLIP2GO_API_SECRET missing',
        };
      }

      const form = new FormData();
      form.append('file', imageBuffer, { filename });
      if (context) {
        const receiverCheck = this.createReceiverCheck(context);
        form.append('payload', JSON.stringify({
          checkDuplicate: true,
          ...(receiverCheck ? { checkReceiver: [receiverCheck] } : {}),
          checkAmount: { type: 'eq', amount: context.orderTotal.toFixed(2) },
          checkDate: { type: 'gte', date: context.orderCreatedAt.toISOString() },
        }));
      }

      const response = await axios.post(`${this.getApiBaseUrl()}/api/verify-slip/qr-image/info`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.apiSecret}`,
        },
        timeout: 15000,
      });

      return this.normalizeResponse(response.data);
    } catch (error: any) {
      this.logger.error('Slip2Go API error', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  private getApiBaseUrl() {
    // Older setup used a /v1 suffix, while the current REST API documents /api routes.
    return this.apiUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, '');
  }

  private normalizeResponse(response: any): Slip2GoVerifyResponse {
    const data = response?.data;
    // Slip2Go returns 200000 for a plain lookup and 200200 when all requested
    // validation conditions, including checkReceiver, have passed.
    const successCodes = new Set(['200000', '200200']);
    if (!successCodes.has(response?.code) || !data?.transRef) {
      return {
        success: false,
        code: response?.code,
        message: response?.message || 'Slip2Go did not return a transaction reference',
      };
    }

    const receiverAccount = data.receiver?.account || {};
    const senderAccount = data.sender?.account || {};
    return {
      success: true,
      code: response?.code,
      message: response?.message,
      data: {
        transRef: data.transRef,
        date: data.dateTime || data.date,
        amount: Number(data.amount),
        receiver: {
          account: {
            name: receiverAccount.name,
            bank: data.receiver?.bank?.name || receiverAccount.bank,
            accountNumber: receiverAccount.bank?.account || receiverAccount.accountNumber,
            // Slip2Go returns a PromptPay recipient under receiver.account.proxy.
            promptpayNumber: receiverAccount.proxy?.account || receiverAccount.promptpayNumber,
          },
          bank: data.receiver?.bank,
        },
        sender: {
          account: {
            name: senderAccount.name,
            bank: data.sender?.bank?.name || senderAccount.bank,
            accountNumber: senderAccount.bank?.account || senderAccount.accountNumber,
          },
          bank: data.sender?.bank,
        },
        rawResponse: response,
      },
    };
  }

  private createReceiverCheck(context: SlipVerificationContext) {
    const accountNumber = context.receiverValue?.replace(/[^0-9A-Za-z]/g, '');
    if (!accountNumber) return undefined;

    if (context.receiverType === 'PROMPTPAY') {
      return {
        // 02001 is Slip2Go's account type for a PromptPay phone number.
        accountType: accountNumber.length === 10 ? '02001' : '02003',
        accountNumber,
      };
    }

    return { accountNumber };
  }

  private accountName(name?: { th?: string; en?: string } | string) {
    if (typeof name === 'string') return name;
    return name?.th || name?.en;
  }

  private bankName(bank?: string | { account?: string }) {
    return typeof bank === 'string' ? bank : undefined;
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

    // 1. Amount Match Check
    const slipAmount = Number(slipData.amount);
    if (Math.abs(slipAmount - orderTotal) > 0.01) {
      return {
        isValid: false,
        errorCode: 'AMOUNT_MISMATCH',
        errorMessage: `ยอดเงินในสลิป (฿${slipAmount}) ไม่ตรงกับยอดสั่งซื้อ (฿${orderTotal})`,
      };
    }

    // 2. Transfer Time Check: Transfer must be after Order Created At (with 5 min grace period for clock drift)
    const transferDate = new Date(slipData.dateTime || slipData.date || '');
    if (Number.isNaN(transferDate.getTime())) {
      return {
        isValid: false,
        errorCode: 'SLIP_INVALID',
        errorMessage: 'สลิปไม่มีเวลาการโอนที่ตรวจสอบได้',
      };
    }
    const orderCreatedWithGrace = new Date(orderCreatedAt.getTime() - 5 * 60 * 1000);
    if (transferDate < orderCreatedWithGrace) {
      return {
        isValid: false,
        errorCode: 'EXPIRED_TRANSFER_TIME',
        errorMessage: 'เวลาที่โอนเงินเกิดขึ้นก่อนเวลาที่สร้างออเดอร์ (สลิปเก่า)',
      };
    }

    // 3. Receiver Match Check
    if (branchReceiverValue) {
      // Receiver identifiers in the response are masked. The full check is performed
      // by Slip2Go through payload.checkReceiver before this response is accepted.
      const slipPromptPay = slipData.receiver?.account?.promptpayNumber?.replace(/[^0-9A-Za-z]/g, '');
      const slipBankAccount = slipData.receiver?.account?.accountNumber?.replace(/[^0-9A-Za-z]/g, '');
      const expectedReceiver = branchReceiverValue.replace(/[^0-9A-Za-z]/g, '');

      const unmaskedReceiverIdentifiers = [slipPromptPay, slipBankAccount]
        .filter((identifier): identifier is string => Boolean(identifier && !/[X*]/i.test(identifier)));

      if (unmaskedReceiverIdentifiers.length > 0 && !unmaskedReceiverIdentifiers.includes(expectedReceiver)) {
        return {
          isValid: false,
          errorCode: 'RECEIVER_MISMATCH',
          errorMessage: 'บัญชีผู้รับเงินไม่ตรงกับบัญชีของสาขา',
        };
      }
    } else {
       return {
        isValid: false,
        errorCode: 'BRANCH_RECEIVER_NOT_CONFIGURED',
        errorMessage: 'สาขายังไม่ได้ตั้งค่าบัญชีรับเงิน',
      };
    }

    return {
      isValid: true,
      transactionRef: slipData.transRef,
      amount: slipAmount || orderTotal,
      transferDatetime: transferDate,
      senderName: this.accountName(slipData.sender?.account?.name),
      senderBank: this.bankName(slipData.sender?.account?.bank),
      receiverName: this.accountName(slipData.receiver?.account?.name),
      receiverBank: this.bankName(slipData.receiver?.account?.bank),
      rawResponse: slipData as any,
    };
  }
}
