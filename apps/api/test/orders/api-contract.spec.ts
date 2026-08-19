import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe';
import { CheckoutOrderSchema, UpdateOrderStatusSchema } from '@food-ordering/validation';
import { BadRequestException } from '@nestjs/common';
import { OrderType, OrderStatus } from '@food-ordering/types';

describe('API Contract Validation', () => {
  describe('ZodValidationPipe with CheckoutOrderSchema', () => {
    let pipe: ZodValidationPipe;

    beforeEach(() => {
      pipe = new ZodValidationPipe(CheckoutOrderSchema);
    });

    it('should validate and transform valid checkout input', () => {
      const validPayload = {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        orderType: OrderType.DELIVERY,
        customerName: 'Somchai',
        customerPhone: '0812345678',
        deliveryAddress: '123/4 Sukhumvit',
        deliveryLatitude: 13.7563,
        deliveryLongitude: 100.5018,
      };

      const result = pipe.transform(validPayload, { type: 'body' } as any);
      expect(result).toMatchObject(validPayload);
    });

    it('should throw BadRequestException for missing required fields', () => {
      const invalidPayload = {
        // missing branchId
        orderType: OrderType.PICKUP,
      };

      expect(() => pipe.transform(invalidPayload, { type: 'body' } as any)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid phone number', () => {
      const invalidPayload = {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        orderType: OrderType.PICKUP,
        customerName: 'Somchai',
        customerPhone: 'invalid-phone-number', // must be /0[0-9]{8,9}/
      };

      try {
        pipe.transform(invalidPayload, { type: 'body' } as any);
        fail('Should throw exception');
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = e.getResponse();
        expect(response.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'customerPhone' }),
          ])
        );
      }
    });
  });

  describe('ZodValidationPipe with UpdateOrderStatusSchema', () => {
    let pipe: ZodValidationPipe;

    beforeEach(() => {
      pipe = new ZodValidationPipe(UpdateOrderStatusSchema);
    });

    it('should validate valid status update', () => {
      const validPayload = {
        status: OrderStatus.PREPARING,
      };

      const result = pipe.transform(validPayload, { type: 'body' } as any);
      expect(result).toEqual(validPayload);
    });

    it('should throw BadRequestException for invalid status', () => {
      const invalidPayload = {
        status: 'INVALID_STATUS',
      };

      expect(() => pipe.transform(invalidPayload, { type: 'body' } as any)).toThrow(BadRequestException);
    });
  });
});
