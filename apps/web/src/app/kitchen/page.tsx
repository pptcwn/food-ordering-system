'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ToggleLeft,
  ToggleRight,
  Flame,
  AlertCircle,
} from 'lucide-react';

export default function KitchenDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSoldOutModal, setShowSoldOutModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch Branches
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  // Default to first branch
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Fetch Kitchen Active Orders
  const { data: orders = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['kitchen-orders', selectedBranchId],
    queryFn: () => apiClient.get(`/orders/admin/all?branchId=${selectedBranchId}`),
    refetchInterval: 5000,
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

    socket.on(WS_EVENTS.KITCHEN_NEW_ORDER, (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      // Play ding audio alert
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
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });

  // Filter orders by kitchen stages
  const newOrders = orders.filter((o: any) => o.orderStatus === 'PAID' || o.orderStatus === 'CONFIRMED');
  const preparingOrders = orders.filter((o: any) => o.orderStatus === 'PREPARING');
  const readyOrders = orders.filter((o: any) => o.orderStatus === 'READY');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 flex flex-col font-sans">
      {/* Top Navbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/40">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-zinc-400">หน้าจอแสดงคิวอาหาร & ควบคุมสินค้าห้องครัว</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Branch Selector */}
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Sound Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-xl border transition ${
              audioEnabled
                ? 'bg-rose-600/20 border-rose-600 text-rose-400'
                : 'bg-zinc-900 border-zinc-700 text-zinc-500'
            }`}
            title="Toggle Sound"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Manage Sold Out Button */}
          <button
            onClick={() => setShowSoldOutModal(true)}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold rounded-xl transition flex items-center space-x-2"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span>จัดการสินค้าหมด (Sold Out)</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 flex-1 items-start">
        {/* Column 1: New / Paid Orders */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-4 flex flex-col space-y-3 min-h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-sm font-bold text-amber-400 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>ต้องทำ / จ่ายแล้ว ({newOrders.length})</span>
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
            {newOrders.map((order: any) => (
              <div
                key={order.id}
                className="p-4 bg-zinc-900 border border-amber-500/40 rounded-2xl space-y-3 shadow-lg hover:border-amber-400 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-400">#{order.orderNo}</span>
                    <p className="text-xs text-zinc-300 font-medium mt-0.5">
                      {order.customerName} ({order.orderType})
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold">
                    {order.orderStatus}
                  </span>
                </div>

                {/* Items */}
                <div className="bg-zinc-950/60 p-2.5 rounded-xl space-y-1.5 text-xs divide-y divide-zinc-800">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="pt-1 first:pt-0">
                      <div className="flex justify-between font-bold text-zinc-100">
                        <span>{item.productName}</span>
                        <span className="text-amber-400">x{item.quantity}</span>
                      </div>
                      {item.variantName && (
                        <p className="text-[11px] text-zinc-400">{item.variantName}</p>
                      )}
                      {item.modifiers?.length > 0 && (
                        <p className="text-[11px] text-zinc-400">
                          {item.modifiers.map((m: any) => m.modifierName).join(', ')}
                        </p>
                      )}
                      {item.specialNote && (
                        <p className="text-[11px] text-rose-400 italic">"{item.specialNote}"</p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    updateStatusMutation.mutate({ orderId: order.id, status: OrderStatus.PREPARING })
                  }
                  className="w-full py-3 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow hover:bg-amber-400 active:scale-[0.98] transition flex items-center justify-center space-x-1.5"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>เริ่มทำอาหาร (Start Cooking)</span>
                </button>
              </div>
            ))}
            {newOrders.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-12">ไม่มีออเดอร์ใหม่</p>
            )}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-4 flex flex-col space-y-3 min-h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-sm font-bold text-rose-400 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>กำลังปรุงอาหาร ({preparingOrders.length})</span>
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
            {preparingOrders.map((order: any) => (
              <div
                key={order.id}
                className="p-4 bg-zinc-900 border border-rose-500/50 rounded-2xl space-y-3 shadow-lg hover:border-rose-400 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-rose-400">#{order.orderNo}</span>
                    <p className="text-xs text-zinc-300 font-medium mt-0.5">{order.customerName}</p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-semibold">
                    กำลังทำ 🍳
                  </span>
                </div>

                {/* Items */}
                <div className="bg-zinc-950/60 p-2.5 rounded-xl space-y-1.5 text-xs divide-y divide-zinc-800">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="pt-1 first:pt-0">
                      <div className="flex justify-between font-bold text-zinc-100">
                        <span>{item.productName}</span>
                        <span className="text-rose-400">x{item.quantity}</span>
                      </div>
                      {item.variantName && (
                        <p className="text-[11px] text-zinc-400">{item.variantName}</p>
                      )}
                      {item.modifiers?.length > 0 && (
                        <p className="text-[11px] text-zinc-400">
                          {item.modifiers.map((m: any) => m.modifierName).join(', ')}
                        </p>
                      )}
                      {item.specialNote && (
                        <p className="text-[11px] text-rose-400 italic">"{item.specialNote}"</p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    updateStatusMutation.mutate({ orderId: order.id, status: OrderStatus.READY })
                  }
                  className="w-full py-3 bg-rose-600 text-white font-bold text-xs rounded-xl shadow hover:bg-rose-500 active:scale-[0.98] transition flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ปรุงเสร็จแล้ว / พร้อมส่ง (Mark Ready)</span>
                </button>
              </div>
            ))}
            {preparingOrders.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-12">ไม่มีรายการกำลังปรุง</p>
            )}
          </div>
        </div>

        {/* Column 3: Ready for Delivery / Pickup */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-4 flex flex-col space-y-3 min-h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>พร้อมจัดส่ง / รอรับ ({readyOrders.length})</span>
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
            {readyOrders.map((order: any) => (
              <div
                key={order.id}
                className="p-4 bg-zinc-900 border border-emerald-500/40 rounded-2xl space-y-3 shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-emerald-400">#{order.orderNo}</span>
                    <p className="text-xs text-zinc-300 font-medium mt-0.5">
                      {order.customerName} ({order.orderType})
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                    พร้อมส่ง 📦
                  </span>
                </div>

                <div className="text-xs text-zinc-400">
                  {order.orderType === 'DELIVERY' ? (
                    <p className="truncate">จุดส่ง: {order.deliveryAddressLine}</p>
                  ) : (
                    <p>ลูกค้ารับเองที่หน้าร้าน</p>
                  )}
                </div>

                {order.orderType === 'DELIVERY' ? (
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        orderId: order.id,
                        status: OrderStatus.OUT_FOR_DELIVERY,
                      })
                    }
                    className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 transition flex items-center justify-center space-x-1.5"
                  >
                    <Bike className="w-4 h-4" />
                    <span>ไรเดอร์ออกส่ง (Out For Delivery)</span>
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        orderId: order.id,
                        status: OrderStatus.DELIVERED,
                      })
                    }
                    className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 transition flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ลูกค้ารับอาหารแล้ว</span>
                  </button>
                )}
              </div>
            ))}
            {readyOrders.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-12">ไม่มีออเดอร์รอจัดส่ง</p>
            )}
          </div>
        </div>
      </div>

      {/* Realtime Sold-Out Toggle Modal */}
      {showSoldOutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-h-[80vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">จัดการสินค้าหมด (Sold-Out Control)</h3>
              </div>
              <button
                onClick={() => setShowSoldOutModal(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg"
              >
                ปิด
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 divide-y divide-zinc-800">
              {menuCategories.map((cat: any) => (
                <div key={cat.id} className="pt-3 first:pt-0 space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase">{cat.name}</span>
                  <div className="space-y-1.5">
                    {cat.products?.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-3 bg-zinc-950 rounded-xl flex items-center justify-between border border-zinc-800/80"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{p.name}</p>
                          <span className="text-xs text-rose-400">{formatPrice(p.basePrice)}</span>
                        </div>

                        <button
                          onClick={() =>
                            toggleAvailabilityMutation.mutate({
                              productId: p.id,
                              isAvailable: !p.isAvailable,
                            })
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                            p.isAvailable
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {p.isAvailable ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              <span>เปิดขายปกติ</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              <span>สินค้าหมด (Sold Out)</span>
                            </>
                          )}
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
