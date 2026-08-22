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

// Category Admin Validation
export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateCategoryDtoType = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  isActive: z.boolean().optional()
});
export type UpdateCategoryDtoType = z.infer<typeof UpdateCategorySchema>;

// Branch storefront customization
export const UpdateBranchStorefrontSchema = z.object({
  storefrontCoverUrl: z.string().url().max(2_000).nullable().optional(),
  storefrontProfileUrl: z.string().url().max(2_000).nullable().optional(),
  storefrontHeadline: z.string().max(120).nullable().optional(),
  storefrontSubheadline: z.string().max(200).nullable().optional(),
  storefrontThemeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});
export type UpdateBranchStorefrontDtoType = z.infer<typeof UpdateBranchStorefrontSchema>;

export const UpdateBranchSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Store name is required').max(120),
  paymentReceiverType: z.enum(['PROMPTPAY', 'BANK_ACCOUNT']).nullable().optional(),
  paymentReceiverValue: z.string().trim().min(1).max(50).nullable().optional(),
  paymentReceiverName: z.string().trim().max(120).nullable().optional(),
  paymentReceiverBank: z.string().trim().max(80).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  freeDeliveryDistanceKm: z.number().min(0).max(100).optional(),
  deliveryFeePerKm: z.number().min(0).max(1000).optional(),
});
export type UpdateBranchSettingsDtoType = z.infer<typeof UpdateBranchSettingsSchema>;

// Product Admin Validation
export const CreateProductSchema = z.object({
  categoryId: z.string().uuid('Invalid Category ID'),
  branchId: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required').max(150),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid Image URL').optional().or(z.literal('')),
  basePrice: z.number().min(0, 'Price must be >= 0'),
  salePrice: z.number().min(0, 'Sale price must be >= 0').nullable().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  variants: z.array(z.object({
    name: z.string(),
    price: z.number(),
    isDefault: z.boolean().optional()
  })).optional(),
  modifierGroupIds: z.array(z.string().uuid()).optional(),
});
export type CreateProductDtoType = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  isActive: z.boolean().optional()
});
export type UpdateProductDtoType = z.infer<typeof UpdateProductSchema>;
