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
  Tag,
  CreditCard,
  ChevronRight,
  BarChart3,
  Calendar,
  Utensils,
  Settings,
  ReceiptText,
} from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'month' | 'custom'>('7d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Compute startDate and endDate from preset
  const { queryStartDate, queryEndDate } = React.useMemo(() => {
    const now = new Date();
    if (dateRange === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { queryStartDate: start.toISOString(), queryEndDate: end.toISOString() };
    }
    if (dateRange === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { queryStartDate: start.toISOString(), queryEndDate: now.toISOString() };
    }
    if (dateRange === '30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { queryStartDate: start.toISOString(), queryEndDate: now.toISOString() };
    }
    if (dateRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { queryStartDate: start.toISOString(), queryEndDate: end.toISOString() };
    }
    if (dateRange === 'custom') {
      const start = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined;
      const end = endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : undefined;
      return { queryStartDate: start, queryEndDate: end };
    }
    return { queryStartDate: undefined, queryEndDate: undefined };
  }, [dateRange, startDate, endDate]);

  // Fetch Branches
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  // Fetch Sales Summary Report
  const { data: report, isLoading: isReportLoading } = useQuery<any>({
    queryKey: ['admin-sales-report', selectedBranchId, queryStartDate, queryEndDate],
    queryFn: () =>
      apiClient.get('/admin/reports/sales', {
        params: {
          branchId: selectedBranchId || undefined,
          startDate: queryStartDate,
          endDate: queryEndDate,
        },
      }),
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

  const [adminUser, setAdminUser] = React.useState<any>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_user');
      if (stored) {
        try {
          setAdminUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
    router.push('/admin/login');
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
          {adminUser ? (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="w-6 h-6 rounded-full bg-[#EAF8F1] text-[#1F5D45] font-black text-[10px] flex items-center justify-center">
                A
              </div>
              <span className="text-xs font-bold text-slate-800">{adminUser.name || 'Admin'}</span>
              <button
                onClick={handleLogout}
                className="text-[11px] text-rose-600 hover:underline font-bold ml-1 pl-1 border-l border-slate-200"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/admin/login')}
              className="px-3.5 py-2 bg-[#00A86B] hover:bg-[#00925D] text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              เข้าสู่ระบบ (Sign In)
            </button>
          )}

          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-white border border-zinc-300 text-xs font-semibold text-zinc-800 rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]"
          >
            <option value="">ทุกสาขา (All Branches)</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold mr-1">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>ช่วงเวลา:</span>
          </div>
          {[
            { id: 'today', label: 'วันนี้' },
            { id: '7d', label: '7 วัน' },
            { id: '30d', label: '30 วัน' },
            { id: 'month', label: 'เดือนนี้' },
            { id: 'custom', label: 'กำหนดเอง' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDateRange(preset.id as 'today' | '7d' | '30d' | 'month' | 'custom')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                dateRange === preset.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-zinc-400 font-medium">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      {isReportLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : (
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
      )}

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
