import { describe, expect, it } from 'vitest';
import { getCheckoutBlocker, isFulfilmentReady } from './customer-ordering';

describe('customer checkout guards', () => {
  it('allows pickup without an address but blocks delivery without one', () => {
    expect(isFulfilmentReady({ orderType: 'PICKUP', location: null })).toBe(true);
    expect(isFulfilmentReady({ orderType: 'DELIVERY', location: null })).toBe(false);
  });

  it('returns an actionable message for an empty cart', () => {
    expect(getCheckoutBlocker({ itemCount: 0, orderType: 'PICKUP', location: null, hasUnavailableItem: false, hasProfile: true }))
      .toBe('ตะกร้าสินค้าว่างอยู่');
  });
});
