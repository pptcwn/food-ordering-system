'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import {
  ArrowLeft,
  Trash2,
  AlertCircle,
  ChevronRight,
  ShoppingBag,
  Bike,
  Store,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orderType } = useAppStore();

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

  const deliveryFee = orderType === 'DELIVERY' ? 30 : 0;
  const subtotal = cart?.subtotal || 0;
  const grandTotal = subtotal + deliveryFee;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">ไม่มีสินค้าในตะกร้า</h2>
        <p className="text-sm text-zinc-500 mb-6">เริ่มเลือกเมนูอร่อยๆ ที่คุณชอบได้เลย</p>
        <button
          onClick={() => router.push('/menu')}
          className="px-6 py-3 bg-rose-600 text-white font-semibold text-sm rounded-xl hover:bg-rose-700 transition"
        >
          ไปที่หน้าเมนู
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pb-8">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 hover:bg-zinc-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-zinc-900">ตะกร้าสินค้า</h1>
          <button
            onClick={() => clearCartMutation.mutate()}
            className="text-xs text-zinc-400 hover:text-red-600 transition"
          >
            ล้างตะกร้า
          </button>
        </div>

        {/* Unavailable Items Warning */}
        {cart.hasUnavailableItems && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>มีบางรายการในตะกร้าหมดแล้ว กรุณาลบออกก่อนดำเนินการสั่งซื้อ</span>
          </div>
        )}

        {/* Cart Item List */}
        <div className="divide-y divide-zinc-100 mt-2">
          {cart.items.map((item: any) => (
            <div key={item.id} className="py-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-sm font-bold text-zinc-900">{item.productName}</h3>
                    {!item.isAvailable && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-bold">
                        หมด
                      </span>
                    )}
                  </div>
                  {item.variantName && (
                    <p className="text-xs text-zinc-500">{item.variantName}</p>
                  )}
                  {item.modifiers?.length > 0 && (
                    <p className="text-xs text-zinc-400">
                      {item.modifiers.map((m: any) => m.name).join(', ')}
                    </p>
                  )}
                  {item.specialNote && (
                    <p className="text-xs text-rose-500 italic mt-0.5">"{item.specialNote}"</p>
                  )}
                </div>
                <span className="text-sm font-bold text-zinc-900">
                  {formatPrice(item.itemLineTotal)}
                </span>
              </div>

              {/* Quantity Controls & Remove */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => removeItemMutation.mutate(item.id)}
                  className="text-xs text-zinc-400 hover:text-red-600 flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบ</span>
                </button>

                <div className="flex items-center space-x-2.5 bg-zinc-100 p-1 rounded-lg">
                  <button
                    onClick={() =>
                      updateItemMutation.mutate({
                        itemId: item.id,
                        quantity: Math.max(0, item.quantity - 1),
                      })
                    }
                    className="w-6 h-6 bg-white rounded font-bold text-zinc-700 text-xs shadow-sm flex items-center justify-center hover:bg-zinc-200"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateItemMutation.mutate({
                        itemId: item.id,
                        quantity: item.quantity + 1,
                      })
                    }
                    className="w-6 h-6 bg-white rounded font-bold text-zinc-700 text-xs shadow-sm flex items-center justify-center hover:bg-zinc-200"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bill Breakdown */}
        <div className="mt-6 p-4 bg-zinc-50 rounded-2xl space-y-2.5 border border-zinc-100 text-xs">
          <div className="flex justify-between text-zinc-600">
            <span>ราคารวมสินค้า</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span className="flex items-center space-x-1">
              {orderType === 'DELIVERY' ? <Bike className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
              <span>{orderType === 'DELIVERY' ? 'ค่าจัดส่ง' : 'รับเองที่ร้าน'}</span>
            </span>
            <span className="font-semibold">{orderType === 'DELIVERY' ? formatPrice(deliveryFee) : 'ฟรี'}</span>
          </div>
          <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold text-zinc-900">
            <span>ยอดรวมสุทธิ</span>
            <span className="text-rose-600 text-base">{formatPrice(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Checkout CTA */}
      <div className="pt-6">
        <button
          onClick={() => router.push('/checkout')}
          disabled={cart.hasUnavailableItems}
          className="w-full py-4 bg-rose-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-between px-6 hover:bg-rose-700 active:scale-[0.98] transition disabled:opacity-50"
        >
          <span>ไปชำระเงิน</span>
          <div className="flex items-center space-x-1">
            <span>{formatPrice(grandTotal)}</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
}
