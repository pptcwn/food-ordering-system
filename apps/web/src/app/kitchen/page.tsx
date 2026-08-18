'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatPrice } from '@/lib/utils';
import { WS_EVENTS, OrderStatus } from '@food-ordering/types';
import {
  ChefHat,
  Bell,
  Clock,
  CheckCircle2,
  Package,
  Bike,
  Volume2,
  VolumeX,
  RefreshCw,
  Flame,
  AlertCircle,
  ArrowLeft,
  X,
  Utensils,
  Check,
} from 'lucide-react';

export default function KitchenDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSoldOutModal, setShowSoldOutModal] = useState(false);

  // Fetch Branches
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Fetch Kitchen Active Orders
  const { data: orders = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['kitchen-orders', selectedBranchId],
    queryFn: () => apiClient.get(`/orders/admin/all?branchId=${selectedBranchId}`),
    refetchInterval: 4000,
    enabled: !!selectedBranchId,
  });

  // Fetch Products for Sold-Out Toggle
  const { data: menuCategories = [] } = useQuery<any[]>({
    queryKey: ['admin-menu', selectedBranchId],
    queryFn: () => apiClient.get(`/menu?branchId=${selectedBranchId}`),
    enabled: showSoldOutModal && !!selectedBranchId,
  });

  // Realtime Socket listener
  useEffect(() => {
    if (!selectedBranchId) return;
    const socket = getSocket();
    socket.emit('join_kitchen', { branchId: selectedBranchId });

    socket.on(WS_EVENTS.KITCHEN_NEW_ORDER, () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      if (audioEnabled) {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        } catch (e) {}
      }
    });

    socket.on(WS_EVENTS.ORDER_STATUS_CHANGED, () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });

    return () => {
      socket.off(WS_EVENTS.KITCHEN_NEW_ORDER);
      socket.off(WS_EVENTS.ORDER_STATUS_CHANGED);
    };
  }, [selectedBranchId, audioEnabled, queryClient]);

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiClient.patch(`/orders/admin/${orderId}/status`, { status, changedBy: 'KITCHEN_STAFF' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
  });

  // Toggle Availability Mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
      apiClient.patch(`/admin/products/${productId}/availability`, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });

  const activeKitchenOrders = orders.filter(
    (o: any) =>
      o.orderStatus === 'PAID' ||
      o.orderStatus === 'CONFIRMED' ||
      o.orderStatus === 'PREPARING',
  );

  const readyOrders = orders.filter((o: any) => o.orderStatus === 'READY');

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 pb-20 bg-slate-900 text-slate-100 min-h-screen">
      {/* 1. Header with Audio toggle & Quick Branch Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors btn-tactile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>หน้าจอห้องครัว (Kitchen KDS)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className="text-xs text-slate-400">ระบบคิวทำอาหารแบบ Real-time พร้อมเสียงแจ้งเตือน</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          >
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              audioEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="เปิด/ปิดเสียงแจ้งเตือนออเดอร์ใหม่"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'เสียงเปิด' : 'เสียงปิด'}</span>
          </button>

          <button
            onClick={() => setShowSoldOutModal(true)}
            className="px-3.5 py-2 bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors btn-tactile"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>จัดการของหมด</span>
          </button>
        </div>
      </div>

      {/* 2. Live Order Columns */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-24 text-center text-slate-400">
            กำลังโหลดคิวทำอาหาร...
          </div>
        ) : activeKitchenOrders.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-slate-800/40 border border-slate-800 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">ยังไม่มีออเดอร์ในคิว</h3>
            <p className="text-xs text-slate-400">เมื่อมีลูกค้าสั่งอาหารและชำระเงิน รายการจะเด้งเข้าหน้านี้ทันที</p>
          </div>
        ) : (
          activeKitchenOrders.map((order: any) => {
            const isPreparing = order.orderStatus === 'PREPARING';

            return (
              <div
                key={order.id}
                className={`bg-slate-800 rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                  isPreparing ? 'border-emerald-500/60 ring-2 ring-emerald-500/20' : 'border-amber-500/60'
                }`}
              >
                {/* Card Header */}
                <div
                  className={`p-3.5 flex items-center justify-between text-white ${
                    isPreparing ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                >
                  <div>
                    <span className="text-xs font-mono font-black tracking-wider uppercase">
                      #{order.orderNumber || order.id.slice(0, 6)}
                    </span>
                    <p className="text-xs font-bold mt-0.5">
                      {order.customerName} ({order.orderType === 'DELIVERY' ? '🛵 จัดส่ง' : '🏪 รับที่ร้าน'})
                    </p>
                  </div>
                  <span className="text-[11px] font-extrabold bg-black/30 backdrop-blur-xs px-2.5 py-1 rounded-full">
                    {isPreparing ? 'กำลังปรุงอาหาร 🍳' : 'ออเดอร์ใหม่ ⚡'}
                  </span>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-2.5 flex-1 divide-y divide-slate-700/60">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded bg-slate-700 text-amber-300 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                          {item.quantity}x
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {item.menuItem?.name || item.name}
                          </h4>
                          {item.specialNote && (
                            <p className="text-xs text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded mt-1">
                              ⚠️ โน้ต: {item.specialNote}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {order.note && (
                    <div className="pt-2 mt-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700">
                      <span className="text-[10px] text-slate-400 block font-bold">หมายเหตุทั้งออเดอร์:</span>
                      <p className="text-xs text-amber-200">{order.note}</p>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-900/80 border-t border-slate-700/80 flex gap-2">
                  {!isPreparing ? (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          status: OrderStatus.PREPARING,
                        })
                      }
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors btn-tactile flex items-center justify-center gap-1.5"
                    >
                      <span>รับเข้าครัว (เริ่มปรุง)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          status: OrderStatus.READY,
                        })
                      }
                      className="w-full py-3 bg-[#06C755] hover:bg-[#05A848] text-white font-extrabold text-xs rounded-xl shadow-md transition-colors btn-tactile flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>ปรุงเสร็จแล้ว (พร้อมส่ง)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Sold Out Quick Toggle Modal */}
      {showSoldOutModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-800 text-white rounded-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">เปิด-ปิดของหมดในครัว (Sold-out)</h3>
              </div>
              <button
                onClick={() => setShowSoldOutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {menuCategories.map((cat: any) => (
                <div key={cat.id} className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cat.name}</h4>
                  <div className="space-y-1">
                    {cat.products?.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-900/60 rounded-xl flex items-center justify-between border border-slate-700/60"
                      >
                        <span className="text-xs font-bold text-slate-200">{p.name}</span>
                        <button
                          onClick={() =>
                            toggleAvailabilityMutation.mutate({
                              productId: p.id,
                              isAvailable: !p.isAvailable,
                            })
                          }
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                            p.isAvailable
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-emerald-500/20 hover:text-emerald-400'
                          }`}
                        >
                          {p.isAvailable ? '● พร้อมขาย' : '○ สินค้าหมด'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
