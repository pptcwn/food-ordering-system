'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Store,
  Bike,
  Loader2,
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: 'รอชำระเงิน', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  PAYMENT_VERIFYING: { label: 'กำลังตรวจสลิป', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  PAID: { label: 'ชำระเงินแล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  CONFIRMED: { label: 'รับออเดอร์แล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  PREPARING: { label: 'กำลังปรุงอาหาร', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  READY: { label: 'อาหารพร้อมแล้ว', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  OUT_FOR_DELIVERY: { label: 'กำลังจัดส่ง', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  DELIVERED: { label: 'จัดส่งแล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  COMPLETED: { label: 'สำเร็จ', color: 'text-zinc-700', bg: 'bg-zinc-100 border-zinc-200' },
  CANCELLED: { label: 'ยกเลิก', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  EXPIRED: { label: 'หมดอายุ', color: 'text-zinc-500', bg: 'bg-zinc-100 border-zinc-200' },
};

export default function CustomerOrdersHistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ['my-orders'],
    queryFn: () => apiClient.get('/orders/my-orders'),
    refetchInterval: 10000,
  });

  // Re-order Mutation: adds items from previous order back into active cart
  const reorderMutation = useMutation({
    mutationFn: async (order: any) => {
      for (const item of order.items) {
        await apiClient.post('/cart/items', {
          productId: item.productId,
          productVariantId: item.productVariantId || undefined,
          quantity: item.quantity,
          specialNote: item.specialNote || undefined,
          modifierIds: item.modifiers?.map((m: any) => m.modifierId) || [],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      router.push('/cart');
    },
    onSettled: () => {
      setReorderingId(null);
    },
  });

  const handleReorder = (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    setReorderingId(order.id);
    reorderMutation.mutate(order);
  };

  const activeOrders = orders.filter(
    (o) =>
      o.orderStatus !== 'DELIVERED' &&
      o.orderStatus !== 'COMPLETED' &&
      o.orderStatus !== 'CANCELLED' &&
      o.orderStatus !== 'EXPIRED',
  );

  const pastOrders = orders.filter(
    (o) =>
      o.orderStatus === 'DELIVERED' ||
      o.orderStatus === 'COMPLETED' ||
      o.orderStatus === 'CANCELLED' ||
      o.orderStatus === 'EXPIRED',
  );

  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : pastOrders;

  return (
    <div className="flex-1 flex flex-col p-4 pb-20 max-w-lg mx-auto w-full min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
        <button
          onClick={() => router.push('/menu')}
          className="w-9 h-9 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 hover:bg-zinc-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black text-zinc-900">ประวัติการสั่งซื้อ</h1>
        <div className="w-9" />
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-200/70 p-1 rounded-2xl mt-4">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ACTIVE'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          กำลังดำเนินการ ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'HISTORY'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          ประวัติคำสั่งซื้อ ({pastOrders.length})
        </button>
      </div>

      {/* Order List */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-rose-600" />
            <p className="text-xs">กำลังโหลดประวัติออเดอร์...</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-zinc-400 space-y-3 bg-white rounded-3xl border border-zinc-200 p-6">
            <ShoppingBag className="w-10 h-10 opacity-30" />
            <p className="text-xs font-medium text-center">
              {activeTab === 'ACTIVE'
                ? 'ไม่มีออเดอร์ที่กำลังดำเนินการ'
                : 'ยังไม่มีประวัติคำสั่งซื้อ'}
            </p>
            <button
              onClick={() => router.push('/menu')}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-rose-700"
            >
              สั่งอาหารเลย
            </button>
          </div>
        ) : (
          displayedOrders.map((order) => {
            const statusConfig = STATUS_MAP[order.orderStatus] || {
              label: order.orderStatus,
              color: 'text-zinc-700',
              bg: 'bg-zinc-100 border-zinc-200',
            };
            const isReordering = reorderingId === order.id;

            return (
              <div
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                className="p-4 bg-white border border-zinc-200 rounded-3xl shadow-sm space-y-3 cursor-pointer hover:border-zinc-300 transition"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-zinc-900">
                      #{order.orderNo}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>

                {/* Branch & Order Type */}
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" />
                    <span>{order.branch?.name || 'สาขาหลัก'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {order.orderType === 'DELIVERY' ? (
                      <Bike className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <Store className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span>{order.orderType === 'DELIVERY' ? 'เดลิเวอรี' : 'รับที่ร้าน'}</span>
                  </span>
                  <span>•</span>
                  <span>{new Date(order.createdAt).toLocaleDateString('th-TH')}</span>
                </div>

                {/* Items Summary */}
                <div className="text-xs text-zinc-700 bg-zinc-50 rounded-xl p-2.5 space-y-1">
                  {order.items?.slice(0, 2).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[220px]">
                        {item.productName} x{item.quantity}
                      </span>
                      <span className="font-medium">{formatPrice(Number(item.subtotal))}</span>
                    </div>
                  ))}
                  {order.items?.length > 2 && (
                    <p className="text-[10px] text-zinc-400 italic">
                      + อีก {order.items.length - 2} รายการ
                    </p>
                  )}
                </div>

                {/* Total & Re-order CTA */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                      ยอดสุทธิ
                    </span>
                    <span className="text-sm font-black text-rose-600">
                      {formatPrice(Number(order.total))}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleReorder(e, order)}
                    disabled={isReordering}
                    className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    {isReordering ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-600" />
                    )}
                    <span>สั่งซ้ำ</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
