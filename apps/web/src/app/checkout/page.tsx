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
  Bike,
  Store,
  Tag,
  Check,
  X,
  Navigation,
  ShieldCheck,
  ChevronRight,
  Receipt,
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

  // Promo Code State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Delivery Fee Calculation State
  const [deliveryInfo, setDeliveryInfo] = useState<{
    distanceKm: number;
    fee: number;
    isDeliverable: boolean;
    message: string;
  } | null>(null);

  const { data: cart, isLoading } = useQuery<any>({
    queryKey: ['cart'],
    queryFn: () => apiClient.get('/cart'),
  });

  const subtotal = cart?.subtotal || 0;

  // Calculate Distance & Dynamic Delivery Fee
  useEffect(() => {
    if (orderType === 'DELIVERY' && location?.latitude && location?.longitude) {
      const branchId = activeBranchId || cart?.items[0]?.branchId;
      if (branchId) {
        apiClient
          .post('/delivery/calculate-fee', {
            branchId,
            latitude: location.latitude,
            longitude: location.longitude,
          })
          .then((res: any) => {
            setDeliveryInfo(res);
          })
          .catch(() => {
            setDeliveryInfo({
              distanceKm: 0,
              fee: 0,
              isDeliverable: true,
              message: 'โปรโมชั่นจัดส่งฟรี ฿0',
            });
          });
      }
    } else {
      setDeliveryInfo(null);
    }
  }, [orderType, location, activeBranchId, cart]);

  // Handle Coupon Validation
  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    try {
      const res: any = await apiClient.post('/coupons/validate', {
        code: couponInput.trim(),
        subtotal,
        branchId: activeBranchId || cart?.items[0]?.branchId,
      });
      setAppliedCoupon(res);
      setCouponError('');
    } catch (err: any) {
      setCouponError(err.message || 'คูปองไม่ถูกต้องหรือหมดอายุ');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  // Pricing calculation
  const deliveryFee =
    orderType === 'DELIVERY'
      ? deliveryInfo?.fee !== undefined
        ? deliveryInfo.fee
        : 0
      : 0;

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'FREE_DELIVERY') {
      discount = deliveryFee;
    } else {
      discount = appliedCoupon.discount || 0;
    }
  }

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

    if (orderType === 'DELIVERY' && deliveryInfo && !deliveryInfo.isDeliverable) {
      setErrorMsg('ที่อยู่ของคุณอยู่นอกพื้นที่ให้บริการจัดส่ง');
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
      couponCode: appliedCoupon?.code,
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
        <Loader2 className="w-8 h-8 text-[#06C755] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-slate-50 min-h-screen pb-32">
      <div>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors btn-tactile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-slate-900">สรุปและยืนยันการสั่งซื้อ</h1>
          <div className="w-9" />
        </header>

        {errorMsg && (
          <div className="m-3.5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3.5 space-y-3">
          {/* Customer & Delivery Summary Card */}
          <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                {orderType === 'DELIVERY' ? (
                  <Bike className="w-4 h-4 text-[#06C755]" />
                ) : (
                  <Store className="w-4 h-4 text-[#06C755]" />
                )}
                <span>{orderType === 'DELIVERY' ? 'ที่อยู่จัดส่งของคุณ' : 'รับสินค้าที่ร้าน'}</span>
              </span>
              <button
                onClick={() => router.push('/onboarding')}
                className="text-xs text-[#06C755] font-bold hover:underline"
              >
                แก้ไข
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">
                {customerName} ({customerPhone})
              </p>
              {orderType === 'DELIVERY' ? (
                <>
                  <p className="text-slate-600 leading-relaxed">{location?.addressLine}</p>
                  {deliveryInfo && (
                    <p className="text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                      <Navigation className="w-3 h-3 text-[#06C755]" />
                      <span>{deliveryInfo.message}</span>
                    </p>
                  )}
                </>
              ) : (
                <p>สาขา: {activeBranchName || 'สาขาหลัก'}</p>
              )}
            </div>
          </div>

          {/* Coupon Input Card */}
          <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs space-y-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#06C755]" />
              <span>คูปองส่วนลด / โค้ดโปรโมชั่น</span>
            </span>

            {appliedCoupon ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-900">{appliedCoupon.code}</p>
                    <p className="text-[11px] text-emerald-700">{appliedCoupon.message}</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="w-6 h-6 rounded-full bg-emerald-200/60 flex items-center justify-center text-emerald-800 hover:bg-emerald-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="กรอกโค้ด เช่น DISCOUNT20"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponInput.trim()}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors btn-tactile"
                  >
                    {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ใช้โค้ด'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Card */}
          <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
            <span className="text-xs font-bold text-slate-800 block mb-2.5">
              วิธีการชำระเงิน
            </span>
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                  TH
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Thai QR PromptPay</p>
                  <p className="text-[11px] text-slate-500">สแกนจ่ายและแนบสลิปผ่าน Slip2Go</p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#06C755]" />
            </div>
          </div>

          {/* Order Items Preview */}
          <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-600" />
                <span>รายการอาหาร ({cart?.totalItems} ชิ้น)</span>
              </span>
            </div>
            {cart?.items.map((i: any) => (
              <div key={i.id} className="flex justify-between text-xs text-slate-700 py-1">
                <span className="truncate max-w-[220px]">
                  {i.quantity}x {i.productName}
                </span>
                <span className="font-semibold text-slate-900">{formatPrice(i.itemLineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Extra Order Notes */}
          <div className="space-y-1.5">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติมสำหรับร้านค้า เช่น ไม่ใส่ผัก, เผ็ดน้อย"
              className="w-full p-3 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755] shadow-xs"
            />
          </div>

          {/* Price Breakdown */}
          <div className="bg-white rounded-2xl p-4 space-y-2 text-xs border border-slate-200/80 shadow-xs">
            <div className="flex justify-between text-slate-600">
              <span>ราคารวมอาหาร</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>ค่าจัดส่ง</span>
              <span className="text-[#06C755] font-semibold">
                {deliveryFee > 0 ? formatPrice(deliveryFee) : '฿0 (ส่งฟรี)'}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>ส่วนลดคูปอง ({appliedCoupon?.code})</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-sm font-extrabold text-slate-900">
              <span>ยอดชำระสุทธิ</span>
              <span className="text-base text-[#06C755] font-extrabold">
                {formatPrice(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Place Order Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 max-w-[480px] mx-auto bg-white border-t border-slate-200/80 p-3.5 shadow-lg z-40">
        <button
          onClick={handlePlaceOrder}
          disabled={createOrderMutation.isPending}
          className="w-full py-3.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors btn-tactile disabled:opacity-50"
        >
          {createOrderMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังสร้างคำสั่งซื้อ...</span>
            </>
          ) : (
            <>
              <span>ยืนยันการสั่งซื้อ • {formatPrice(grandTotal)}</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
