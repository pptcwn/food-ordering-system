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
  Search,
  Store,
  Star,
  Sparkles,
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
  const [searchQuery, setSearchQuery] = useState('');

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

    socket.on(WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED, () => {
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
      const otherGroupModIds = group.modifiers.map((m: any) => m.id);
      const filtered = selectedModifiers.filter((id) => !otherGroupModIds.includes(id));
      setSelectedModifiers([...filtered, modifierId]);
    } else {
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
    <div className="flex-1 flex flex-col bg-slate-50 pb-32 min-h-screen">
      {/* 1. Header with Delivery Address & Store Banner (LINE MAN / Grab style) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-xs">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#06C755] flex items-center justify-center flex-shrink-0 font-bold text-xs border border-emerald-100">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>{orderType === 'DELIVERY' ? 'ส่งถึงคุณที่' : 'รับเองที่ร้าน'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#06C755]" />
                <span className="text-[#06C755] font-semibold">20-30 นาที</span>
              </div>
              <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                {orderType === 'DELIVERY'
                  ? location?.addressLine || 'ที่อยู่จัดส่งปัจจุบัน'
                  : activeBranchName || 'สาขาหลัก'}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/onboarding')}
            className="text-[11px] font-bold text-[#06C755] px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-full border border-emerald-100 transition-colors btn-tactile flex-shrink-0"
          >
            เปลี่ยนจุดส่ง
          </button>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนูโปรดของคุณ..."
              className="w-full pl-9.5 pr-4 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-[#06C755] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Sticky Horizontal Category Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3 pt-1">
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all btn-tactile ${
                activeCategory === cat.id
                  ? 'bg-[#06C755] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Restaurant Promotion Banner */}
      <div className="p-3.5">
        <div className="bg-gradient-to-r from-emerald-600 to-[#06C755] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="relative z-10">
            <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full uppercase tracking-wider">
              Special Promo
            </span>
            <h3 className="text-base font-extrabold mt-1">ส่งฟรีทุกออเดอร์ วันนี้!</h3>
            <p className="text-xs text-white/90 mt-0.5">เมื่อสั่งซื้อขั้นต่ำ ฿150 ขึ้นไป</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white flex-shrink-0">
            <Flame className="w-7 h-7 text-amber-300" />
          </div>
        </div>
      </div>

      {/* 3. Menu Categories & Product Cards */}
      <div className="px-3.5 space-y-5">
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white border border-slate-200/80 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          categories.map((cat: any) => {
            const filteredProducts = cat.products?.filter((p: any) =>
              searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true,
            );

            if (filteredProducts?.length === 0 && searchQuery) return null;

            return (
              <div key={cat.id} id={`category-${cat.id}`} className="space-y-2.5">
                <div className="flex items-center justify-between pt-1">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{cat.name}</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({filteredProducts?.length || 0})
                    </span>
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {filteredProducts?.map((product: any) => (
                    <div
                      key={product.id}
                      onClick={() => handleOpenProduct(product)}
                      className={`relative p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex gap-3.5 transition-all cursor-pointer hover:border-emerald-200 ${
                        !product.isAvailable ? 'opacity-70 bg-slate-50' : 'btn-tactile active:scale-[0.99]'
                      }`}
                    >
                      {/* Food Thumbnail */}
                      <div className="w-24 h-24 rounded-xl bg-slate-100 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Utensils className="w-8 h-8 text-slate-300" />
                        )}

                        {/* SOLD OUT Overlay */}
                        {!product.isAvailable && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                            <span className="text-[10px] font-black text-white px-2 py-0.5 bg-rose-600 rounded-md tracking-wider">
                              หมดชั่วคราว
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {formatPrice(product.basePrice)}
                          </span>

                          {product.isAvailable ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProduct(product);
                              }}
                              className="px-3 py-1 bg-[#06C755] hover:bg-[#05A848] text-white text-xs font-bold rounded-full shadow-xs flex items-center gap-1 transition-colors btn-tactile"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              เพิ่ม
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">หมด</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Floating Sticky Bottom Cart Bar (Grab / LINE MAN Green) */}
      {cart && cart.totalItems > 0 && (
        <div className="fixed bottom-4 inset-x-0 max-w-[480px] mx-auto px-3.5 z-40">
          <button
            onClick={() => router.push('/cart')}
            className="w-full p-3.5 bg-[#06C755] hover:bg-[#05A848] text-white rounded-2xl shadow-floating flex items-center justify-between transition-all btn-tactile border border-emerald-400/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white text-[#06C755] flex items-center justify-center font-bold text-xs shadow-xs">
                {cart.totalItems}
              </div>
              <div className="text-left">
                <span className="text-[11px] text-white/90 block">ตะกร้าของคุณ</span>
                <p className="font-extrabold text-sm text-white">{formatPrice(cart.subtotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold bg-white/20 px-3.5 py-1.5 rounded-full backdrop-blur-md">
              <span>ดูตะกร้า</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* 5. Product Modifier Bottom Sheet Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">{selectedProduct.name}</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Variants Section */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 uppercase">เลือกขนาด / เซ็ต</label>
                  <div className="space-y-1.5">
                    {selectedProduct.variants.map((variant: any) => (
                      <div
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedVariantId === variant.id
                            ? 'border-[#06C755] bg-emerald-50/70 text-slate-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <span className="text-xs">{variant.name}</span>
                        <span className="text-xs font-bold">{formatPrice(variant.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifier Groups Section */}
              {selectedProduct.modifierGroups?.map((group: any) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {group.name} {group.isRequired && <span className="text-rose-600">*</span>}
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {group.maxSelect === 1 ? 'เลือก 1 อย่าง' : `เลือกได้สูงสุด ${group.maxSelect} อย่าง`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {group.modifiers?.map((mod: any) => {
                      const isSelected = selectedModifiers.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleToggleModifier(mod.id, group)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#06C755] bg-emerald-50/70 text-slate-900 font-semibold'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 rounded-${group.maxSelect === 1 ? 'full' : 'md'} border flex items-center justify-center ${
                                isSelected ? 'border-[#06C755] bg-[#06C755] text-white' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-xs">{mod.name}</span>
                          </div>
                          {Number(mod.price) > 0 && (
                            <span className="text-xs font-semibold text-slate-500">
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
                <label className="text-xs font-bold text-slate-800">
                  หมายเหตุเพิ่มเติมสำหรับร้านค้า
                </label>
                <input
                  type="text"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="เช่น ไม่ใส่ผักชี, เผ็ดน้อย, แยกน้ำซุป"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white"
                />
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-800">จำนวน</span>
                <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 bg-white rounded-lg font-bold text-slate-700 shadow-xs flex items-center justify-center hover:bg-slate-200 btn-tactile"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-xs">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 bg-white rounded-lg font-bold text-slate-700 shadow-xs flex items-center justify-center hover:bg-slate-200 btn-tactile"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                disabled={addToCartMutation.isPending}
                onClick={handleAddToCart}
                className="w-full py-3.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-between px-5 transition-colors btn-tactile disabled:opacity-50"
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
