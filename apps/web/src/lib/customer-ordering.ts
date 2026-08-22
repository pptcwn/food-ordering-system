import type { CustomerLocation } from './store';

export type CustomerOrderType = 'DELIVERY' | 'PICKUP';

export function isFulfilmentReady(input: { orderType: CustomerOrderType; location: CustomerLocation | null }): boolean {
  return (
    input.orderType === 'PICKUP' ||
    Boolean(
      input.location?.addressLine.trim() &&
        Number.isFinite(input.location.latitude) &&
        Number.isFinite(input.location.longitude),
    )
  );
}

export function getCheckoutBlocker(input: {
  itemCount: number;
  orderType: CustomerOrderType;
  location: CustomerLocation | null;
  hasUnavailableItem: boolean;
  hasProfile: boolean;
}): string | null {
  if (input.itemCount === 0) return 'ตะกร้าสินค้าว่างอยู่';
  if (!input.hasProfile) return 'กรุณากรอกชื่อและเบอร์โทรก่อนสั่งอาหาร';
  if (!isFulfilmentReady(input)) return 'กรุณาเพิ่มที่อยู่จัดส่งก่อนยืนยันออเดอร์';
  if (input.hasUnavailableItem) return 'มีสินค้าหมดในตะกร้า กรุณาลบรายการนั้นออก';
  return null;
}
