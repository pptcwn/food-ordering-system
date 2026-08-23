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
  Utensils,
  Sparkles,
} from 'lucide-react';
import { SkeletonList } from '@/components/ui/skeleton';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: 'รอชำระเงิน', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  PAYMENT_VERIFYING: { label: 'กำลังตรวจสลิป', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  PAID: { label: 'ชำระเงินแล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  CONFIRMED: { label: 'รับออเดอร์แล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  PREPARING: { label: 'กำลังปรุงอาหาร', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  READY: { label: 'พร้อมจัดส่ง', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  OUT_FOR_DELIVERY: { label: 'กำลังจัดส่ง 🛵', color: 'text-[#06C755]', bg: 'bg-emerald-50 border-emerald-200' },
  DELIVERED: { label: 'จัดส่งแล้ว', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
  COMPLETED: { label: 'สำเร็จ', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
  CANCELLED: { label: 'ยกเลิก', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  EXPIRED: { label: 'หมดอายุ', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' },
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

  // Re-order Mutation
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
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen pb-24">
      {/* 1. Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <button
          onClick={() => router.push('/menu')}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors btn-tactile"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-slate-900">คำสั่งซื้อของฉัน</h1>
        <div className="w-9" />
      </header>

      {/* 2. Dual Segmented Tab Control (LINE MAN / Grab style) */}
      <div className="p-3 bg-white border-b border-slate-200/80 sticky top-[53px] z-20 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ACTIVE'
                ? 'bg-white text-[#06C755] shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            กำลังดำเนินการ
            {activeOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#06C755] text-white text-[10px] flex items-center justify-center font-bold">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            ประวัติทั้งหมด ({pastOrders.length})
          </button>
        </div>
      </div>

      {/* 3. Orders List */}
      <div className="p-3.5 space-y-3">
        {isLoading ? (
          <SkeletonList count={3} />
        ) : displayedOrders.length === 0 ? (
          <div className="py-16 px-4 bg-white rounded-2xl border border-slate-200/80 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#06C755] flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              {activeTab === 'ACTIVE' ? 'ไม่มีออเดอร์ที่กำลังดำเนินการ' : 'ยังไม่มีประวัติคำสั่งซื้อ'}
            </h3>
            <p className="text-xs text-slate-500 mb-5 max-w-[240px] mx-auto">
              สั่งอาหารอร่อยๆ ส่งตรงถึงหน้าบ้านของคุณได้ง่ายๆ ในไม่กี่ขั้นตอน
            </p>
            <button
              onClick={() => router.push('/menu')}
              className="px-6 py-2.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-full shadow-md transition-colors btn-tactile inline-flex items-center gap-1.5"
            >
              <Utensils className="w-3.5 h-3.5" />
              สั่งอาหารเลย
            </button>
          </div>
        ) : (
          displayedOrders.map((order) => {
            const statusConfig = STATUS_MAP[order.orderStatus] || STATUS_MAP.PENDING_PAYMENT;
            const isLive =
              order.orderStatus !== 'DELIVERED' &&
              order.orderStatus !== 'COMPLETED' &&
              order.orderStatus !== 'CANCELLED';

            return (
              <div
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-[#06C755]/50 transition-all cursor-pointer space-y-3 relative overflow-hidden"
              >
                {/* Active order side accent */}
                {isLive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#06C755]" />
                )}

                {/* Card Header: Store & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 truncate max-w-[180px]">
                        {order.branch?.name || 'ร้านอาหารหลัก'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        #{order.orderNo || order.id.slice(0, 8)} •{' '}
                        {new Date(order.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusConfig.bg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* Items preview */}
                <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700 space-y-1">
                  {order.items?.slice(0, 2).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[200px]">
                        {item.quantity}x {item.productName || item.menuItem?.name || item.name || 'อาหาร'}
                      </span>
                      <span className="font-mono text-slate-500">
                        {formatPrice(Number(item.subtotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 1)))}
                      </span>
                    </div>
                  ))}
                  {order.items?.length > 2 && (
                    <p className="text-[10px] text-slate-400 italic">
                      + อีก {order.items.length - 2} รายการ
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-400 block">ยอดรวม</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatPrice(order.total ?? order.totalAmount ?? 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/orders/${order.id}`);
                        }}
                        className="px-4 py-1.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-xs transition-colors btn-tactile flex items-center gap-1"
                      >
                        ติดตามสถานะ
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleReorder(e, order)}
                        disabled={reorderingId === order.id}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors btn-tactile flex items-center gap-1 disabled:opacity-50"
                      >
                        {reorderingId === order.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        สั่งซ้ำ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
