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
  Phone,
  MessageCircle,
  MapPin,
  Store,
  Receipt,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { title: string; subtitle: string; icon: any; step: number; color: string; badgeBg: string; badgeText: string }> = {
  PENDING_PAYMENT: {
    title: 'รอการชำระเงิน',
    subtitle: 'กรุณาสแกน QR Code หรืออัปโหลดสลิปเพื่อยืนยันออเดอร์',
    icon: Clock,
    step: 1,
    color: 'from-amber-500 to-orange-500',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700',
  },
  PAYMENT_VERIFYING: {
    title: 'กำลังตรวจสอบสลิป...',
    subtitle: 'ระบบกำลังตรวจสอบยอดเงินด้วย Slip2Go สักครู่ครับ',
    icon: FileCheck,
    step: 2,
    color: 'from-blue-500 to-indigo-600',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
  },
  PAID: {
    title: 'ชำระเงินสำเร็จแล้ว',
    subtitle: 'ร้านค้ารับออเดอร์แล้ว กำลังส่งรายการเข้าครัว',
    icon: CheckCircle2,
    step: 2,
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  CONFIRMED: {
    title: 'ร้านค้ารับออเดอร์แล้ว',
    subtitle: 'กำลังเตรียมจัดคิวเข้าครัว',
    icon: Store,
    step: 2,
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  PREPARING: {
    title: 'ร้านกำลังปรุงอาหารของคุณ 🍳',
    subtitle: 'เชฟกำลังปรุงอาหารสดใหม่ตามคิวของคุณ',
    icon: ChefHat,
    step: 3,
    color: 'from-emerald-600 to-green-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  READY: {
    title: 'อาหารปรุงเสร็จแล้ว 📦',
    subtitle: 'แพ็กอาหารเรียบร้อย พร้อมส่งมอบให้ไรเดอร์',
    icon: PackageCheck,
    step: 4,
    color: 'from-emerald-600 to-green-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  OUT_FOR_DELIVERY: {
    title: 'ไรเดอร์กำลังนำอาหารไปส่ง 🛵',
    subtitle: 'คนขับกำลังเดินทางไปยังจุดหมายของคุณ',
    icon: Bike,
    step: 5,
    color: 'from-[#06C755] to-[#04943E]',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  DELIVERED: {
    title: 'จัดส่งอาหารสำเร็จแล้ว 🎉',
    subtitle: 'ขอให้อร่อยกับมื้ออาหารของคุณ ขอบคุณที่ใช้บริการครับ',
    icon: CheckCircle2,
    step: 6,
    color: 'from-emerald-600 to-teal-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  CANCELLED: {
    title: 'ออเดอร์ถูกยกเลิก',
    subtitle: 'รายการนี้ถูกยกเลิกแล้ว หากมีข้อสงสัยติดต่อฝ่ายบริการลูกค้า',
    icon: AlertCircle,
    step: 0,
    color: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
  },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadMsg, setUploadMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const isDevelopmentDemo = process.env.NEXT_PUBLIC_DEV_DEMO_ENABLED === 'true';

  // Fetch Order
  const { data: order, isLoading, isError } = useQuery<any>({
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
    onSuccess: () => {
      setUploadMsg({ text: 'อัปโหลดสลิปสำเร็จ! ระบบกำลังตรวจสอบยอดเงินอัตโนมัติ' });
      setSelectedFile(null);
      setPreviewUrl('');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (err: any) => {
      setUploadMsg({ text: err?.message || 'ไม่สามารถอัปโหลดสลิปได้ กรุณาลองใหม่อีกครั้ง', isError: true });
    },
  });

  const simulatePaymentMutation = useMutation({
    mutationFn: () => apiClient.post(`/orders/${orderId}/payment/dev/simulate`),
    onSuccess: () => {
      setUploadMsg({ text: 'ยืนยันการชำระเงินเดโมแล้ว ออเดอร์ถูกส่งเข้าครัว' });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (err: any) => {
      setUploadMsg({ text: err?.message || 'ไม่สามารถจำลองการชำระเงินได้', isError: true });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadMsg(null);
    }
  };

  const copyOrderRef = () => {
    navigator.clipboard.writeText(order?.orderNumber || orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[80vh]">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-[#06C755] animate-spin" />
        </div>
        <p className="text-slate-600 font-medium">กำลังโหลดข้อมูลคำสั่งซื้อ...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[80vh]">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบคำสั่งซื้อนี้</h2>
        <p className="text-slate-500 text-sm mb-6">คำสั่งซื้ออาจถูกลบหรือลิงก์ไม่ถูกต้อง</p>
        <button
          onClick={() => router.push('/menu')}
          className="px-6 py-2.5 bg-[#06C755] hover:bg-[#05A848] text-white font-semibold rounded-full shadow-md btn-tactile"
        >
          กลับไปหน้าเมนู
        </button>
      </div>
    );
  }

  const currentStatus = order.orderStatus || 'PENDING_PAYMENT';
  const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING_PAYMENT;
  const isPendingPayment = currentStatus === 'PENDING_PAYMENT';
  const canSimulatePayment = isDevelopmentDemo && (currentStatus === 'PAYMENT_VERIFYING' || currentStatus === 'PAYMENT_FAILED');
  const isDelivered = currentStatus === 'DELIVERED';
  const isOutForDelivery = currentStatus === 'OUT_FOR_DELIVERY' || currentStatus === 'READY';

  return (
    <div className="flex-1 flex flex-col bg-slate-50 pb-28">
      {/* 1. Sticky Top Navigation Bar (LINE MAN style) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <button
          onClick={() => router.push('/orders')}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors btn-tactile"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            ติดตามออเดอร์
          </h1>
          <button
            onClick={copyOrderRef}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 font-mono tracking-tight"
          >
            #{order.orderNumber || orderId.slice(0, 8)}
            <Copy className="w-2.5 h-2.5" />
            {copied && <span className="text-emerald-600 font-medium">คัดลอกแล้ว!</span>}
          </button>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['order', orderId] })}
          className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#06C755] transition-colors btn-tactile"
          title="รีเฟรชสถานะ"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </header>

      {/* 2. Hero Live Status Banner (LINE MAN / Grab emerald gradient) */}
      <div className={`bg-gradient-to-br ${statusInfo.color} text-white p-5 pt-6 pb-7 shadow-md relative overflow-hidden`}>
        {/* Subtle background graphics */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute right-4 top-4 opacity-15 pointer-events-none">
          <statusInfo.icon className="w-24 h-24 text-white" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-white mb-3">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {currentStatus === 'OUT_FOR_DELIVERY' ? 'กำลังจัดส่งด่วน' : 'สถานะสด'}
          </div>

          <h2 className="text-xl font-bold text-white mb-1.5 flex items-center gap-2">
            {statusInfo.title}
          </h2>
          <p className="text-white/90 text-xs font-normal leading-relaxed max-w-[320px]">
            {statusInfo.subtitle}
          </p>

          {/* Delivery ETA Badge */}
          {!isDelivered && currentStatus !== 'CANCELLED' && (
            <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
              <span className="text-white/80">เวลาจัดส่งโดยประมาณ:</span>
              <span className="font-bold bg-white text-slate-900 px-3 py-0.5 rounded-full text-xs shadow-xs">
                {currentStatus === 'OUT_FOR_DELIVERY' ? '10-15 นาที' : '20-30 นาที'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Live Progress Stepper (4-Step Pipeline) */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-4 mb-3 shadow-xs">
        <div className="flex items-center justify-between relative">
          {/* Background connect line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
          
          {[
            { step: 1, label: 'สั่งซื้อ', icon: QrCode },
            { step: 2, label: 'รับออเดอร์', icon: Store },
            { step: 3, label: 'ปรุงอาหาร', icon: ChefHat },
            { step: 5, label: 'กำลังส่ง', icon: Bike },
            { step: 6, label: 'สำเร็จ', icon: CheckCircle2 },
          ].map((s, idx) => {
            const isCompleted = statusInfo.step >= s.step;
            const isCurrent = statusInfo.step === s.step || (s.step === 5 && statusInfo.step === 4);

            return (
              <div key={idx} className="flex flex-col items-center relative z-10 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#06C755] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  } ${isCurrent ? 'ring-4 ring-emerald-100 scale-110' : ''}`}
                >
                  <s.icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-medium text-center ${
                    isCompleted ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3.5 space-y-3">
        {/* 4. Simulated Rider Card (When Order is Ready or Out for Delivery) */}
        {isOutForDelivery && (
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#06C755]/10 border-2 border-[#06C755] flex items-center justify-center text-[#06C755]">
                    <Bike className="w-6 h-6" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#06C755] border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">
                    ✓
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">คนขับ: คุณสมชาย มุ่งมั่น</h3>
                    <span className="text-[11px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium border border-amber-200/60">
                      ⭐ 4.9
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Honda Wave 110i (1กข 8924 กทม.)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <a
                href="tel:0812345678"
                className="flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#06C755] font-semibold text-xs rounded-xl transition-colors btn-tactile"
              >
                <Phone className="w-3.5 h-3.5" />
                โทรหาคนขับ
              </a>
              <button
                onClick={() => alert('เปิดการสนทนากับคนขับ')}
                className="flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors btn-tactile"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                ส่งข้อความ
              </button>
            </div>
          </div>
        )}

        {/* 5. PromptPay QR Code & Slip Upload Card (When Pending Payment) */}
        {isPendingPayment && (
          <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                  TH
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Thai QR Payment / พร้อมเพย์</h3>
                  <p className="text-[11px] text-slate-500">สแกนชำระผ่าน Mobile Banking ทุกธนาคาร</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#06C755] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                ฟรีค่าธรรมเนียม
              </span>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center py-4">
              <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-sm mb-3 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021129370016A000000677010111011300668123456785802TH5303764540${Number(order.totalAmount || 0).toFixed(2)}6304`}
                  alt="PromptPay QR Code"
                  className="w-44 h-44 object-contain"
                />
                <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
                  <span className="text-[9px] bg-slate-900/90 text-white px-2 py-0.5 rounded-full font-mono">
                    PromptPay Official
                  </span>
                </div>
              </div>

              <div className="text-center mb-4">
                <span className="text-xs text-slate-500 block mb-0.5">ยอดชำระสุทธิ</span>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formatPrice(order.totalAmount || 0)}
                </span>
              </div>

              {/* Slip Upload Box */}
              <div className="w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#06C755] rounded-xl p-4 transition-colors">
                <input
                  type="file"
                  id="slip-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Slip preview"
                      className="w-32 h-44 object-cover rounded-lg border border-slate-200 shadow-xs"
                    />
                    <div className="flex gap-2 w-full">
                      <label
                        htmlFor="slip-input"
                        className="flex-1 text-center py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                      >
                        เปลี่ยนรูป
                      </label>
                      <button
                        onClick={() => selectedFile && uploadSlipMutation.mutate(selectedFile)}
                        disabled={uploadSlipMutation.isPending}
                        className="flex-2 flex items-center justify-center gap-1.5 py-2 bg-[#06C755] hover:bg-[#05A848] text-white text-xs font-bold rounded-lg shadow-sm transition-colors btn-tactile disabled:opacity-50"
                      >
                        {uploadSlipMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        ยืนยันและส่งสลิป
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="slip-input"
                    className="flex flex-col items-center justify-center cursor-pointer py-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#06C755] flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      แนบหลักฐานการโอนเงิน (สลิป)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      ระบบตรวจสลิปอัตโนมัติ 24 ชม. ด้วย AI Slip2Go
                    </span>
                  </label>
                )}

                {uploadMsg && (
                  <div
                    className={`mt-2.5 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                      uploadMsg.isError
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {uploadMsg.isError ? (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{uploadMsg.text}</span>
                  </div>
                )}
              </div>

              {canSimulatePayment && (
                <button
                  type="button"
                  onClick={() => simulatePaymentMutation.mutate()}
                  disabled={simulatePaymentMutation.isPending}
                  className="mt-3 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {simulatePaymentMutation.isPending ? 'กำลังยืนยันเดโม...' : 'ยืนยันชำระเงินเดโม (เฉพาะ Development)'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 6. Delivery Address & Store Details Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
          {/* Restaurant Section */}
          <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-slate-900 truncate">
                {order.branch?.name || 'ร้านอาหารหลัก (สาขาใหญ่)'}
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {order.branch?.address || 'กรุงเทพมหานคร'}
              </p>
            </div>
          </div>

          {/* Delivery Location Section */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#06C755] flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">ที่อยู่จัดส่งของคุณ</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                  {order.orderType === 'DELIVERY' ? 'ส่งถึงที่' : 'รับที่ร้าน'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {order.deliveryAddress || 'จัดส่งตามที่อยู่ที่ระบุในระบบ'}
              </p>
              {order.customerPhone && (
                <p className="text-[11px] text-slate-500 mt-1">
                  เบอร์โทร: <span className="font-mono text-slate-700">{order.customerPhone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 7. Itemized Receipt Breakdown (Grab / LINE MAN style) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-sm text-slate-900">รายการอาหารที่สั่ง</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {order.items?.length || 0} รายการ
            </span>
          </div>

          <div className="divide-y divide-slate-100 py-1">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <span className="w-5 h-5 rounded bg-emerald-50 text-[#06C755] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.quantity}x
                  </span>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      {item.menuItem?.name || item.name || 'รายการอาหาร'}
                    </h4>
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {typeof item.selectedOptions === 'string'
                          ? item.selectedOptions
                          : JSON.stringify(item.selectedOptions).replace(/[{"}]/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900">
                  {formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Summary */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>ยอดรวมค่าอาหาร</span>
              <span>{formatPrice(order.subtotal || order.totalAmount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าจัดส่ง</span>
              <span className="text-[#06C755] font-semibold">
                {order.deliveryFee ? formatPrice(order.deliveryFee) : '฿0 (โปรโมชั่นฟรี)'}
              </span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>ส่วนลดโปรโมชั่น</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 text-sm font-extrabold text-slate-900">
              <span>ยอดชำระทั้งหมด</span>
              <span className="text-base text-[#06C755]">
                {formatPrice(order.totalAmount || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* 8. Help & Security Footer Banner */}
        <div className="flex items-center justify-center gap-2 py-3 text-slate-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ระบบสั่งอาหารปลอดภัย ได้รับการคุ้มครองตามมาตรฐาน</span>
        </div>
      </div>

      {/* 9. Fixed Bottom Floating Action Bar */}
      <div className="fixed bottom-0 inset-x-0 max-w-[480px] mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3.5 shadow-lg z-40 flex gap-2">
        <button
          onClick={() => router.push('/menu')}
          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors btn-tactile flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          สั่งอาหารเพิ่ม
        </button>
        <button
          onClick={() => router.push('/orders')}
          className="flex-1 py-3 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile flex items-center justify-center gap-1.5"
        >
          ประวัติคำสั่งซื้อ
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
