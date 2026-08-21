export function getLatestReorderableOrder(orders: any[]): any | null {
  return orders
    .filter((order) => ['COMPLETED', 'DELIVERED'].includes(order.orderStatus) && Array.isArray(order.items) && order.items.length > 0)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0] || null;
}
