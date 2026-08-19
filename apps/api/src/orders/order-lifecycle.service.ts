import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrderStatus, UserRole, OrderType } from '@food-ordering/types';

@Injectable()
export class OrderLifecycleService {
  /**
   * Asserts whether a transition is allowed based on the user's role and order type.
   */
  assertValidTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    role: UserRole,
    orderType: OrderType,
  ): void {
    if (currentStatus === targetStatus) {
      return; // No-op
    }

    // Admins and Branch Managers have full override capabilities
    if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN || role === UserRole.BRANCH_MANAGER) {
      return;
    }

    // Role-specific transition rules
    if (role === UserRole.KITCHEN) {
      this.assertKitchenTransition(currentStatus, targetStatus);
      return;
    }

    if (role === UserRole.DELIVERY) {
      this.assertDeliveryTransition(currentStatus, targetStatus, orderType);
      return;
    }

    throw new ForbiddenException(`Role ${role} is not authorized to update order status`);
  }

  private assertKitchenTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): void {
    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY],
    };

    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(targetStatus)) {
      throw new BadRequestException(
        `KITCHEN cannot transition order from ${currentStatus} to ${targetStatus}`,
      );
    }
  }

  private assertDeliveryTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    orderType: OrderType,
  ): void {
    if (orderType !== OrderType.DELIVERY) {
      throw new ForbiddenException('Delivery staff can only update delivery orders');
    }

    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
    };

    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(targetStatus)) {
      throw new BadRequestException(
        `DELIVERY cannot transition order from ${currentStatus} to ${targetStatus}`,
      );
    }
  }
}
