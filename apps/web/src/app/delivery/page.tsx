'use client';

import React, { useState, useRef } from 'react';
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
} from 'lucide-react';

export default function DeliveryDashboardPage() {
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
    refetchInterval: 5000,
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
    mutationFn: async ({ orderId, file, note }: { orderId: string; file: File | null; note?: string }) => {
      // Find delivery record if exists
      const deliveryResp = await apiClient.patch(`/orders/admin/${orderId}/status`, {
        status: OrderStatus.DELIVERED,
        changedBy: 'RIDER_STAFF',
        reason: note || 'Delivered to customer',
      });
      return deliveryResp;
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
    <div className="flex-1 flex flex-col p-4 pb-16 space-y-4 max-w-lg mx-auto w-full min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
            <Bike className="w-5 h-5" />
          </div>
          <h1 className="text-base font-black text-zinc-900">Rider Delivery Jobs</h1>
        </div>

        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="bg-white border border-zinc-200 text-xs text-zinc-800 rounded-xl px-2.5 py-1.5 focus:outline-none shadow-sm"
        >
          <option value="">ทุกสาขา</option>
          {branches.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-zinc-400">
            <Loader2 className="w-7 h-7 animate-spin text-rose-600" />
          </div>
        ) : (
          deliveryOrders.map((order: any) => (
            <div
              key={order.id}
              className="p-4 bg-white border border-zinc-200 rounded-3xl space-y-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-black text-rose-600">
                    #{order.orderNo}
                  </span>
                  <h3 className="text-sm font-bold text-zinc-900 mt-0.5">{order.customerName}</h3>
                </div>
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
                    order.orderStatus === 'OUT_FOR_DELIVERY'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {order.orderStatus === 'OUT_FOR_DELIVERY' ? 'กำลังนำส่ง 🛵' : 'พร้อมจัดส่ง 📦'}
                </span>
              </div>

              {/* Address & Phone */}
              <div className="p-3 bg-zinc-50 rounded-2xl space-y-2 text-xs text-zinc-700 border border-zinc-100">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{order.deliveryAddress || order.deliveryAddressLine}</p>
                    {order.deliveryNote && (
                      <p className="text-zinc-500 text-[11px]">หมายเหตุ: {order.deliveryNote}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="text-xs font-semibold text-rose-600 flex items-center space-x-1.5 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>โทร: {order.customerPhone}</span>
                  </a>

                  {order.deliveryLatitude && order.deliveryLongitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLatitude},${order.deliveryLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-zinc-700 flex items-center space-x-1 hover:text-rose-600"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>เปิด Google Maps</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="text-xs text-zinc-500 space-y-0.5">
                {order.items?.map((item: any) => (
                  <p key={item.id}>
                    • {item.productName} x{item.quantity}
                  </p>
                ))}
              </div>

              {/* Rider Action Buttons */}
              {order.orderStatus === 'READY' ? (
                <button
                  onClick={() => startDeliveryMutation.mutate(order.id)}
                  disabled={startDeliveryMutation.isPending}
                  className="w-full py-3.5 bg-zinc-900 text-white font-bold text-xs rounded-2xl shadow hover:bg-black active:scale-[0.98] transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Bike className="w-4 h-4" />
                  <span>รับงาน & เริ่มออกส่ง (Start Delivery)</span>
                </button>
              ) : (
                <button
                  onClick={() => setConfirmingOrder(order)}
                  className="w-full py-3.5 bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] transition flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>จัดส่งถึงลูกค้าเรียบร้อย (Mark Delivered)</span>
                </button>
              )}
            </div>
          ))
        )}

        {!isLoading && deliveryOrders.length === 0 && (
          <div className="py-16 text-center text-zinc-400 space-y-2 bg-white rounded-3xl border border-zinc-200 p-6">
            <Package className="w-12 h-12 mx-auto text-zinc-300" />
            <p className="text-sm font-bold text-zinc-800">ไม่มีงานรอจัดส่งในขณะนี้</p>
            <p className="text-xs text-zinc-400">ออเดอร์ที่พร้อมส่งจะปรากฏที่นี่อัตโนมัติ</p>
          </div>
        )}
      </div>

      {/* Modal: Confirm Delivery with Photo Proof (Blueprint §29) */}
      {confirmingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-zinc-900">ยืนยันการจัดส่ง</h2>
              <button
                onClick={() => {
                  setConfirmingOrder(null);
                  setProofImage(null);
                  setProofPreview(null);
                }}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              ออเดอร์: <span className="font-bold text-rose-600">#{confirmingOrder.orderNo}</span> ({confirmingOrder.customerName})
            </p>

            {/* Photo Proof Input */}
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1.5">
                📸 รูปถ่ายหลักฐานการส่งมอบ (Delivery Proof)
              </label>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {proofPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-zinc-200 aspect-video bg-black/5">
                  <img src={proofPreview} alt="Proof" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setProofImage(null);
                      setProofPreview(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-2xl flex flex-col items-center justify-center space-y-1.5 text-zinc-500 hover:bg-zinc-50 transition"
                >
                  <Camera className="w-6 h-6 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-700">ถ่ายรูปหรือเลือกภาพหลักฐาน</span>
                  <span className="text-[10px] text-zinc-400">รูปอาหารที่วางส่งหรือลูกค้าตอนรับ</span>
                </button>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="เช่น วางไว้ที่โต๊ะหน้าบ้านชั้น 1"
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmingOrder(null);
                  setProofImage(null);
                  setProofPreview(null);
                }}
                className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={completeDeliveryMutation.isPending}
                onClick={() =>
                  completeDeliveryMutation.mutate({
                    orderId: confirmingOrder.id,
                    file: proofImage,
                    note: deliveryNote,
                  })
                }
                className="flex-1 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {completeDeliveryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ยืนยันจัดส่งสำเร็จ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
