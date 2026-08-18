'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { OrderStatus } from '@food-ordering/types';
import {
  Bike,
  Phone,
  MapPin,
  CheckCircle2,
  Navigation,
  Clock,
  Camera,
  Image as ImageIcon,
  X,
  Package,
  Loader2,
  ArrowLeft,
  Store,
  ChevronRight,
} from 'lucide-react';

export default function DeliveryDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [confirmingOrder, setConfirmingOrder] = useState<any>(null);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ['delivery-orders', selectedBranchId],
    queryFn: () => apiClient.get(`/orders/admin/all?branchId=${selectedBranchId}`),
    refetchInterval: 4000,
  });

  // Start Delivery mutation
  const startDeliveryMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiClient.patch(`/orders/admin/${orderId}/status`, {
        status: OrderStatus.OUT_FOR_DELIVERY,
        changedBy: 'RIDER_STAFF',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    },
  });

  // Complete Delivery with Photo Proof
  const completeDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note?: string }) => {
      return apiClient.patch(`/orders/admin/${orderId}/status`, {
        status: OrderStatus.DELIVERED,
        changedBy: 'RIDER_STAFF',
        reason: note || 'จัดส่งเรียบร้อย',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      setConfirmingOrder(null);
      setProofImage(null);
      setProofPreview(null);
      setDeliveryNote('');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const deliveryOrders = orders.filter(
    (o: any) =>
      o.orderType === 'DELIVERY' &&
      (o.orderStatus === 'READY' || o.orderStatus === 'OUT_FOR_DELIVERY'),
  );

  return (
    <div className="flex-1 flex flex-col p-4 pb-20 space-y-4 max-w-lg mx-auto w-full min-h-screen bg-slate-50">
      {/* 1. Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs -mx-4 -mt-4 mb-2">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push('/admin')}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors btn-tactile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#06C755] flex items-center justify-center font-bold">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">คิวงานจัดส่ง (Rider Dispatch)</h1>
              <p className="text-[10px] text-slate-400">รายการอาหารที่พร้อมนำส่งลูกค้า</p>
            </div>
          </div>
        </div>

        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="bg-slate-100 border-none text-[11px] font-bold text-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#06C755]"
        >
          <option value="">ทุกสาขา</option>
          {branches.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </header>

      {/* 2. Order Jobs List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#06C755]" />
            <p className="text-xs">กำลังค้นหาคิวจัดส่ง...</p>
          </div>
        ) : deliveryOrders.length === 0 ? (
          <div className="py-16 px-4 bg-white rounded-2xl border border-slate-200/80 text-center shadow-xs">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#06C755] flex items-center justify-center mx-auto mb-2">
              <Bike className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">ยังไม่มีงานส่งในขณะนี้</h3>
            <p className="text-xs text-slate-500 max-w-[240px] mx-auto">
              เมื่อครัวปรุงอาหารเสร็จแล้ว รายการจะปรากฏที่นี่เพื่อส่งมอบให้คนขับ
            </p>
          </div>
        ) : (
          deliveryOrders.map((order: any) => {
            const isOut = order.orderStatus === 'OUT_FOR_DELIVERY';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-4 border shadow-xs space-y-3 relative overflow-hidden transition-all ${
                  isOut ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200/80'
                }`}
              >
                {/* Header status */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {order.customerName}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        #{order.orderNumber || order.id.slice(0, 6)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      เบอร์โทร: <span className="font-mono font-semibold text-slate-800">{order.customerPhone}</span>
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      isOut ? 'bg-emerald-50 text-[#06C755] border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isOut ? '🛵 กำลังวิ่งส่ง' : '📦 ครัวทำเสร็จแล้ว'}
                  </span>
                </div>

                {/* Delivery Address & Note */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#06C755] flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{order.deliveryAddress || 'จัดส่งตามพิกัดของลูกค้า'}</p>
                  </div>
                  {order.note && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                      โน้ต: {order.note}
                    </p>
                  )}
                </div>

                {/* Items preview */}
                <div className="text-xs text-slate-600 space-y-1">
                  {order.items?.map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[220px]">
                        {i.quantity}x {i.menuItem?.name || i.name}
                      </span>
                      <span className="font-semibold text-slate-900">{formatPrice(i.totalPrice || 0)}</span>
                    </div>
                  ))}
                </div>

                {/* Rider Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  {/* Call Customer Button */}
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors btn-tactile"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#06C755]" />
                    โทรหาลูกค้า
                  </a>

                  {/* Google Maps Shortcut */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLatitude || ''},${order.deliveryLongitude || ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors btn-tactile"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    เปิด Google Maps
                  </a>
                </div>

                {/* Delivery Progress CTA */}
                {!isOut ? (
                  <button
                    onClick={() => startDeliveryMutation.mutate(order.id)}
                    disabled={startDeliveryMutation.isPending}
                    className="w-full py-3 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile flex items-center justify-center gap-1.5"
                  >
                    <Bike className="w-4 h-4" />
                    <span>รับอาหารแล้ว (เริ่มออกเดินทาง)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmingOrder(order)}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ส่งอาหารถึงมือลูกค้าแล้ว (เสร็จสิ้น)</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Confirm Delivery Modal with Photo Capture */}
      {confirmingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">ยืนยันการจัดส่งสำเร็จ</h3>
              <button
                onClick={() => setConfirmingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              คุณได้ส่งมอบอาหารใหักับ <strong>{confirmingOrder.customerName}</strong> เรียบร้อยแล้ว
            </p>

            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="หมายเหตุ (เช่น วางไว้ที่โต๊ะล็อบบี้)"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />

            <button
              onClick={() =>
                completeDeliveryMutation.mutate({
                  orderId: confirmingOrder.id,
                  note: deliveryNote,
                })
              }
              disabled={completeDeliveryMutation.isPending}
              className="w-full py-3.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {completeDeliveryMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>ยืนยันปิดงาน</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
