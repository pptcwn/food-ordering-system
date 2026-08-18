export const BUCKET_NAMES = {
  PRODUCTS: process.env.MINIO_PRODUCTS_BUCKET || 'food-products',
  SLIPS: process.env.MINIO_SLIPS_BUCKET || 'food-slips',
  RECEIPTS: process.env.MINIO_RECEIPTS_BUCKET || 'food-receipts',
  DELIVERY: process.env.MINIO_DELIVERY_BUCKET || 'food-delivery',
} as const;

export const APP_CONFIG = {
  DEFAULT_ORDER_EXPIRATION_MINUTES: 15,
  PRESIGNED_URL_EXPIRATION_SECONDS: 600, // 10 minutes
  MAX_SLIP_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
