'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatPrice } from '@/lib/utils';
import { WS_EVENTS, OrderStatus } from '@food-ordering/types';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  PackageCheck,
  QrCode,
  Upload,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';

const STATUS_STEPS = [
  { key: 'PENDING_PAYMENT', label: 'รอชำระเงิน', icon: Clock },
  { key: 'PAYMENT_VERIFYING', label: 'ตรวจสลิป', icon: QrCode },
  { key: 'PAID', label: 'ชำระแล้ว', icon: CheckCircle2 },
  { key: 'PREPARING', label: 'ครัวกำลังปรุง', icon: ChefHat },
  { key: 'READY', label: 'พร้อมส่ง', icon: PackageCheck },
  { key: 'OUT_FOR_DELIVERY', label: 'กำลังจัดส่ง', icon: Bike },
  { key: 'DELIVERED', label: 'จัดส่งสำเร็จ', icon: CheckCircle2 },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadMsg, setUploadMsg] = useState('');

  // Fetch Order
  const { data: order, isLoading } = useQuery<any>({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.get(`/orders/${orderId}`),
    refetchInterval: (query) => {
      const status = query.state.data?.orderStatus;
      return status === 'DELIVERED' || status === 'COMPLETED' || status === 'CANCELLED' ? false : 3000;
    },
  });

  // Realtime Socket listener
  useEffect(() => {
    const socket = getSocket();
    if (order?.branchId) {
      socket.emit('join_branch', { branchId: order.branchId });
    }

    socket.on(WS_EVENTS.ORDER_STATUS_CHANGED, (payload: any) => {
      if (payload.orderId === orderId) {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
    });

    return () => {
      socket.off(WS_EVENTS.ORDER_STATUS_CHANGED);
    };
  }, [order?.branchId, orderId, queryClient]);

  // Upload Slip Mutation
  const uploadSlipMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('slip', file);
      return apiClient.post(`/orders/${orderId}/payment/slip`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res: any) => {
      setUploadMsg('อัปโหลดสลิปเรียบร้อยแล้ว ระบบกำลังตรวจสอบด้วย Slip2Go');
      setSelectedFile(null);
      setPreviewUrl('');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (err: any) => {
      setUploadMsg(err.message || 'ไม่สามารถอัปโหลดสลิปได้');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadMsg('');
    }
  };

  const handleUploadSlip = () => {
    if (!selectedFile) return;
    uploadSlipMutation.mutate(selectedFile);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
        <h2 className="text-base font-bold text-zinc-900">ไม่พบข้อมูลออเดอร์</h2>
      </div>
    );
  }

  // Calculate current step index
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.orderStatus);

  return (
    <div className="flex-1 flex flex-col p-4 pb-12 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <button
          onClick={() => router.push('/menu')}
          className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 hover:bg-zinc-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-xs text-zinc-400">เลขออเดอร์</p>
          <h1 className="text-sm font-bold text-zinc-900 font-mono">#{order.orderNo}</h1>
        </div>
        <div className="w-9" />
      </div>

      {/* Status Timeline Card */}
      <div className="p-4 bg-zinc-900 text-white rounded-3xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400">สถานะออเดอร์</span>
          <span className="px-3 py-1 bg-rose-600/90 text-white text-xs font-bold rounded-full">
            {order.orderStatus}
          </span>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-4 gap-1 pt-2">
          {['รอชำระ', 'ห้องครัว', 'กำลังส่ง', 'สำเร็จ'].map((label, idx) => {
            const isDone =
              (idx === 0 && (order.orderStatus === 'PAID' || order.orderStatus === 'PAYMENT_VERIFYING' || order.orderStatus === 'PREPARING' || order.orderStatus === 'READY' || order.orderStatus === 'OUT_FOR_DELIVERY' || order.orderStatus === 'DELIVERED')) ||
              (idx === 1 && (order.orderStatus === 'PREPARING' || order.orderStatus === 'READY' || order.orderStatus === 'OUT_FOR_DELIVERY' || order.orderStatus === 'DELIVERED')) ||
              (idx === 2 && (order.orderStatus === 'OUT_FOR_DELIVERY' || order.orderStatus === 'DELIVERED')) ||
              (idx === 3 && order.orderStatus === 'DELIVERED');

            return (
              <div key={label} className="text-center space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isDone ? 'bg-rose-500' : 'bg-zinc-800'
                  }`}
                />
                <span className={`text-[10px] ${isDone ? 'text-white font-bold' : 'text-zinc-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment & Slip Upload Section (if Pending / Verifying / Failed) */}
      {(order.orderStatus === 'PENDING_PAYMENT' ||
        order.orderStatus === 'PAYMENT_VERIFYING' ||
        order.orderStatus === 'PAYMENT_FAILED') && (
        <div className="p-5 bg-white border border-zinc-200 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-zinc-900">ชำระเงินผ่าน PromptPay</h3>
              <p className="text-xs text-zinc-500">สแกน QR Code แล้วแนบสลิปด้านล่าง</p>
            </div>
            <span className="text-base font-bold text-rose-600">{formatPrice(order.total)}</span>
          </div>

          {/* QR Code Demo / Mock Image */}
          <div className="p-4 bg-zinc-50 rounded-2xl flex flex-col items-center justify-center border border-zinc-100">
            <div className="w-44 h-44 bg-white p-2 border border-zinc-200 rounded-xl flex items-center justify-center shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020101021129370016A000000677010111011300668123456785802TH5303764540${order.total}5802TH6304`}
                alt="PromptPay QR"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              พร้อมเพย์: {order.branch?.paymentReceiverValue || '081-234-5678'} ({order.branch?.paymentReceiverName || 'ร้านอาหาร'})
            </p>
          </div>

          {/* Upload Slip Box */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-zinc-800 uppercase">
              แนบสลิปโอนเงิน (Slip Verification)
            </label>

            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 flex items-center justify-center p-2">
                <img src={previewUrl} alt="Slip preview" className="max-h-48 rounded-lg object-contain" />
              </div>
            ) : (
              <label className="border-2 border-dashed border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-rose-500 hover:bg-rose-50/20 transition">
                <Upload className="w-8 h-8 text-zinc-400 mb-1" />
                <span className="text-xs font-semibold text-zinc-700">คลิกเพื่อเลือกรูปภาพสลิป</span>
                <span className="text-[11px] text-zinc-400">รองรับ JPG, PNG, WebP (สูงสุด 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}

            {uploadMsg && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                {uploadMsg}
              </p>
            )}

            {selectedFile && (
              <button
                onClick={handleUploadSlip}
                disabled={uploadSlipMutation.isPending}
                className="w-full py-3.5 bg-rose-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-rose-700 active:scale-[0.98] transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {uploadSlipMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังตรวจสลิปผ่าน Slip2Go...</span>
                  </>
                ) : (
                  <span>ส่งสลิปเพื่อตรวจสอบ</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Order Items Breakdown */}
      <div className="p-4 bg-white border border-zinc-200 rounded-3xl space-y-3 shadow-sm">
        <h3 className="text-xs font-bold text-zinc-800 uppercase">รายการที่สั่ง</h3>
        <div className="divide-y divide-zinc-100">
          {order.items?.map((item: any) => (
            <div key={item.id} className="py-2.5 flex justify-between text-xs">
              <div>
                <span className="font-semibold text-zinc-900">
                  {item.productName} x{item.quantity}
                </span>
                {item.variantName && (
                  <p className="text-zinc-400 text-[11px]">{item.variantName}</p>
                )}
                {item.modifiers?.length > 0 && (
                  <p className="text-zinc-400 text-[11px]">
                    {item.modifiers.map((m: any) => m.modifierName).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-bold text-zinc-900">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-100 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-zinc-500">
            <span>ราคารวมอาหาร</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>ค่าส่ง</span>
            <span>{formatPrice(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1">
            <span>ยอดชำระ</span>
            <span className="text-rose-600">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
