import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@food-ordering/types';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get Sales and Operations Summary
   */
  async getSalesSummary(branchId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (branchId) {
      where.branchId = branchId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // 1. Total Orders & Revenue (Paid / Delivered / Completed)
    const allOrders = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
        payment: true,
        branch: true,
      },
    });

    const totalOrdersCount = allOrders.length;
    const completedOrders = allOrders.filter(
      (o) =>
        o.orderStatus === OrderStatus.PAID ||
        o.orderStatus === OrderStatus.CONFIRMED ||
        o.orderStatus === OrderStatus.PREPARING ||
        o.orderStatus === OrderStatus.READY ||
        o.orderStatus === OrderStatus.OUT_FOR_DELIVERY ||
        o.orderStatus === OrderStatus.DELIVERED ||
        o.orderStatus === OrderStatus.COMPLETED,
    );

    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalFoodRevenue = completedOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const totalDeliveryFees = completedOrders.reduce((sum, o) => sum + Number(o.deliveryFee), 0);
    const totalDiscounts = completedOrders.reduce((sum, o) => sum + Number(o.discount || 0), 0);

    const cancelledOrdersCount = allOrders.filter(
      (o) => o.orderStatus === OrderStatus.CANCELLED || o.orderStatus === OrderStatus.EXPIRED,
    ).length;

    // 2. Orders by Status Breakdown
    const statusBreakdown: Record<string, number> = {};
    allOrders.forEach((o) => {
      statusBreakdown[o.orderStatus] = (statusBreakdown[o.orderStatus] || 0) + 1;
    });

    // 3. Top Selling Products
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    completedOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += Number(item.subtotal);
      });
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // 4. Branch Breakdown
    const branchBreakdownMap: Record<string, { name: string; orders: number; revenue: number }> = {};
    completedOrders.forEach((o) => {
      const bId = o.branchId;
      if (!branchBreakdownMap[bId]) {
        branchBreakdownMap[bId] = {
          name: o.branch.name,
          orders: 0,
          revenue: 0,
        };
      }
      branchBreakdownMap[bId].orders += 1;
      branchBreakdownMap[bId].revenue += Number(o.total);
    });

    return {
      totalOrdersCount,
      completedOrdersCount: completedOrders.length,
      cancelledOrdersCount,
      totalRevenue,
      totalFoodRevenue,
      totalDeliveryFees,
      totalDiscounts,
      statusBreakdown,
      topSellingProducts,
      branchBreakdown: Object.values(branchBreakdownMap),
    };
  }

  /**
   * Daily / Weekly Sales Trends (for visual charts)
   */
  async getSalesTrends(branchId?: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(branchId ? { branchId } : {}),
        orderStatus: {
          in: [
            OrderStatus.PAID,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED,
            OrderStatus.COMPLETED,
          ],
        },
      },
      select: {
        createdAt: true,
        total: true,
        subtotal: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by Date string YYYY-MM-DD
    const trendsMap: Record<string, { date: string; revenue: number; orders: number }> = {};

    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - i));
      const key = d.toISOString().split('T')[0];
      trendsMap[key] = { date: key, revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (trendsMap[key]) {
        trendsMap[key].revenue += Number(o.total);
        trendsMap[key].orders += 1;
      }
    });

    return Object.values(trendsMap);
  }

  /**
   * Export all orders to CSV formatted text
   */
  async exportOrdersCsv(branchId?: string, startDate?: string, endDate?: string): Promise<string> {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { name: true } },
        payment: { select: { provider: true, status: true } },
      },
    });

    const header = [
      'Order No',
      'Date',
      'Branch',
      'Customer',
      'Phone',
      'Order Type',
      'Subtotal',
      'Delivery Fee',
      'Discount',
      'Total',
      'Order Status',
      'Payment Status',
    ].join(',');

    const rows = orders.map((o) => {
      const date = new Date(o.createdAt).toISOString().replace('T', ' ').substring(0, 19);
      return [
        `"${o.orderNo}"`,
        `"${date}"`,
        `"${o.branch?.name || ''}"`,
        `"${o.customerName || ''}"`,
        `"${o.customerPhone || ''}"`,
        `"${o.orderType}"`,
        Number(o.subtotal || 0),
        Number(o.deliveryFee || 0),
        Number(o.discount || 0),
        Number(o.total || 0),
        `"${o.orderStatus}"`,
        `"${o.payment?.status || o.paymentStatus}"`,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }
}
