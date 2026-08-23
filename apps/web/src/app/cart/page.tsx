'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { ProductThumbnail } from '@/components/customer/product-thumbnail';
import { useFeedback } from '@/components/ui/feedback-provider';
import { SkeletonList } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Trash2,
  AlertCircle,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  Check,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const { orderType } = useAppStore();
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const { data: cart, isLoading } = useQuery<any>({
    queryKey: ['cart'],
    queryFn: () => apiClient.get('/cart'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiClient.patch(`/cart/items/${itemId}`, { quantity }),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: any) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        };
      });
      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => apiClient.delete(`/cart/items/${itemId}`),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((item: any) => item.id !== itemId),
        };
      });
      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: () => apiClient.delete('/cart'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const subtotal = cart?.subtotal || 0;
  const deliveryFee = orderType === 'DELIVERY' ? 0 : 0; // Free delivery promotion
  const discount = Number(appliedCoupon?.discount || 0);
  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);

  useEffect(() => {
    setAppliedCoupon(null);
  }, [subtotal, cart?.branchId]);

  const validateCouponMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/coupons/validate', {
        code: promoCode.trim(),
        subtotal,
        branchId: cart?.branchId,
      }),
    onSuccess: (coupon: any) => {
      setAppliedCoupon(coupon);
      setPromoCode(coupon.code);
      notify(coupon.message, 'success');
    },
    onError: (error: any) => {
      setAppliedCoupon(null);
      notify(error.message || 'ไม่สามารถใช้คูปองนี้ได้', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-1 flex-col bg-[#FAF8F5]">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-100 shadow-xs">
           <div className="w-9 h-9 rounded-full bg-slate-100" />
           <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
           <div className="w-16" />
        </header>
        <div className="p-4 space-y-4">
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[80vh] bg-[#FAF8F5]">
        <div className="w-20 h-20 bg-[#EAF8F1] text-[#00A86B] rounded-full flex items-center justify-center mb-4 shadow-soft">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-black text-slate-900 mb-1">ไม่มีสินค้าในตะกร้า</h2>
        <p className="text-xs text-slate-500 mb-6 max-w-[240px]">
          เลือกอาหารจานโปรดของคุณ แล้วกดเพิ่มลงตะกร้าได้เลยครับ
        </p>
        <button
          onClick={() => router.push('/menu')}
          className="px-6 py-3 bg-[#00A86B] hover:bg-[#00925D] text-white font-bold text-xs rounded-full shadow-lg shadow-[#00A86B]/30 transition-all btn-tactile"
        >
          กลับไปเลือกอาหาร
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-1 flex-col justify-between bg-[#FAF8F5] pb-28">
      <div>
        {/* Top Header (Matching Reference Screen 5) */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-100 shadow-xs">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors btn-tactile"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-black text-slate-900">ตะกร้าสินค้าของฉัน</h1>
            <span className="text-[11px] text-slate-400 font-medium">{cart.totalItems} รายการ</span>
          </div>
          <button
            onClick={() => clearCartMutation.mutate()}
            className="text-xs font-bold text-[#1F5D45] hover:underline"
          >
            ล้างทั้งหมด
          </button>
        </header>

        {/* Unavailable Items Warning */}
        {cart.hasUnavailableItems && (
          <div className="m-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-amber-800 text-xs shadow-soft">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>มีบางรายการในตะกร้าหมดแล้ว กรุณาลบออกก่อนดำเนินการสั่งซื้อ</span>
          </div>
        )}

        {/* Cart Items List (Matching Reference Screen 5) */}
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-soft space-y-3">
            <div className="divide-y divide-slate-100">
              {cart.items.map((item: any) => (
                <div key={item.id} className="py-3.5 flex gap-3.5 first:pt-0 last:pb-0 items-center">
                  {/* Item Image */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#D5E5DA] shadow-xs">
                    <ProductThumbnail src={item.imageUrl} alt={item.productName || 'สินค้าในตะกร้า'} />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-extrabold text-xs text-slate-900 truncate">
                        {item.productName}
                      </h3>
                      <button
                        onClick={() => removeItemMutation.mutate(item.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 -mr-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Modifiers info */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.modifiers.map((m: any) => m.name).join(', ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2.5">
                      <span className="font-black text-sm text-slate-900">
                        {formatPrice(item.itemLineTotal)}
                      </span>

                      {/* Stepper (Matching Screen 5 `[- 1 +]`) */}
                      <div className="flex items-center gap-2.5 bg-slate-100 px-2.5 py-1 rounded-full">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateItemMutation.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity - 1,
                                })
                              : removeItemMutation.mutate(item.id)
                          }
                          className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-slate-800 font-bold shadow-xs hover:bg-slate-200 btn-tactile text-xs"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-4 text-center text-xs font-black">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateItemMutation.mutate({
                              itemId: item.id,
                              quantity: item.quantity + 1,
                            })
                          }
                          className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-slate-800 font-bold shadow-xs hover:bg-slate-200 btn-tactile text-xs"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promo Code Input Card (Matching Screen 5) */}
          <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-soft flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Tag className="w-4 h-4 text-[#00A86B]" />
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setAppliedCoupon(null);
                }}
                placeholder="มีโค้ดส่วนลดหรือไม่"
                className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400 font-medium"
              />
            </div>
            <button
              onClick={() => validateCouponMutation.mutate()}
              disabled={!promoCode.trim() || validateCouponMutation.isPending}
              className="text-xs font-black text-[#1F5D45] hover:underline px-2 py-1 flex-shrink-0 disabled:opacity-50"
            >
              {validateCouponMutation.isPending ? 'กำลังตรวจ...' : appliedCoupon ? '✓ ใช้แล้ว' : 'ใช้โค้ด'}
            </button>
          </div>

          {/* Pricing Breakdown Card (Matching Screen 5) */}
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-soft space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>ค่าอาหาร</span>
              <span className="font-bold text-slate-800">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าจัดส่ง</span>
              <span className="font-bold text-[#1F5D45]">ฟรีโปรโมชั่น</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-rose-500 font-bold">
                <span>{appliedCoupon.promotionName || 'ส่วนลดคูปอง'}</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-sm font-black text-slate-900">
              <span>ยอดชำระสุทธิ</span>
              <span className="text-base text-[#1F5D45] font-black">
                {formatPrice(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom CTA (Matching Screen 5 "Proceed to Checkout ➔") */}
      <div className="fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-3xl border-t border-slate-100 bg-white/95 p-4 backdrop-blur-md">
        <button
          onClick={() => router.push(appliedCoupon ? `/checkout?coupon=${encodeURIComponent(appliedCoupon.code)}` : '/checkout')}
          disabled={cart.hasUnavailableItems}
          className="w-full py-4 bg-[#00A86B] hover:bg-[#00925D] text-white font-extrabold text-sm rounded-full shadow-lg shadow-[#00A86B]/30 flex items-center justify-between px-6 transition-all btn-tactile disabled:opacity-50"
        >
          <span>ตรวจสอบและยืนยันออเดอร์</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
