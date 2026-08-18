'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Store,
  Bike,
  Package,
  Award,
  Users,
  Download,
  Tag,
  CreditCard,
  ChevronRight,
  BarChart3,
  Calendar,
  Utensils,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Fetch Branches
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  // Fetch Sales Summary Report
  const { data: report, isLoading: isReportLoading } = useQuery<any>({
    queryKey: ['admin-sales-report', selectedBranchId],
    queryFn: () =>
      apiClient.get(`/admin/reports/sales?branchId=${selectedBranchId || ''}`),
    refetchInterval: 10000,
  });

  // Fetch 7-day Sales Trends
  const { data: salesTrends = [] } = useQuery<any[]>({
    queryKey: ['admin-sales-trends', selectedBranchId],
    queryFn: () =>
      apiClient.get(`/admin/reports/sales/trends?branchId=${selectedBranchId || ''}&days=7`),
    refetchInterval: 15000,
  });

  // Fetch All Recent Orders
  const { data: recentOrders = [], isLoading: isOrdersLoading } = useQuery<any[]>({
    queryKey: ['admin-orders', selectedBranchId],
    queryFn: () =>
      apiClient.get(`/orders/admin/all?branchId=${selectedBranchId || ''}`),
    refetchInterval: 5000,
  });

  const handleExportCsv = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    window.open(`${baseUrl}/admin/reports/sales/export?branchId=${selectedBranchId || ''}`, '_blank');
  };

  const maxDailyRevenue = Math.max(...salesTrends.map((t: any) => t.revenue || 0), 100);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 pb-20 space-y-6 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">Admin & Sales Dashboard</h1>
          <p className="text-xs text-zinc-500">รายงานยอดขาย ภาพรวมการดำเนินงาน และข้อมูลทางสถิติ</p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-white border border-zinc-300 text-xs font-semibold text-zinc-800 rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">ทุกสาขา (All Branches)</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => router.push('/admin/menu')}
          className="p-3.5 bg-white border border-emerald-200 hover:border-[#06C755] rounded-2xl flex items-center justify-between shadow-xs hover:shadow-sm transition text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#06C755] flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">จัดการเมนู & รูปภาพ</p>
              <p className="text-[10px] text-slate-400">ตกแต่งหน้าร้าน & แก้ไข</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => router.push('/admin/promotions')}
          className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-rose-300 hover:shadow-xs transition text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">โปรโมชั่น & คูปอง</p>
              <p className="text-[10px] text-slate-400">สร้างแคมเปญ & รหัส</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => router.push('/admin/payments')}
          className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-300 hover:shadow-xs transition text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">การชำระเงิน</p>
              <p className="text-[10px] text-slate-400">ตรวจสอบสลิป Slip2Go</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => router.push('/admin/customers')}
          className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-amber-300 hover:shadow-xs transition text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">ฐานลูกค้า</p>
              <p className="text-[10px] text-slate-400">บัญชี LINE & ที่อยู่</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => router.push('/kitchen')}
          className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-purple-300 hover:shadow-xs transition text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Kitchen KDS</p>
              <p className="text-[10px] text-slate-400">หน้าจอครัว & ออเดอร์</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Revenue */}
        <div className="p-4 bg-white border border-zinc-200/90 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">ยอดขายรวม</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-zinc-900">
            {formatPrice(report?.totalRevenue || 0)}
          </p>
          <span className="text-[10px] text-zinc-500">
            ค่าอาหาร {formatPrice(report?.totalFoodRevenue || 0)}
          </span>
        </div>

        {/* Completed Orders */}
        <div className="p-4 bg-white border border-zinc-200/90 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">ออเดอร์สำเร็จ</span>
            <ShoppingBag className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-zinc-900">
            {report?.completedOrdersCount || 0}
          </p>
          <span className="text-[10px] text-zinc-500">
            ทั้งหมด {report?.totalOrdersCount || 0} ออเดอร์
          </span>
        </div>

        {/* Total Delivery Fees */}
        <div className="p-4 bg-white border border-zinc-200/90 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">ค่าจัดส่งรวม</span>
            <Bike className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-zinc-900">
            {formatPrice(report?.totalDeliveryFees || 0)}
          </p>
          <span className="text-[10px] text-zinc-500">
            ส่วนลดคูปอง {formatPrice(report?.totalDiscounts || 0)}
          </span>
        </div>

        {/* Cancelled Orders */}
        <div className="p-4 bg-white border border-zinc-200/90 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">หมดอายุ / ยกเลิก</span>
            <Package className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-xl font-black text-zinc-900">
            {report?.cancelledOrdersCount || 0}
          </p>
          <span className="text-[10px] text-zinc-400">ไม่ชำระเงินในเวลา</span>
        </div>
      </div>

      {/* 7-Day Sales Trend Bar Chart */}
      <div className="p-5 bg-white border border-zinc-200 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-rose-600" />
            <span>แนวโน้มยอดขาย 7 วันล่าสุด (Sales Trends)</span>
          </h3>
          <span className="text-xs text-zinc-400">รายได้รายวัน</span>
        </div>

        <div className="flex items-end justify-between gap-2 h-40 pt-4 px-2">
          {salesTrends.map((t: any, idx: number) => {
            const heightPercent = Math.max(8, Math.round((t.revenue / maxDailyRevenue) * 100));
            const dayLabel = new Date(t.date).toLocaleDateString('th-TH', { weekday: 'short' });

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div className="text-[10px] font-bold text-zinc-600 opacity-0 group-hover:opacity-100 transition">
                  {formatPrice(t.revenue)}
                </div>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[40px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-xl group-hover:from-rose-700 group-hover:to-rose-500 transition shadow-sm"
                />
                <span className="text-[10px] font-medium text-zinc-500 mt-1">{dayLabel}</span>
                <span className="text-[9px] text-zinc-400">{t.orders} บิล</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 5 Best Sellers Leaderboard */}
      <div className="p-5 bg-white border border-zinc-200 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>5 อันดับเมนูขายดีที่สุด</span>
          </h3>
        </div>

        <div className="divide-y divide-zinc-100">
          {report?.topSellingProducts?.slice(0, 5).map((item: any, idx: number) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 font-black text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="font-bold text-zinc-800">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-rose-600">{item.quantity} จาน</span>
                <span className="text-zinc-400 ml-2">({formatPrice(item.revenue)})</span>
              </div>
            </div>
          ))}
          {(!report?.topSellingProducts || report.topSellingProducts.length === 0) && (
            <p className="text-xs text-zinc-400 py-4 text-center">ยังไม่มีข้อมูลยอดขาย</p>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="p-5 bg-white border border-zinc-200 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900">รายการออเดอร์ล่าสุด</h3>
          <span className="text-xs text-zinc-400">อัปเดตอัตโนมัติ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="pb-2">Order</th>
                <th className="pb-2">ลูกค้า</th>
                <th className="pb-2">สาขา</th>
                <th className="pb-2">ยอดรวม</th>
                <th className="pb-2">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentOrders.slice(0, 8).map((order: any) => (
                <tr key={order.id} className="hover:bg-zinc-50 transition">
                  <td className="py-2.5 font-mono font-bold text-rose-600">#{order.orderNo}</td>
                  <td className="py-2.5 text-zinc-800 font-medium">
                    {order.customerName}
                    <p className="text-[10px] text-zinc-400">{order.customerPhone}</p>
                  </td>
                  <td className="py-2.5 text-zinc-600">{order.branch?.name}</td>
                  <td className="py-2.5 font-bold text-zinc-900">{formatPrice(order.total)}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700">
                      {order.orderStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
