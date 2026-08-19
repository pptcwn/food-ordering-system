// User Roles
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  KITCHEN = 'KITCHEN',
  DELIVERY = 'DELIVERY',
  STAFF = 'STAFF',
}

// Order Types
export enum OrderType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
  DINE_IN = 'DINE_IN',
}

// Order Status State Machine
export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_VERIFYING = 'PAYMENT_VERIFYING',
  PAID = 'PAID',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
}

// Payment Status State Machine
export enum PaymentStatus {
  PENDING = 'PENDING',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  REFUNDED = 'REFUNDED',
}

// Delivery Status State Machine
export enum DeliveryStatus {
  UNASSIGNED = 'UNASSIGNED',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// Promotion Types
export enum PromotionType {
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

// Notification Channels & Event Types
export enum NotificationChannel {
  LINE = 'LINE',
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotificationEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_VERIFYING = 'PAYMENT_VERIFYING',
  PAYMENT_VERIFIED = 'PAYMENT_VERIFIED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_PREPARING = 'ORDER_PREPARING',
  ORDER_READY = 'ORDER_READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
}

// WebSocket Event Names
export const WS_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_STATUS_CHANGED: 'order.status.changed',
  PRODUCT_AVAILABILITY_CHANGED: 'product.availability.changed',
  KITCHEN_NEW_ORDER: 'kitchen.new_order',
  KITCHEN_ORDER_UPDATED: 'kitchen.order_updated',
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_STATUS_CHANGED: 'delivery.status_changed',
} as const;

// BullMQ Queue Names
export const QUEUE_NAMES = {
  ORDER_EVENTS: 'order-events',
  PAYMENT_EVENTS: 'payment-events',
  NOTIFICATIONS: 'notifications',
  ORDER_EXPIRATION: 'order-expiration',
  REPORTS: 'reports',
} as const;

// Slip2Go API Interfaces
export interface Slip2GoVerifyResponse {
  success: boolean;
  message?: string;
  data?: {
    transRef: string;
    date: string;
    amount: number;
    receiver: {
      account: {
        name: {
          th?: string;
          en?: string;
        };
        bank: string;
        accountNumber?: string;
        promptpayNumber?: string;
      };
    };
    sender: {
      account: {
        name: {
          th?: string;
          en?: string;
        };
        bank: string;
      };
    };
    rawResponse?: Record<string, any>;
  };
}

// Slip Validation Result
export interface SlipValidationResult {
  isValid: boolean;
  errorCode?: 'SLIP_INVALID' | 'DUPLICATE_SLIP' | 'RECEIVER_MISMATCH' | 'AMOUNT_MISMATCH' | 'EXPIRED_TRANSFER_TIME' | 'ORDER_ALREADY_PAID' | 'BRANCH_RECEIVER_NOT_CONFIGURED';
  errorMessage?: string;
  transactionRef?: string;
  amount?: number;
  transferDatetime?: Date;
  senderName?: string;
  senderBank?: string;
  receiverName?: string;
  receiverBank?: string;
  rawResponse?: Record<string, any>;
}

// Product Availability WebSocket Payload
export interface ProductAvailabilityPayload {
  productId: string;
  branchId: string;
  isAvailable: boolean;
}

// Order Status Change WebSocket Payload
export interface OrderStatusChangedPayload {
  orderId: string;
  orderNo: string;
  branchId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}
