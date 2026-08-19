import { z } from 'zod';
import { OrderType, UserRole, OrderStatus } from '@food-ordering/types';

// Auth validation
export const LoginAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginAdminDto = z.infer<typeof LoginAdminSchema>;

export const LineAuthSchema = z.object({
  idToken: z.string().min(1, 'LINE ID Token is required'),
});
export type LineAuthDto = z.infer<typeof LineAuthSchema>;

// Cart & Item validation
export const AddToCartSchema = z.object({
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  productVariantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
  specialNote: z.string().max(200).optional(),
  modifierIds: z.array(z.string().uuid()).default([]),
});
export type AddToCartDto = z.infer<typeof AddToCartSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
  specialNote: z.string().max(200).optional(),
  modifierIds: z.array(z.string().uuid()).optional(),
});
export type UpdateCartItemDto = z.infer<typeof UpdateCartItemSchema>;

// Checkout & Order Creation validation
export const CheckoutOrderSchema = z.object({
  branchId: z.string().uuid(),
  orderType: z.nativeEnum(OrderType),
  customerName: z.string().min(1, 'Customer name is required').max(100),
  customerPhone: z.string().regex(/^0[0-9]{8,9}$/, 'Invalid Thai phone number (e.g. 0812345678)'),
  addressId: z.string().uuid().optional(),
  deliveryAddress: z.string().max(500).optional(),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  note: z.string().max(500).optional(),
  sessionId: z.string().optional(),
  couponCode: z.string().optional(),
});
export type CheckoutOrderDto = z.infer<typeof CheckoutOrderSchema>;

// Order Status Update validation
export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  reason: z.string().max(500).optional(),
});
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;

// Product Availability Toggle validation
export const UpdateProductAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
export type UpdateProductAvailabilityDto = z.infer<typeof UpdateProductAvailabilitySchema>;
