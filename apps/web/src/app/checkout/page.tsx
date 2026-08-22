'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { getCheckoutBlocker } from '@/lib/customer-ordering';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  QrCode,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  Tag,
  Store,
  CreditCard,
  Banknote,
} from 'lucide-react';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    customerName,
    customerPhone,
    orderType,
    location,
    activeBranchId,
    activeBranchName,
  } = useAppStore();

  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const couponCode = searchParams.get('coupon')?.trim().toUpperCase() || '';

  const { data: cart, isLoading } = useQuery<any>({
    queryKey: ['cart'],
    queryFn: () => apiClient.get('/cart'),
  });

  const subtotal = Number(cart?.subtotal || 0);
  const branchId = activeBranchId || cart?.branchId || cart?.items?.[0]?.branchId;
  const hasDeliveryCoordinates = Boolean(
    location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude),
  );
  const {
    data: deliveryQuote,
    isLoading: isDeliveryFeeLoading,
    error: deliveryFeeError,
  } = useQuery<any>({
    queryKey: ['delivery-fee', branchId, location?.latitude, location?.longitude],
    queryFn: () =>
      apiClient.post('/delivery/calculate-fee', {
        branchId,
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
    enabled: orderType === 'DELIVERY' && Boolean(branchId && hasDeliveryCoordinates),
    retry: false,
  });
  const deliveryFee =
    orderType === 'DELIVERY' && deliveryQuote?.isDeliverable
      ? Number(deliveryQuote.fee)
      : 0;
  const { data: couponValidation, error: couponError } = useQuery<any>({
    queryKey: ['coupon-validation', couponCode, subtotal, branchId, deliveryFee],
    queryFn: () =>
      apiClient.post('/coupons/validate', {
        code: couponCode,
        subtotal,
        branchId,
        deliveryFee,
      }),
    enabled: Boolean(
      couponCode &&
        cart?.items?.length &&
        (orderType !== 'DELIVERY' || Boolean(deliveryQuote)),
    ),
    retry: false,
  });
  const discount = Number(couponValidation?.discount || 0);
  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);

  const createOrderMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post('/orders', payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      router.replace(`/orders/${res.id}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'ไม่สามารถสร้างออเดอร์ได้ กรุณาลองใหม่อีกครั้ง');
    },
  });

  const handlePlaceOrder = () => {
    setErrorMsg('');
    const blocker = getCheckoutBlocker({
      itemCount: cart?.items?.length || 0,
      orderType,
      location,
      hasUnavailableItem: cart?.items?.some((item: any) => item.product?.isAvailable === false) || false,
      hasProfile: Boolean(customerName.trim() && customerPhone.trim()),
    });
    if (blocker) {
      setErrorMsg(blocker);
      return;
    }

    if (orderType === 'DELIVERY') {
      if (isDeliveryFeeLoading) {
        setErrorMsg('กำลังคำนวณค่าจัดส่ง กรุณารอสักครู่');
        return;
      }
      if (deliveryFeeError) {
        setErrorMsg((deliveryFeeError as Error).message || 'ไม่สามารถคำนวณค่าจัดส่งได้');
        return;
      }
      if (!deliveryQuote?.isDeliverable) {
        setErrorMsg(deliveryQuote?.message || 'ที่อยู่นี้อยู่นอกพื้นที่จัดส่ง');
        return;
      }
    }

    if (couponCode && couponError) {
      setErrorMsg((couponError as Error).message || 'คูปองนี้ไม่สามารถใช้งานได้แล้ว');
      return;
    }

    createOrderMutation.mutate({
      branchId,
      orderType,
      customerName,
      customerPhone,
      deliveryAddress: location?.addressLine || 'รับเองที่ร้าน',
      deliveryLatitude: location?.latitude,
      deliveryLongitude: location?.longitude,
      note: notes.trim() || undefined,
      couponCode: couponCode || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
        <Loader2 className="w-8 h-8 text-[#00A86B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-1 flex-col justify-between bg-[#FAF8F5] pb-32">
      <div>
        {/* 1. Header (Matching Reference Screen 6) */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-100 shadow-xs">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors btn-tactile"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-black text-slate-900">ยืนยันคำสั่งซื้อ</h1>
          <div className="w-9" />
        </header>

        {errorMsg && (
          <div className="m-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs shadow-soft">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* 2. Delivery Address Card (Matching Reference Screen 6) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-soft space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {orderType === 'DELIVERY' ? 'จุดจัดส่ง' : 'จุดรับสินค้า'}
              </span>
              <button
                onClick={() => router.push('/onboarding')}
                className="text-xs text-[#00A86B] font-bold hover:underline"
              >
                แก้ไข
              </button>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <div className="w-8 h-8 rounded-full bg-[#EAF8F1] text-[#00A86B] flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-xs text-slate-900">
                  {customerName} • {customerPhone}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {orderType === 'DELIVERY'
                    ? location?.addressLine || 'จัดส่งตามพิกัดที่ระบุ'
                    : `รับเองที่สาขา: ${activeBranchName || 'สาขาหลัก'}`}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Delivery estimate */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-soft space-y-3">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              {orderType === 'DELIVERY' ? 'เวลาจัดส่งโดยประมาณ' : 'เวลารับสินค้าโดยประมาณ'}
            </span>
            <p className="rounded-2xl bg-[#EAF8F1] px-4 py-3 text-sm font-semibold text-slate-700">
              {orderType === 'DELIVERY'
                ? 'ร้านจะจัดส่งตามคิวที่พร้อม โดยระบบจะแสดงสถานะล่าสุดในหน้าคำสั่งซื้อ'
                : 'ร้านจะเตรียมอาหารตามคิว เมื่อพร้อมรับจะแจ้งสถานะในหน้าคำสั่งซื้อ'}
            </p>
          </div>

          {/* 4. Payment Method */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-soft space-y-3">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              วิธีชำระเงิน
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-[#00A86B] bg-[#EAF8F1] p-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-700 text-white font-bold text-xs flex items-center justify-center">
                TH
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Thai QR PromptPay</p>
                <p className="text-xs text-slate-500">สแกนจ่ายและอัปโหลดสลิปในหน้ารายการสั่งซื้อ</p>
              </div>
              <Check className="ml-auto w-4 h-4 text-[#00A86B]" aria-label="เลือก PromptPay แล้ว" />
            </div>
          </div>

          {/* 5. Special Note to Kitchen */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-soft">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติมถึงร้านค้า เช่น ไม่ใส่ผัก, เผ็ดน้อย"
              className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* 6. Place Order Bottom CTA Bar (Matching Reference Screen 6 "Place Order ➔") */}
      <div className="fixed bottom-0 inset-x-0 max-w-[480px] mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 p-4 shadow-xl z-40">
        <div className="mb-3 space-y-1.5 px-1 text-xs">
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>ค่าอาหาร</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {orderType === 'DELIVERY' && (
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>ค่าส่ง</span>
              <span>
                {isDeliveryFeeLoading
                  ? 'กำลังคำนวณ...'
                  : deliveryFeeError
                    ? 'คำนวณไม่สำเร็จ'
                    : deliveryQuote?.message || formatPrice(deliveryFee)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 text-slate-900">
            <span className="font-bold">ยอดชำระทั้งหมด</span>
            <span className="text-lg font-black">{formatPrice(grandTotal)}</span>
          </div>
        </div>
        {couponValidation && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <span>{couponValidation.promotionName}</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <Button
          onClick={handlePlaceOrder}
          disabled={createOrderMutation.isPending || (orderType === 'DELIVERY' && isDeliveryFeeLoading)}
          size="lg"
          className="w-full justify-between rounded-full px-6 shadow-lg shadow-emerald-950/20"
        >
          {createOrderMutation.isPending || (orderType === 'DELIVERY' && isDeliveryFeeLoading) ? (
            <div className="flex items-center justify-center gap-2 w-full">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isDeliveryFeeLoading ? 'กำลังคำนวณค่าส่ง...' : 'กำลังสร้างคำสั่งซื้อ...'}</span>
            </div>
          ) : (
            <>
              <span>ยืนยันการสั่งซื้อ</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#00A86B]" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
