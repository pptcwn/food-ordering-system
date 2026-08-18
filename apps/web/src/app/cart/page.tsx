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
  Utensils,
  Plus,
  Minus,
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

  const subtotal = cart?.subtotal || 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
        <div className="w-8 h-8 border-3 border-[#06C755] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[70vh]">
        <div className="w-16 h-16 bg-emerald-50 text-[#06C755] rounded-full flex items-center justify-center mb-3">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">ไม่มีสินค้าในตะกร้า</h2>
        <p className="text-xs text-slate-500 mb-6 max-w-[240px]">
          เลือกอาหารจานโปรดของคุณ แล้วกดเพิ่มลงตะกร้าได้เลยครับ
        </p>
        <button
          onClick={() => router.push('/menu')}
          className="px-6 py-2.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-full shadow-md transition-colors btn-tactile"
        >
          กลับไปเลือกอาหาร
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-slate-50 min-h-screen pb-28">
      <div>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors btn-tactile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-slate-900">
            ตะกร้าของคุณ ({cart.totalItems})
          </h1>
          <button
            onClick={() => clearCartMutation.mutate()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
          >
            ล้างทั้งหมด
          </button>
        </header>

        {/* Unavailable Items Warning */}
        {cart.hasUnavailableItems && (
          <div className="m-3.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>มีบางรายการในตะกร้าหมดแล้ว กรุณาลบออกก่อนดำเนินการสั่งซื้อ</span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="p-3.5 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="divide-y divide-slate-100">
              {cart.items.map((item: any) => (
                <div key={item.id} className="py-3 flex gap-3 first:pt-0 last:pb-0">
                  {/* Item Image */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.product?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Utensils className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-xs text-slate-900 truncate">
                          {item.product?.name}
                        </h3>
                        <button
                          onClick={() => removeItemMutation.mutate(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 -mr-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Modifiers info */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.modifiers.map((m: any) => m.modifier?.name).join(', ')}
                        </p>
                      )}
                      {item.specialNote && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                          โน้ต: {item.specialNote}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        {formatPrice(item.totalPrice)}
                      </span>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2 bg-slate-100 p-0.5 rounded-lg">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateItemMutation.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity - 1,
                                })
                              : removeItemMutation.mutate(item.id)
                          }
                          className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-200 btn-tactile text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateItemMutation.mutate({
                              itemId: item.id,
                              quantity: item.quantity + 1,
                            })
                          }
                          className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-200 btn-tactile text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Checkout CTA */}
      <div className="fixed bottom-0 inset-x-0 max-w-[480px] mx-auto bg-white border-t border-slate-200/80 p-3.5 shadow-lg z-40">
        <div className="flex items-center justify-between mb-2.5 text-xs text-slate-600 px-1">
          <span>ยอดรวมทั้งหมด</span>
          <span className="text-base font-extrabold text-slate-900">
            {formatPrice(subtotal)}
          </span>
        </div>
        <button
          onClick={() => router.push('/checkout')}
          disabled={cart.hasUnavailableItems}
          className="w-full py-3.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-sm rounded-xl shadow-md transition-colors btn-tactile flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>ดำเนินการสั่งซื้อ</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
