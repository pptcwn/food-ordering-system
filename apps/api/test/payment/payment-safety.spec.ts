import { Slip2GoService } from '../../../worker/src/services/slip2go.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

describe('Payment Safety Integration', () => {
  let slip2GoService: Slip2GoService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('mock-secret'),
    };
    slip2GoService = new Slip2GoService(mockConfigService as unknown as ConfigService);
  });

  describe('Business Rules Validation', () => {
    const mockOrderTotal = 150.5;
    const mockOrderCreatedAt = new Date('2026-08-20T10:00:00Z');
    const mockValidSlipDate = new Date('2026-08-20T10:05:00Z').toISOString();
    
    const createBaseSlip = (overrides = {}) => ({
      transRef: 'REF123456',
      date: mockValidSlipDate,
      amount: mockOrderTotal,
      receiver: {
        account: {
          name: { th: 'John', en: 'John' },
          bank: 'KBANK',
          promptpayNumber: '081-234-5678',
        }
      },
      sender: {
        account: {
          name: { th: 'Jane', en: 'Jane' },
          bank: 'SCB'
        }
      },
      ...overrides
    });

    it('rejects slip with mismatched receiver PromptPay number', () => {
      const slipData = createBaseSlip();
      const result = slip2GoService.validateBusinessRules(slipData as any, mockOrderTotal, mockOrderCreatedAt, '0999999999');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('RECEIVER_MISMATCH');
    });

    it('accepts slip with matched receiver PromptPay number (ignores dashes)', () => {
      const slipData = createBaseSlip();
      const result = slip2GoService.validateBusinessRules(slipData as any, mockOrderTotal, mockOrderCreatedAt, '0812345678');
      expect(result.isValid).toBe(true);
      expect(result.transactionRef).toBe('REF123456');
    });

    it('rejects slip with mismatched amount', () => {
      const slipData = createBaseSlip({ amount: 100 });
      const result = slip2GoService.validateBusinessRules(slipData as any, mockOrderTotal, mockOrderCreatedAt, '0812345678');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('AMOUNT_MISMATCH');
    });

    it('rejects slip if transfer date is before order creation (expired transfer time)', () => {
      const slipData = createBaseSlip({ date: new Date('2026-08-20T09:50:00Z').toISOString() });
      const result = slip2GoService.validateBusinessRules(slipData as any, mockOrderTotal, mockOrderCreatedAt, '0812345678');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('EXPIRED_TRANSFER_TIME');
    });
  });

  describe('Slip2Go REST API response', () => {
    const orderTotal = 150.5;
    const orderCreatedAt = new Date('2026-08-20T10:00:00Z');
    const slipDate = new Date('2026-08-20T10:05:00Z').toISOString();

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('normalizes the current QR-image API response before validating it', async () => {
      jest.spyOn(axios, 'post').mockResolvedValue({
        data: {
          code: '200000',
          message: 'Slip found.',
          data: {
            transRef: 'NEW-REF-123',
            dateTime: slipDate,
            amount: orderTotal,
            receiver: {
              account: {
                name: 'ร้านทดสอบ',
                proxy: { account: '081-234-5678' },
              },
              bank: { name: 'KBANK' },
            },
            sender: {
              account: { name: 'Jane' },
              bank: { name: 'SCB' },
            },
          },
        },
      } as any);

      const result = await slip2GoService.verifySlip(Buffer.from('test'), 'slip.jpg', {
        orderTotal,
        orderCreatedAt,
      });

      expect(result.success).toBe(true);
      expect(result.data?.transRef).toBe('NEW-REF-123');
      expect(result.data?.receiver.account.promptpayNumber).toBe('081-234-5678');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/verify-slip/qr-image/info'),
        expect.anything(),
        expect.objectContaining({ timeout: 15000 }),
      );
    });
  });
});
