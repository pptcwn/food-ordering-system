'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatPrice } from '@/lib/utils';
import { WS_EVENTS } from '@food-ordering/types';
import { StickyCartBar } from '@/components/customer/sticky-cart-bar';
import { OrderModeSwitch } from '@/components/customer/order-mode-switch';
import { ProductThumbnail } from '@/components/customer/product-thumbnail';
import { getLatestReorderableOrder } from '@/lib/reorder';
import { useFeedback } from '@/components/ui/feedback-provider';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Bell,
  Sparkles,
  Flame,
  Plus,
  Minus,
  Star,
  Heart,
  ArrowLeft,
  Check,
  X,
  MapPin,
  Clock,
  Store,
  Utensils,
  Soup,
  Sandwich,
  CupSoda,
  Apple,
  CakeSlice,
  Salad,
  Package,
  ArrowRight,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'อาหารจานเดียว': Utensils,
  'เมนูแนะนำ': Flame,
  'ต้มยำ & แกง': Soup,
  'ของทานเล่น': Sandwich,
  'เครื่องดื่ม & ของหวาน': CupSoda,
  'ผลไม้ & ผักสด': Apple,
  'เบเกอรี่': CakeSlice,
  'สลัด & สุขภาพ': Salad,
  default: Package,
};

export default function MenuPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const {
    customerName,
    activeBranchId,
    activeBranchName,
    setActiveBranch,
    orderType,
    setOrderType,
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
  const [isLiked, setIsLiked] = useState(false);
  const [isBranchPickerOpen, setIsBranchPickerOpen] = useState(false);

  // Fetch Menu
  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ['menu', activeBranchId],
    queryFn: () => apiClient.get(`/menu?branchId=${activeBranchId || ''}`),
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  const { data: storefrontBranch } = useQuery<any>({
    queryKey: ['branch-storefront', activeBranchId],
    queryFn: () => apiClient.get(`/branches/${activeBranchId}`),
    enabled: Boolean(activeBranchId),
  });

  const selectedActiveBranch = branches.find((branch) => branch.id === activeBranchId);
  const storeName = storefrontBranch?.id === activeBranchId && storefrontBranch?.name
    ? storefrontBranch.name
    : selectedActiveBranch?.name || activeBranchName || 'ร้านของเรา';

  useEffect(() => {
    if (!branches.length) return;
    if (!selectedActiveBranch) {
      setActiveBranch(branches[0].id, branches[0].name);
    }
  }, [branches, selectedActiveBranch, setActiveBranch]);

  useEffect(() => {
    if (
      storefrontBranch?.id === activeBranchId &&
      storefrontBranch.name &&
      storefrontBranch.name !== activeBranchName
    ) {
      setActiveBranch(storefrontBranch.id, storefrontBranch.name);
    }
  }, [activeBranchId, activeBranchName, setActiveBranch, storefrontBranch]);

  // Fetch Cart
  const { data: cart } = useQuery<any>({
    queryKey: ['cart'],
    queryFn: () => apiClient.get('/cart'),
  });
  const { data: recentOrders = [] } = useQuery<any[]>({ queryKey: ['my-orders'], queryFn: () => apiClient.get('/orders/my-orders') });
  const quickOrder = getLatestReorderableOrder(recentOrders);
  const reorderMutation = useMutation({ mutationFn: async (order: any) => { for (const item of order.items) await apiClient.post('/cart/items', { productId: item.productId, productVariantId: item.productVariantId || undefined, quantity: item.quantity, specialNote: item.specialNote || undefined, modifierIds: item.modifiers?.map((m: any) => m.modifierId) || [] }); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }) });

  const handleSelectBranch = async (branch: any) => {
    if (branch.id === activeBranchId) {
      setIsBranchPickerOpen(false);
      return;
    }

    const cartUsesAnotherBranch = cart?.items?.some((item: any) => item.branchId && item.branchId !== branch.id);
    if (cartUsesAnotherBranch) {
      const confirmed = await confirm({
        title: 'เปลี่ยนสาขา?',
        description: 'รายการในตะกร้าเป็นของสาขาเดิม ระบบจะล้างตะกร้าก่อนแสดงเมนูของสาขาใหม่',
        confirmLabel: 'ล้างตะกร้าและเปลี่ยน',
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await apiClient.delete('/cart');
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      } catch (error: any) {
        notify(error.message || 'ไม่สามารถล้างตะกร้าของสาขาเดิมได้', 'error');
        return;
      }
    }

    setActiveBranch(branch.id, branch.name);
    setActiveCategory('');
    setIsBranchPickerOpen(false);
    queryClient.invalidateQueries({ queryKey: ['menu'] });
    queryClient.invalidateQueries({ queryKey: ['branch-storefront'] });
  };

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
      notify('เพิ่มลงตะกร้าแล้ว', 'success');
    },
    onError: (err: any) => {
      notify(err.message || 'ไม่สามารถเพิ่มสินค้าลงตะกร้าได้', 'error');
    },
  });

  const handleOpenProduct = (product: any) => {
    if (!product.isAvailable) return;
    setSelectedProduct(product);
    setSelectedVariantId(product.variants?.[0]?.id || '');
    setSelectedModifiers([]);
    setQuantity(1);
    setSpecialNote('');
    setIsLiked(false);
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

  // Extract all products for flash deals
  const allProducts = categories.flatMap((c: any) => c.products || []);
  const flashDealProducts = allProducts.slice(0, 4);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-1 flex-col bg-[#FAF8F5] pb-28">
      {/* 1. Header (Deliver to address + Notification Bell - Screen 2 style) */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-4 pb-3 border-b border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
          <button
            onClick={() => setIsBranchPickerOpen(true)}
            className="flex items-center gap-2 text-left min-w-0 flex-1 btn-tactile"
          >
            <div className="w-8 h-8 rounded-full bg-[#EAF8F1] text-[#00A86B] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block">{orderType === 'DELIVERY' ? 'จุดจัดส่งอาหาร' : 'รับสินค้าที่สาขา'}</span>
              <div className="flex items-center gap-1 font-bold text-xs text-slate-800 truncate">
                <span className="truncate">
                  {orderType === 'DELIVERY'
                    ? location?.addressLine || 'เลือกจุดปักหมุด'
                    : storeName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/orders')}
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 transition-colors btn-tactile relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00A86B]" />
          </button>
        </div>

        {/* Search Bar with Filter Button */}
        <div className="mt-3.5 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาอาหารและเครื่องดื่ม..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#00A86B] rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
          <OrderModeSwitch value={orderType} onValueChange={(mode) => { setOrderType(mode); if (mode === 'DELIVERY' && !location?.addressLine) router.push('/onboarding'); }} />
          <button className="w-10 h-10 rounded-2xl bg-[#00A86B] text-white flex items-center justify-center shadow-md shadow-[#00A86B]/25 btn-tactile flex-shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-5">
        <section className="overflow-hidden rounded-3xl bg-white border border-[#D5E5DA] shadow-soft">
          <div
            className="relative h-36 bg-[#1F5D45]"
            style={{ backgroundColor: storefrontBranch?.storefrontThemeColor || '#1F5D45' }}
          >
            {storefrontBranch?.storefrontCoverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storefrontBranch.storefrontCoverUrl}
                alt={`ภาพปก ${storefrontBranch.name}`}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
          </div>
          <div className="relative px-4 pb-4">
            <div className="absolute -top-10 left-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-[#FAF8F5] shadow-md">
              {storefrontBranch?.storefrontProfileUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storefrontBranch.storefrontProfileUrl} alt={`โลโก้ ${storefrontBranch.name}`} className="w-full h-full object-cover" />
              ) : (
                <Utensils className="w-8 h-8" style={{ color: storefrontBranch?.storefrontThemeColor || '#1F5D45' }} />
              )}
            </div>
            <div className="pt-12">
              <h1 className="text-lg font-black text-slate-900">{storeName}</h1>
              {storefrontBranch?.storefrontHeadline && (
                <p className="mt-1 text-sm font-extrabold" style={{ color: storefrontBranch.storefrontThemeColor || '#1F5D45' }}>
                  {storefrontBranch.storefrontHeadline}
                </p>
              )}
              {storefrontBranch?.storefrontSubheadline && <p className="mt-1 text-xs text-slate-500">{storefrontBranch.storefrontSubheadline}</p>}
            </div>
          </div>
        </section>
        {quickOrder && <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">สั่งซ้ำล่าสุด</p><div className="mt-1 flex items-center justify-between gap-3"><p className="truncate text-sm font-bold text-slate-900">{quickOrder.items?.map((item: any) => item.productName || item.product?.name).filter(Boolean).join(', ') || 'รายการล่าสุด'}</p><button type="button" disabled={reorderMutation.isPending} onClick={() => reorderMutation.mutate(quickOrder)} className="shrink-0 rounded-lg bg-[#1F5D45] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{reorderMutation.isPending ? 'กำลังเพิ่ม...' : 'เพิ่มทั้งหมด'}</button></div></section>}
        {/* 2. Featured Fresh Banner (Matching Reference Screen 2) */}
        {!searchQuery && false && (
          <div className="bg-gradient-to-r from-[#EAF8F1] via-[#E4F5ED] to-[#FAF1E6] rounded-3xl p-5 shadow-soft border border-emerald-100/50 flex items-center justify-between relative overflow-hidden">
            <div className="space-y-2 max-w-[60%] relative z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00A86B] bg-white px-2.5 py-1 rounded-full shadow-xs">
                Special Offer
              </span>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                สดใหม่ ส่งไว อร่อยทุกมื้อ <span className="text-[#00A86B]">ลดสูงสุด 30%</span>
              </h2>
              <button
                onClick={() => {
                  document.getElementById('menu-items-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-[#00A86B] hover:bg-[#00925D] text-white font-bold text-xs rounded-full shadow-md shadow-[#00A86B]/30 flex items-center gap-1.5 transition-all btn-tactile"
              >
                <span>สั่งเลย</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3D Food Basket Image */}
            <div className="w-28 h-28 relative flex items-center justify-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80"
                alt="Fresh Food Basket"
                className="w-24 h-24 object-cover rounded-2xl shadow-md rotate-3 hover:rotate-0 transition-transform"
              />
            </div>
          </div>
        )}

        {/* 3. Category Grid (4x2 soft rounded tiles - Matching Reference Screen 2) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-extrabold text-sm text-slate-900">หมวดหมู่สินค้า</h3>
            <button
              onClick={() => setActiveCategory('')}
              className="text-xs font-bold text-[#00A86B] hover:underline"
            >
              ดูทั้งหมด
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat: any) => {
              const CategoryIcon = CATEGORY_ICONS[cat.name] || CATEGORY_ICONS.default;
              const isCurrent = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`shrink-0 rounded-2xl px-3 py-2.5 flex items-center gap-2 transition-all btn-tactile ${
                    isCurrent
                      ? 'bg-white shadow-soft ring-2 ring-[#00A86B] text-[#00A86B]'
                      : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-100'
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] shadow-xs">
                    <CategoryIcon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="whitespace-nowrap text-xs font-bold">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Flash Deals Section with Countdown Timer (Matching Reference Screen 2) */}
        {!searchQuery && false && flashDealProducts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1">
                  <span>ดีลเด็ดประจำวัน</span>
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                </h3>
                {/* Live Countdown Pill */}
                <div className="flex items-center gap-1 font-mono text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">
                  <Clock className="w-3 h-3" />
                  <span>02 : 45 : 30</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#00A86B]">See All</span>
            </div>

            {/* Horizontal Flash Deals Carousel */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4">
              {flashDealProducts.map((product: any) => (
                <div
                  key={product.id}
                  onClick={() => handleOpenProduct(product)}
                  className="w-32 bg-white rounded-2xl p-3 border border-slate-100 shadow-soft flex-shrink-0 flex flex-col justify-between cursor-pointer hover:border-emerald-200 transition-all btn-tactile"
                >
                  <div className="w-full h-20 rounded-xl bg-slate-50 overflow-hidden mb-2 relative flex items-center justify-center">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Utensils className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-slate-900 truncate">{product.name}</h4>
                    <span className="text-[10px] text-slate-400 block">จานเด็ด</span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1">
                    <span className="font-extrabold text-xs text-slate-900">
                      {formatPrice(product.basePrice)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProduct(product);
                      }}
                      className="w-6 h-6 rounded-full bg-[#00A86B] text-white flex items-center justify-center shadow-xs hover:bg-[#00925D] btn-tactile"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Menu Categories & Product Cards Grid (Matching Reference Screen 2 "Best Selling") */}
        <div id="menu-items-section" className="space-y-6 pt-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-white rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            categories.map((cat: any) => {
              const filteredProducts = cat.products?.filter((p: any) =>
                searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true,
              );

              if (filteredProducts?.length === 0 && searchQuery) return null;

              return (
                <div key={cat.id} id={`category-${cat.id}`} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>{cat.name}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({filteredProducts?.length || 0})
                      </span>
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {filteredProducts?.map((product: any) => (
                      <div
                        key={product.id}
                        onClick={() => handleOpenProduct(product)}
                        className={`p-3.5 bg-white border border-slate-100 rounded-3xl shadow-soft flex gap-3.5 transition-all cursor-pointer hover:border-emerald-200 ${
                          !product.isAvailable ? 'opacity-70 bg-slate-50' : 'btn-tactile active:scale-[0.99]'
                        }`}
                      >
                        {/* Food Image */}
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#D5E5DA]">
                          <ProductThumbnail src={product.imageUrl} alt={product.name} />

                          {!product.isAvailable && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                              <span className="text-[9px] font-black text-white px-1.5 py-0.5 bg-rose-600 rounded">
                                หมด
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-bold text-slate-900 text-sm truncate">
                                {product.name}
                              </h4>
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200/50 flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                4.8
                              </span>
                            </div>
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
                                className="w-7 h-7 rounded-full bg-[#00A86B] hover:bg-[#00925D] text-white flex items-center justify-center shadow-xs transition-colors btn-tactile"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400">หมด</span>
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
      </div>

      {/* 6. Product Details Bottom Sheet Modal (Exact Match to Reference Screen 4) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0">
          <div className="w-full max-w-[480px] bg-white rounded-t-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Modal Header Bar */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors btn-tactile"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-slate-900">รายละเอียดสินค้า</h3>
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors btn-tactile ${
                  isLiked ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-slate-100 border-transparent text-slate-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-3 overflow-y-auto space-y-4 flex-1">
              {/* Product Hero Image */}
              <div className="w-full h-48 rounded-3xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-soft">
                {selectedProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Utensils className="w-12 h-12 text-slate-300" />
                )}
              </div>

              {/* Title & Rating */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-black text-lg text-slate-900">{selectedProduct.name}</h2>
                    <span className="text-xs text-slate-400">จานเด็ดปรุงสดใหม่</span>
                  </div>
                  <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200/60 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    4.8 (230)
                  </span>
                </div>

                {/* Price tag with 18% OFF badge */}
                <div className="flex items-center gap-2.5 mt-2">
                  <span className="text-2xl font-black text-slate-900">
                    {formatPrice(selectedProduct.basePrice)}
                  </span>
                  <span className="text-xs font-bold bg-[#EAF8F1] text-[#00A86B] px-2 py-0.5 rounded-md">
                    18% OFF
                  </span>
                </div>

                {selectedProduct.description && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}
              </div>

              {/* Variants Section */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-extrabold text-slate-800">เลือกขนาด / เซ็ต</label>
                  <div className="space-y-1.5">
                    {selectedProduct.variants.map((variant: any) => (
                      <div
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedVariantId === variant.id
                            ? 'border-[#00A86B] bg-[#EAF8F1] text-slate-900 font-bold'
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
                <div key={group.id} className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800">
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
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#00A86B] bg-[#EAF8F1] text-slate-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 rounded-${group.maxSelect === 1 ? 'full' : 'md'} border flex items-center justify-center ${
                                isSelected ? 'border-[#00A86B] bg-[#00A86B] text-white' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-xs">{mod.name}</span>
                          </div>
                          {Number(mod.price) > 0 && (
                            <span className="text-xs font-bold text-slate-600">
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
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-800">หมายเหตุถึงร้านค้า</label>
                <input
                  type="text"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="เช่น ไม่ใส่ผักชี, เผ็ดน้อย"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A86B]"
                />
              </div>
            </div>

            {/* Modal Bottom CTA Bar with Quantity Stepper (Exact Match to Reference Screen 4) */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-3">
              {/* Stepper */}
              <div className="flex items-center gap-3 bg-slate-100 px-3 py-2 rounded-full">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-800 font-black shadow-xs hover:bg-slate-200 btn-tactile text-xs"
                >
                  -
                </button>
                <span className="w-4 text-center font-black text-xs">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-800 font-black shadow-xs hover:bg-slate-200 btn-tactile text-xs"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Pill Button */}
              <button
                type="button"
                disabled={addToCartMutation.isPending}
                onClick={handleAddToCart}
                className="flex-1 py-3.5 bg-[#00A86B] hover:bg-[#00925D] text-white font-extrabold text-sm rounded-full shadow-lg shadow-[#00A86B]/30 flex items-center justify-between px-6 transition-all btn-tactile disabled:opacity-50"
              >
                <span>เพิ่มลงตะกร้า</span>
                <span>{formatPrice(calculateModalPrice())}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Bottom Navigation Bar */}
      <StickyCartBar itemCount={cart?.totalItems || 0} total={Number(cart?.subtotal || 0)} onOpen={() => router.push('/cart')} />

      {isBranchPickerOpen && (
        <div className="fixed inset-0 z-[90] flex items-end bg-slate-950/45 p-4 backdrop-blur-[2px] sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="branch-picker-title">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1F5D45]">Choose branch</p><h2 id="branch-picker-title" className="mt-1 text-lg font-black text-slate-900">เลือกสาขาที่ต้องการสั่ง</h2></div>
              <button type="button" onClick={() => setIsBranchPickerOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label="ปิด"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-2">
              {branches.map((branch: any) => {
                const selected = branch.id === activeBranchId;
                return (
                  <button key={branch.id} type="button" onClick={() => handleSelectBranch(branch)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-[#1F5D45] bg-[#EAF3EE]' : 'border-slate-200 bg-white hover:border-[#1F5D45]/50'}`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-[#1F5D45] text-white' : 'bg-slate-100 text-slate-600'}`}><Store className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{branch.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{branch.address || branch.code}</p></div>
                    {selected && <Check className="h-5 w-5 shrink-0 text-[#1F5D45]" />}
                  </button>
                );
              })}
              {branches.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">ไม่พบสาขาที่เปิดให้บริการ</p>}
            </div>
            <button type="button" onClick={() => { setIsBranchPickerOpen(false); router.push('/onboarding'); }} className="mt-4 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200">แก้ไขข้อมูลจัดส่งและตำแหน่ง</button>
          </div>
        </div>
      )}
    </div>
  );
}
