import { describe, expect, it } from 'vitest';
import { getLatestReorderableOrder } from './reorder';

describe('getLatestReorderableOrder', () => {
  it('chooses the newest delivered order with items', () => {
    expect(getLatestReorderableOrder([{ id: 'old', orderStatus: 'DELIVERED', createdAt: '2026-01-01', items: [{}] }, { id: 'new', orderStatus: 'COMPLETED', createdAt: '2026-02-01', items: [{}] }])?.id).toBe('new');
  });
});
