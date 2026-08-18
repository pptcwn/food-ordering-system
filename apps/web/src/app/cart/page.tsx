'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
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
  const { orderType } = useAppStore();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(false);

  const { data: cart, isLoading } = useQuery<any>({
    queryKey: ['cart'],
    queryFn: () => apiClient.get('/cart'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiClient.patch(`/cart/items/${itemId}`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => apiClient.delete(`/cart/items/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const clearCartMutation = useMutation({
    mutationFn: () => apiClient.delete('/cart'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const subtotal = cart?.subtotal || 0;
  const deliveryFee = orderType === 'DELIVERY' ? 0 : 0; // Free delivery promotion
  const discount = appliedPromo ? 30 : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
        <div className="w-8 h-8 border-3 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
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
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAF8F5] min-h-screen pb-32">
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
            className="text-xs font-bold text-[#00A86B] hover:underline"
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
                  <div className="w-18 h-18 rounded-2xl bg-slate-50 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100 shadow-xs">
                    {item.product?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-extrabold text-xs text-slate-900 truncate">
                        {item.product?.name}
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
                        {item.modifiers.map((m: any) => m.modifier?.name).join(', ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2.5">
                      <span className="font-black text-sm text-slate-900">
                        {formatPrice(item.totalPrice)}
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
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="มีโค้ดส่วนลดหรือไม่? (Have a promo code?)"
                className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400 font-medium"
              />
            </div>
            <button
              onClick={() => setAppliedPromo(true)}
              className="text-xs font-black text-[#00A86B] hover:underline px-2 py-1 flex-shrink-0"
            >
              {appliedPromo ? '✓ ใช้แล้ว' : 'Apply'}
            </button>
          </div>

          {/* Pricing Breakdown Card (Matching Screen 5) */}
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-soft space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>ราคารวมค่าอาหาร (Subtotal)</span>
              <span className="font-bold text-slate-800">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าจัดส่ง (Delivery Fee)</span>
              <span className="font-bold text-[#00A86B]">ฟรีโปรโมชั่น</span>
            </div>
            {appliedPromo && (
              <div className="flex justify-between text-rose-500 font-bold">
                <span>ส่วนลดโค้ดพิเศษ</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-sm font-black text-slate-900">
              <span>ยอดชำระสุทธิ (Total)</span>
              <span className="text-base text-[#00A86B] font-black">
                {formatPrice(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom CTA (Matching Screen 5 "Proceed to Checkout ➔") */}
      <div className="fixed bottom-16 inset-x-0 max-w-[480px] mx-auto px-4 z-40">
        <button
          onClick={() => router.push('/checkout')}
          disabled={cart.hasUnavailableItems}
          className="w-full py-4 bg-[#00A86B] hover:bg-[#00925D] text-white font-extrabold text-sm rounded-full shadow-lg shadow-[#00A86B]/30 flex items-center justify-between px-6 transition-all btn-tactile disabled:opacity-50"
        >
          <span>ดำเนินการสั่งซื้อ (Proceed to Checkout)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
