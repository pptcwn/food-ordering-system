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
              fee: 30,
              isDeliverable: true,
              message: 'ค่าจัดส่งมาตรฐาน ฿30',
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

  // Pricing math
  const deliveryFee =
    orderType === 'DELIVERY'
      ? deliveryInfo?.fee !== undefined
        ? deliveryInfo.fee
        : 30
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
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pb-8 max-w-lg mx-auto w-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 hover:bg-zinc-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-zinc-900">ยืนยันการสั่งซื้อ</h1>
          <div className="w-9" />
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-600 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Customer & Delivery Summary Card */}
        <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 uppercase flex items-center space-x-1.5">
              {orderType === 'DELIVERY' ? (
                <Bike className="w-4 h-4 text-rose-600" />
              ) : (
                <Store className="w-4 h-4 text-rose-600" />
              )}
              <span>{orderType === 'DELIVERY' ? 'ข้อมูลการจัดส่ง' : 'รับสินค้าที่ร้าน'}</span>
            </span>
            <button
              onClick={() => router.push('/onboarding')}
              className="text-xs text-rose-600 font-semibold hover:underline"
            >
              แก้ไข
            </button>
          </div>

          <div className="text-xs text-zinc-600 space-y-1">
            <p className="font-semibold text-zinc-900">
              {customerName} ({customerPhone})
            </p>
            {orderType === 'DELIVERY' ? (
              <>
                <p>{location?.addressLine}</p>
                {deliveryInfo && (
                  <p className="text-emerald-700 font-medium flex items-center gap-1 mt-1">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{deliveryInfo.message}</span>
                  </p>
                )}
              </>
            ) : (
              <p>สาขา: {activeBranchName || 'สาขาหลัก'}</p>
            )}
          </div>
        </div>

        {/* Coupon Input Card (Blueprint §45) */}
        <div className="mt-3 p-4 bg-white border border-zinc-200 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-zinc-800 uppercase flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-rose-600" />
            <span>คูปองส่วนลด (Coupon Code)</span>
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
                  placeholder="กรอกโค้ดส่วนลด เช่น WELCOME50"
                  className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponInput.trim()}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition"
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
        <div className="mt-3 p-4 bg-white border border-zinc-200 rounded-2xl">
          <span className="text-xs font-bold text-zinc-800 uppercase block mb-2">
            วิธีการชำระเงิน
          </span>
          <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900">Thai QR PromptPay</p>
                <p className="text-[11px] text-zinc-500">สแกนจ่ายและแนบสลิปผ่าน Slip2Go</p>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        {/* Order Items Preview */}
        <div className="mt-3 p-4 bg-white border border-zinc-200 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-zinc-800 uppercase block mb-1">
            รายการอาหาร ({cart?.totalItems} ชิ้น)
          </span>
          {cart?.items.map((i: any) => (
            <div key={i.id} className="flex justify-between text-xs text-zinc-600">
              <span className="truncate max-w-[220px]">
                {i.productName} x{i.quantity}
              </span>
              <span className="font-semibold">{formatPrice(i.itemLineTotal)}</span>
            </div>
          ))}
        </div>

        {/* Extra Order Notes */}
        <div className="mt-3">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="หมายเหตุเพิ่มเติมสำหรับออเดอร์นี้"
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
          />
        </div>

        {/* Price Breakdown */}
        <div className="mt-4 p-4 bg-zinc-50 rounded-2xl space-y-2 text-xs border border-zinc-100">
          <div className="flex justify-between text-zinc-600">
            <span>ราคารวมสินค้า</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>
              ค่าจัดส่ง {deliveryInfo ? `(${deliveryInfo.distanceKm} กม.)` : ''}
            </span>
            <span className="font-semibold">
              {orderType === 'DELIVERY' ? formatPrice(deliveryFee) : 'ฟรี'}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>ส่วนลดคูปอง ({appliedCoupon?.code})</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
          <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold text-zinc-900">
            <span>ยอดชำระสุทธิ</span>
            <span className="text-rose-600 text-base">{formatPrice(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Place Order CTA */}
      <div className="pt-6">
        <button
          onClick={handlePlaceOrder}
          disabled={createOrderMutation.isPending}
          className="w-full py-4 bg-rose-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 hover:bg-rose-700 active:scale-[0.98] transition disabled:opacity-50"
        >
          {createOrderMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>กำลังสร้างออเดอร์...</span>
            </>
          ) : (
            <>
              <span>ยืนยันการสั่งซื้อ ({formatPrice(grandTotal)})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
