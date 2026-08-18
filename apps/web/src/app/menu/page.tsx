'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatPrice } from '@/lib/utils';
import { WS_EVENTS } from '@food-ordering/types';
import {
  ShoppingBag,
  Plus,
  Flame,
  Check,
  X,
  MapPin,
  Utensils,
  ChevronRight,
  AlertCircle,
  Clock,
} from 'lucide-react';

export default function MenuPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    customerName,
    activeBranchId,
    activeBranchName,
    orderType,
    location,
    isProfileComplete,
  } = useAppStore();

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialNote, setSpecialNote] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Protect route: Redirect to onboarding if profile not complete
  useEffect(() => {
    if (!isProfileComplete()) {
      router.replace('/onboarding');
    }
  }, [isProfileComplete, router]);

  // Fetch Menu
  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ['menu', activeBranchId],
    queryFn: () => apiClient.get(`/menu?branchId=${activeBranchId || ''}`),
  });

  // Fetch Cart summary
  const { data: cart } = useQuery<any>({
    queryKey: ['cart'],
    queryFn: () => apiClient.get('/cart'),
  });

  // Realtime Sold Out Socket listener
  useEffect(() => {
    const socket = getSocket();
    if (activeBranchId) {
      socket.emit('join_branch', { branchId: activeBranchId });
    }

    socket.on(WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED, (payload: any) => {
      // Invalidate menu & cart cache immediately
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    });

    return () => {
      socket.off(WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED);
    };
  }, [activeBranchId, queryClient]);

  // Set default active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Add to Cart Mutation
  const addToCartMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post('/cart/items', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setSelectedProduct(null);
      setSelectedModifiers([]);
      setQuantity(1);
      setSpecialNote('');
    },
    onError: (err: any) => {
      alert(err.message || 'ไม่สามารถเพิ่มสินค้าลงตะกร้าได้');
    },
  });

  const handleOpenProduct = (product: any) => {
    if (!product.isAvailable) return;
    setSelectedProduct(product);
    setSelectedVariantId(product.variants?.[0]?.id || '');
    setSelectedModifiers([]);
    setQuantity(1);
    setSpecialNote('');
  };

  const handleToggleModifier = (modifierId: string, group: any) => {
    if (group.maxSelect === 1) {
      // Radio mode: replace existing in this group
      const otherGroupModIds = group.modifiers.map((m: any) => m.id);
      const filtered = selectedModifiers.filter((id) => !otherGroupModIds.includes(id));
      setSelectedModifiers([...filtered, modifierId]);
    } else {
      // Multi-select toggle
      if (selectedModifiers.includes(modifierId)) {
        setSelectedModifiers(selectedModifiers.filter((id) => id !== modifierId));
      } else {
        const currentGroupCount = selectedModifiers.filter((id) =>
          group.modifiers.some((m: any) => m.id === id),
        ).length;
        if (currentGroupCount < group.maxSelect) {
          setSelectedModifiers([...selectedModifiers, modifierId]);
        }
      }
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    addToCartMutation.mutate({
      branchId: activeBranchId,
      productId: selectedProduct.id,
      productVariantId: selectedVariantId || undefined,
      quantity,
      specialNote: specialNote.trim() || undefined,
      modifierIds: selectedModifiers,
    });
  };

  // Calculate modal dynamic price
  const calculateModalPrice = () => {
    if (!selectedProduct) return 0;
    let base = Number(selectedProduct.basePrice);
    if (selectedVariantId) {
      const v = selectedProduct.variants.find((v: any) => v.id === selectedVariantId);
      if (v) base = Number(v.price);
    }
    let modSum = 0;
    selectedProduct.modifierGroups?.forEach((g: any) => {
      g.modifiers?.forEach((m: any) => {
        if (selectedModifiers.includes(m.id)) {
          modSum += Number(m.price);
        }
      });
    });
    return (base + modSum) * quantity;
  };

  return (
    <div className="flex-1 flex flex-col pb-28">
      {/* Top Bar / Location header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
              {customerName ? customerName.slice(0, 1) : 'U'}
            </div>
            <div>
              <p className="text-xs text-zinc-400">
                {orderType === 'DELIVERY' ? 'ส่งถึงคุณ:' : 'รับเองที่:'}
              </p>
              <p className="text-sm font-bold text-zinc-900 truncate max-w-[180px]">
                {orderType === 'DELIVERY'
                  ? location?.addressLine || 'ที่อยู่ปัจจุบัน'
                  : activeBranchName || 'สาขาหลัก'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="text-xs font-semibold text-rose-600 px-2.5 py-1.5 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
          >
            เปลี่ยนจุดส่ง
          </button>
        </div>

        {/* Category Pills Slider */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar pt-3">
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Categories & Product List */}
      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="space-y-4 pt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-zinc-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          categories.map((cat: any) => (
            <div key={cat.id} id={`category-${cat.id}`} className="space-y-3">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center space-x-2">
                <span>{cat.name}</span>
                <span className="text-xs text-zinc-400 font-normal">({cat.products?.length || 0})</span>
              </h2>

              <div className="space-y-3">
                {cat.products?.map((product: any) => (
                  <div
                    key={product.id}
                    onClick={() => handleOpenProduct(product)}
                    className={`relative p-3.5 bg-white border border-zinc-200/80 rounded-2xl shadow-sm flex space-x-3.5 transition cursor-pointer hover:border-zinc-300 ${
                      !product.isAvailable ? 'opacity-70 bg-zinc-50' : 'active:scale-[0.99]'
                    }`}
                  >
                    {/* Food Image / Placeholder */}
                    <div className="w-24 h-24 rounded-xl bg-zinc-100 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Utensils className="w-8 h-8 text-zinc-300" />
                      )}

                      {/* SOLD OUT Overlay */}
                      {!product.isAvailable && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-[10px] font-black text-white px-2 py-0.5 bg-red-600 rounded-md tracking-wider">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-zinc-900 text-sm leading-snug">
                            {product.name}
                          </h3>
                        </div>
                        {product.description && (
                          <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-rose-600 text-sm">
                          {formatPrice(product.basePrice)}
                        </span>

                        {product.isAvailable ? (
                          <button className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-sm transition">
                            <Plus className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-zinc-400">สินค้าหมด</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart && cart.totalItems > 0 && (
        <div className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-4 z-40">
          <button
            onClick={() => router.push('/cart')}
            className="w-full p-4 bg-zinc-900 text-white rounded-2xl shadow-2xl flex items-center justify-between hover:bg-black active:scale-[0.98] transition border border-zinc-800"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                {cart.totalItems}
              </div>
              <div className="text-left">
                <span className="text-xs text-zinc-400">ยอดรวมในตะกร้า</span>
                <p className="font-bold text-sm text-white">{formatPrice(cart.subtotal)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-sm font-semibold text-rose-400">
              <span>ดูตะกร้า</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Product Detail / Modifier Bottom Sheet Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900">{selectedProduct.name}</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Variants Section (if any) */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-800 uppercase">เลือกขนาด / เซ็ต</label>
                  <div className="space-y-2">
                    {selectedProduct.variants.map((variant: any) => (
                      <div
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          selectedVariantId === variant.id
                            ? 'border-rose-600 bg-rose-50/60 text-rose-900'
                            : 'border-zinc-200 bg-white text-zinc-700'
                        }`}
                      >
                        <span className="text-sm font-medium">{variant.name}</span>
                        <span className="text-sm font-bold">{formatPrice(variant.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifier Groups Section */}
              {selectedProduct.modifierGroups?.map((group: any) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 uppercase">
                      {group.name} {group.isRequired && <span className="text-rose-600">*</span>}
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      {group.maxSelect === 1 ? 'เลือก 1 อย่าง' : `เลือกสูงสุด ${group.maxSelect} อย่าง`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {group.modifiers?.map((mod: any) => {
                      const isSelected = selectedModifiers.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleToggleModifier(mod.id, group)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'border-rose-600 bg-rose-50/60 text-rose-900 font-medium'
                              : 'border-zinc-200 bg-white text-zinc-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-4 h-4 rounded-${group.maxSelect === 1 ? 'full' : 'md'} border flex items-center justify-center ${
                                isSelected ? 'border-rose-600 bg-rose-600 text-white' : 'border-zinc-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-sm">{mod.name}</span>
                          </div>
                          {Number(mod.price) > 0 && (
                            <span className="text-xs font-semibold text-zinc-500">
                              +{formatPrice(mod.price)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Special Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-800 uppercase">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="เช่น ไม่ใส่ต้นหอม, เผ็ดพิเศษ"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-zinc-800">จำนวน</span>
                <div className="flex items-center space-x-3 bg-zinc-100 p-1 rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 bg-white rounded-lg font-bold text-zinc-700 shadow-sm flex items-center justify-center hover:bg-zinc-200"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 bg-white rounded-lg font-bold text-zinc-700 shadow-sm flex items-center justify-center hover:bg-zinc-200"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50">
              <button
                type="button"
                disabled={addToCartMutation.isPending}
                onClick={handleAddToCart}
                className="w-full py-4 bg-rose-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-between px-6 hover:bg-rose-700 active:scale-[0.98] transition disabled:opacity-50"
              >
                <span>เพิ่มลงตะกร้า</span>
                <span>{formatPrice(calculateModalPrice())}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
