'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useFeedback } from '@/components/ui/feedback-provider';
import { WS_EVENTS } from '@food-ordering/types';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Copy,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  XCircle,
} from 'lucide-react';

import { OrderStatusHero } from '@/components/customer/order-status-hero';
import { OrderProgressStepper } from '@/components/customer/order-progress-stepper';
import { RiderInfoCard } from '@/components/customer/rider-info-card';
import { PromptPayQrCard } from '@/components/customer/promptpay-qr-card';
import { OrderLocationCard } from '@/components/customer/order-location-card';
import { OrderReceiptSummary } from '@/components/customer/order-receipt-summary';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify, confirm } = useFeedback();
  const orderId = params.id as string;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadMsg, setUploadMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const isDevelopmentDemo = process.env.NEXT_PUBLIC_DEV_DEMO_ENABLED === 'true';

  const { data: order, isLoading, isError } = useQuery<any>({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.get(`/orders/${orderId}`),
    refetchInterval: (query) => {
      const status = query.state.data?.orderStatus;
      return status === 'DELIVERED' || status === 'COMPLETED' || status === 'CANCELLED' ? false : 3000;
    },
  });

  const {
    data: qrData,
    isError: isQrError,
    error: qrError,
    refetch: refetchQr,
  } = useQuery<any>({
    queryKey: ['order', orderId, 'qr'],
    queryFn: () => apiClient.get(`/orders/${orderId}/payment/qr`),
    enabled: !!order && ['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(order.orderStatus),
  });

  useEffect(() => {
    const socket = getSocket();
    if (order?.branchId) {
      socket.emit('join_order', { orderId: order.id });
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

  const cancelOrderMutation = useMutation({
    mutationFn: (reason: string) => apiClient.patch(`/orders/${orderId}/cancel`, { reason }),
    onSuccess: () => {
      notify('ยกเลิกคำสั่งซื้อสำเร็จ', 'success');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (err: any) => {
      notify(err.message || 'ไม่สามารถยกเลิกคำสั่งซื้อได้', 'error');
    }
  });

  const handleCancelOrder = async () => {
    const confirmed = await confirm({
      title: 'ยกเลิกคำสั่งซื้อ?',
      description: 'เมื่อยกเลิกแล้วจะไม่สามารถกู้คืนได้',
      destructive: true,
    });
    if (confirmed) {
      cancelOrderMutation.mutate('Customer requested cancellation');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadMsg(null);
    }
  };

  const copyOrderRef = () => {
    navigator.clipboard.writeText(order?.orderNo || orderId);
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
  const isPendingPayment = currentStatus === 'PENDING_PAYMENT';
  const isPaymentFailed = currentStatus === 'PAYMENT_FAILED';
  const canUploadSlip = isPendingPayment || isPaymentFailed;
  const paymentFailureReason = isPaymentFailed
    ? order.statusLogs?.find((log: any) => log.toStatus === 'PAYMENT_FAILED')?.reason
    : null;
  const canSimulatePayment = isDevelopmentDemo && (currentStatus === 'PAYMENT_VERIFYING' || currentStatus === 'PAYMENT_FAILED');
  const isOutForDelivery = currentStatus === 'OUT_FOR_DELIVERY' || currentStatus === 'READY';
  const deliveryStaff = order.delivery?.deliveryStaff;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 pb-28">
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
            #{order.orderNo || orderId.slice(0, 8)}
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

      <OrderStatusHero status={currentStatus} orderType={order.orderType} isDelivery={order.orderType === 'DELIVERY'} />

      <OrderProgressStepper currentStatus={currentStatus} orderType={order.orderType} />

      <div className="px-3.5 space-y-3">
        <RiderInfoCard rider={deliveryStaff} isVisible={isOutForDelivery} />

        {canUploadSlip && (
          <PromptPayQrCard
            order={order}
            qrData={qrData}
            isQrError={isQrError}
            qrError={qrError}
            refetchQr={refetchQr}
            isPaymentFailed={isPaymentFailed}
            paymentFailureReason={paymentFailureReason}
            canSimulatePayment={canSimulatePayment}
            onUploadSlip={(file) => uploadSlipMutation.mutate(file)}
            onSimulatePayment={() => simulatePaymentMutation.mutate()}
            isUploading={uploadSlipMutation.isPending}
            isSimulating={simulatePaymentMutation.isPending}
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            uploadMsg={uploadMsg}
            onFileChange={handleFileChange}
          />
        )}

        <OrderLocationCard
          branch={order.branch}
          customerAddress={order.deliveryAddress}
          customerPhone={order.customerPhone}
          orderType={order.orderType}
        />

        <OrderReceiptSummary
          items={order.items}
          subtotal={order.subtotal ?? order.total ?? order.totalAmount ?? 0}
          deliveryFee={order.deliveryFee}
          discount={order.discount ?? order.discountAmount ?? 0}
          total={order.total ?? order.totalAmount ?? 0}
        />

        <div className="flex items-center justify-center gap-2 py-3 text-slate-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ระบบสั่งอาหารปลอดภัย ได้รับการคุ้มครองตามมาตรฐาน</span>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 max-w-[480px] mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3.5 shadow-lg z-40 flex gap-2">
        {['PENDING_PAYMENT', 'PAYMENT_VERIFYING', 'PAID', 'CONFIRMED'].includes(currentStatus) && (
          <button
            onClick={handleCancelOrder}
            disabled={cancelOrderMutation.isPending}
            className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-colors btn-tactile flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            ยกเลิกคำสั่งซื้อ
          </button>
        )}
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
