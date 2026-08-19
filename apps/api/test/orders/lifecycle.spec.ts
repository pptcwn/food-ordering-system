import { OrderLifecycleService } from '../../src/orders/order-lifecycle.service';
import { OrderStatus, UserRole, OrderType } from '@food-ordering/types';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('OrderLifecycleService', () => {
  let service: OrderLifecycleService;

  beforeEach(() => {
    service = new OrderLifecycleService();
  });

  describe('Admin and Branch Manager Roles', () => {
    it('should allow SUPER_ADMIN to bypass state machine', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.COMPLETED, UserRole.SUPER_ADMIN, OrderType.DELIVERY)
      ).not.toThrow();
    });

    it('should allow BRANCH_MANAGER to bypass state machine', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.PAID, OrderStatus.CANCELLED, UserRole.BRANCH_MANAGER, OrderType.DELIVERY)
      ).not.toThrow();
    });
  });

  describe('Kitchen Role', () => {
    it('should allow KITCHEN to transition from CONFIRMED to PREPARING', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.CONFIRMED, OrderStatus.PREPARING, UserRole.KITCHEN, OrderType.DELIVERY)
      ).not.toThrow();
    });

    it('should allow KITCHEN to transition from PREPARING to READY', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.PREPARING, OrderStatus.READY, UserRole.KITCHEN, OrderType.DELIVERY)
      ).not.toThrow();
    });

    it('should allow KITCHEN to CANCEL a CONFIRMED order', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED, UserRole.KITCHEN, OrderType.DELIVERY)
      ).not.toThrow();
    });

    it('should NOT allow KITCHEN to transition from PAID to PREPARING', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.PAID, OrderStatus.PREPARING, UserRole.KITCHEN, OrderType.DELIVERY)
      ).toThrow(BadRequestException);
    });

    it('should NOT allow KITCHEN to DELIVER an order', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, UserRole.KITCHEN, OrderType.DELIVERY)
      ).toThrow(BadRequestException);
    });
  });

  describe('Delivery Role', () => {
    it('should allow DELIVERY to transition from READY to OUT_FOR_DELIVERY for DELIVERY order types', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY, UserRole.DELIVERY, OrderType.DELIVERY)
      ).not.toThrow();
    });

    it('should allow DELIVERY to transition from OUT_FOR_DELIVERY to DELIVERED', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, UserRole.DELIVERY, OrderType.DELIVERY)
      ).not.toThrow();
    });

    it('should NOT allow DELIVERY to transition a PICKUP order', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY, UserRole.DELIVERY, OrderType.PICKUP)
      ).toThrow(ForbiddenException);
    });

    it('should NOT allow DELIVERY to CANCEL an order', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.READY, OrderStatus.CANCELLED, UserRole.DELIVERY, OrderType.DELIVERY)
      ).toThrow(BadRequestException);
    });

    it('should NOT allow DELIVERY to transition from PREPARING to READY', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.PREPARING, OrderStatus.READY, UserRole.DELIVERY, OrderType.DELIVERY)
      ).toThrow(BadRequestException);
    });
  });
});
