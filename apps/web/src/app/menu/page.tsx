'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { WS_EVENTS } from '@food-ordering/types';
import { StickyCartBar } from '@/components/customer/sticky-cart-bar';
import { getLatestReorderableOrder } from '@/lib/reorder';
import { useFeedback } from '@/components/ui/feedback-provider';
import { Skeleton, SkeletonCard, SkeletonList, SkeletonText } from '@/components/ui/skeleton';
import { Flame, Clock } from 'lucide-react';

import { MenuHeader } from '@/components/customer/menu-header';
import { StorefrontHero } from '@/components/customer/storefront-hero';
import { CategoryNav } from '@/components/customer/category-nav';
import { ProductCard } from '@/components/customer/product-card';
import { ProductDetailModal } from '@/components/customer/product-detail-modal';
import { BranchPickerModal } from '@/components/customer/branch-picker-modal';
import { FlashDealCard } from '@/components/customer/flash-deal-card';

export default function MenuPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const {
    activeBranchId,
    activeBranchName,
    setActiveBranch,
    orderType,
    setOrderType,
    location,
  } = useAppStore();

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
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
  
  const { data: recentOrders = [] } = useQuery<any[]>({ 
    queryKey: ['my-orders'], 
    queryFn: () => apiClient.get('/orders/my-orders') 
  });
  const quickOrder = getLatestReorderableOrder(recentOrders);
  
  const reorderMutation = useMutation({ 
    mutationFn: async (order: any) => { 
      for (const item of order.items) {
        await apiClient.post('/cart/items', { 
          productId: item.productId, 
          productVariantId: item.productVariantId || undefined, 
          quantity: item.quantity, 
          specialNote: item.specialNote || undefined, 
          modifierIds: item.modifiers?.map((m: any) => m.modifierId) || [] 
        }); 
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }) 
  });

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
      notify('เพิ่มลงตะกร้าแล้ว', 'success');
    },
    onError: (err: any) => {
      notify(err.message || 'ไม่สามารถเพิ่มสินค้าลงตะกร้าได้', 'error');
    },
  });

  const handleOpenProduct = (product: any) => {
    if (!product.isAvailable) return;
    setSelectedProduct(product);
  };

  const handleAddToCart = (payload: { quantity: number; specialNote: string; selectedVariantId: string; selectedModifiers: string[] }) => {
    if (!selectedProduct) return;
    addToCartMutation.mutate({
      branchId: activeBranchId,
      productId: selectedProduct.id,
      productVariantId: payload.selectedVariantId || undefined,
      quantity: payload.quantity,
      specialNote: payload.specialNote.trim() || undefined,
      modifierIds: payload.selectedModifiers,
    });
  };

  const allProducts = categories.flatMap((c: any) => c.products || []);
  const flashDealProducts = allProducts.slice(0, 4);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-1 flex-col bg-[#FAF8F5] pb-28">
      <MenuHeader
        orderType={orderType}
        onOrderTypeChange={setOrderType}
        deliveryAddress={location?.addressLine}
        storeName={storeName}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onBranchPickerOpen={() => setIsBranchPickerOpen(true)}
      />

      <div className="p-4 space-y-5">
        {isLoading ? (
          <div className="space-y-5">
            <SkeletonCard className="h-[200px]" />
            <div className="flex gap-2 overflow-hidden py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-9 w-20 rounded-full flex-shrink-0" />
              ))}
            </div>
            <SkeletonList count={4} />
          </div>
        ) : (
          <>
            <StorefrontHero storefront={storefrontBranch} storeName={storeName} />
            
            {quickOrder && (
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-800">สั่งซ้ำล่าสุด</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {quickOrder.items?.map((item: any) => item.productName || item.product?.name).filter(Boolean).join(', ') || 'รายการล่าสุด'}
                  </p>
                  <button 
                    type="button" 
                    disabled={reorderMutation.isPending} 
                    onClick={() => reorderMutation.mutate(quickOrder)} 
                    className="shrink-0 rounded-lg bg-[#1F5D45] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {reorderMutation.isPending ? 'กำลังเพิ่ม...' : 'เพิ่มทั้งหมด'}
                  </button>
                </div>
              </section>
            )}

            <div>
              <CategoryNav
                categories={categories}
                activeCategoryId={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            </div>

            {/* Flash Deals Section */}
            {!searchQuery && false && flashDealProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1">
                      <span>ดีลเด็ดประจำวัน</span>
                      <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    </h3>
                    <div className="flex items-center gap-1 font-mono text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">
                      <Clock className="w-3 h-3" />
                      <span>02 : 45 : 30</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#1F5D45]">See All</span>
                </div>

                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4">
                  {flashDealProducts.map((product: any) => (
                    <FlashDealCard
                      key={product.id}
                      product={product}
                      onSelect={handleOpenProduct}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div id="menu-items-section" className="space-y-6 pt-1">
              {categories.map((cat: any) => {
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
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelect={handleOpenProduct}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        isAddingToCart={addToCartMutation.isPending}
      />

      <StickyCartBar 
        itemCount={cart?.totalItems || 0} 
        total={Number(cart?.subtotal || 0)} 
        onOpen={() => router.push('/cart')} 
      />

      <BranchPickerModal
        branches={branches}
        activeBranchId={activeBranchId}
        isOpen={isBranchPickerOpen}
        onClose={() => setIsBranchPickerOpen(false)}
        onSelect={handleSelectBranch}
      />
    </div>
  );
}
