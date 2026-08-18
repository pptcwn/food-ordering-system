'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
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

export default function CheckoutPage() {
  const router = useRouter();
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
  const [deliverySpeed, setDeliverySpeed] = useState<'EXPRESS' | 'STANDARD'>('EXPRESS');
  const [paymentMethod, setPaymentMethod] = useState<'PROMPTPAY' | 'CASH'>('PROMPTPAY');

  const { data: cart, isLoading } = useQuery<any>({
    queryKey: ['cart'],
    queryFn: () => apiClient.get('/cart'),
  });

  const subtotal = cart?.subtotal || 0;
  const deliveryFee = 0; // Free promotion
  const grandTotal = subtotal + deliveryFee;

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
    if (!cart || cart.items.length === 0) {
      setErrorMsg('ไม่มีสินค้าในตะกร้า');
      return;
    }

    if (!customerName || !customerPhone) {
      setErrorMsg('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    if (orderType === 'DELIVERY' && !location?.addressLine) {
      setErrorMsg('กรุณาระบุที่อยู่จัดส่ง');
      return;
    }

    createOrderMutation.mutate({
      branchId: activeBranchId || cart.items[0]?.branchId,
      orderType,
      customerName,
      customerPhone,
      deliveryAddress: location?.addressLine || 'รับเองที่ร้าน',
      deliveryLatitude: location?.latitude,
      deliveryLongitude: location?.longitude,
      note: notes.trim() || undefined,
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
    <div className="flex-1 flex flex-col justify-between bg-[#FAF8F5] min-h-screen pb-32">
      <div>
        {/* 1. Header (Matching Reference Screen 6) */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-100 shadow-xs">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors btn-tactile"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-black text-slate-900">เช็คเอาท์ (Checkout)</h1>
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
                ที่อยู่จัดส่ง (Delivery Address)
              </span>
              <button
                onClick={() => router.push('/onboarding')}
                className="text-xs text-[#00A86B] font-bold hover:underline"
              >
                Change
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

          {/* 3. Delivery Time Options (Matching Reference Screen 6) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-soft space-y-3">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              ความเร็วการจัดส่ง (Delivery Time)
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeliverySpeed('EXPRESS')}
                className={`p-3.5 rounded-2xl border flex flex-col text-left transition-all btn-tactile ${
                  deliverySpeed === 'EXPRESS'
                    ? 'border-[#00A86B] bg-[#EAF8F1] ring-1 ring-[#00A86B]'
                    : 'border-slate-100 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-extrabold text-slate-900">Express Delivery</span>
                  {deliverySpeed === 'EXPRESS' && <Check className="w-3.5 h-3.5 text-[#00A86B]" />}
                </div>
                <span className="text-[11px] text-slate-500">20-30 นาที</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliverySpeed('STANDARD')}
                className={`p-3.5 rounded-2xl border flex flex-col text-left transition-all btn-tactile ${
                  deliverySpeed === 'STANDARD'
                    ? 'border-[#00A86B] bg-[#EAF8F1] ring-1 ring-[#00A86B]'
                    : 'border-slate-100 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-extrabold text-slate-900">Standard</span>
                  {deliverySpeed === 'STANDARD' && <Check className="w-3.5 h-3.5 text-[#00A86B]" />}
                </div>
                <span className="text-[11px] text-slate-500">ส่งฟรีปกติ</span>
              </button>
            </div>
          </div>

          {/* 4. Payment Method Card (Matching Reference Screen 6) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-soft space-y-3">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              วิธีการชำระเงิน (Payment Method)
            </span>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('PROMPTPAY')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all btn-tactile ${
                  paymentMethod === 'PROMPTPAY'
                    ? 'border-[#00A86B] bg-[#EAF8F1] ring-1 ring-[#00A86B]'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-700 text-white font-bold text-xs flex items-center justify-center">
                    TH
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900">Thai QR PromptPay</p>
                    <p className="text-[10px] text-slate-400">สแกนจ่ายทันที พร้อมตรวจสลิปอัตโนมัติ</p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'PROMPTPAY'
                      ? 'border-[#00A86B] bg-[#00A86B] text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {paymentMethod === 'PROMPTPAY' && <Check className="w-3 h-3" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all btn-tactile ${
                  paymentMethod === 'CASH'
                    ? 'border-[#00A86B] bg-[#EAF8F1] ring-1 ring-[#00A86B]'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900">ชำระเงินสดปลายทาง (COD)</p>
                    <p className="text-[10px] text-slate-400">จ่ายกับไรเดอร์เมื่อได้รับอาหาร</p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'CASH'
                      ? 'border-[#00A86B] bg-[#00A86B] text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {paymentMethod === 'CASH' && <Check className="w-3 h-3" />}
                </div>
              </button>
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
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs text-slate-500 font-medium">ยอดชำระทั้งหมด (Total Amount)</span>
          <span className="text-lg font-black text-slate-900">{formatPrice(grandTotal)}</span>
        </div>
        <button
          onClick={handlePlaceOrder}
          disabled={createOrderMutation.isPending}
          className="w-full py-4 bg-[#00A86B] hover:bg-[#00925D] text-white font-black text-sm rounded-full shadow-lg shadow-[#00A86B]/30 flex items-center justify-between px-6 transition-all btn-tactile disabled:opacity-50"
        >
          {createOrderMutation.isPending ? (
            <div className="flex items-center justify-center gap-2 w-full">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังสร้างคำสั่งซื้อ...</span>
            </div>
          ) : (
            <>
              <span>ยืนยันการสั่งซื้อ (Place Order)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
