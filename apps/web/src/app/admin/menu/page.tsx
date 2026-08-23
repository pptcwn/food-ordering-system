'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useFeedback } from '@/components/ui/feedback-provider';
import { Tabs, TabItem } from '@/components/ui/tabs';
import {
  Utensils,
  Plus,
  Sparkles,
  ArrowLeft,
  Search,
  Layers,
  Eye,
  Loader2,
} from 'lucide-react';

import { MenuItemCard } from '@/components/admin/menu-item-card';
import { ProductFormModal } from '@/components/admin/product-form-modal';
import { CategoryManager } from '@/components/admin/category-manager';
import { StorefrontEditor, StorefrontData } from '@/components/admin/storefront-editor';

export default function AdminMenuManagerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();

  const [activeTab, setActiveTab] = useState<'MENU' | 'DECORATE' | 'CATEGORIES'>('MENU');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Queries
  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-menu-categories'],
    queryFn: () => apiClient.get('/menu'),
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  const { data: selectedBranch, isLoading: isLoadingStorefront } = useQuery<any>({
    queryKey: ['branch-storefront', selectedBranchId],
    queryFn: () => apiClient.get(`/branches/${selectedBranchId}`),
    enabled: Boolean(selectedBranchId),
  });

  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/admin/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setIsProductModalOpen(false);
      setEditingProduct(null);
      notify('เพิ่มเมนูอาหารเรียบร้อยแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถสร้างเมนูได้', 'error'),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.patch(`/admin/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setIsProductModalOpen(false);
      setEditingProduct(null);
      notify('บันทึกการแก้ไขเมนูแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถแก้ไขเมนูได้', 'error'),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      notify('ลบเมนูออกจากรายการแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถลบเมนูได้', 'error'),
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      apiClient.patch(`/admin/products/${id}/availability`, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => apiClient.post('/categories/admin', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      notify('เพิ่มหมวดหมู่เรียบร้อยแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถเพิ่มหมวดหมู่ได้', 'error'),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.patch(`/categories/admin/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      notify('บันทึกการแก้ไขหมวดหมู่แล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถแก้ไขหมวดหมู่ได้', 'error'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/categories/admin/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      notify('ลบหมวดหมู่ออกจากหน้าร้านแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถลบหมวดหมู่ได้', 'error'),
  });

  const updateStorefrontMutation = useMutation({
    mutationFn: (data: StorefrontData) =>
      apiClient.patch(`/branches/${selectedBranchId}/storefront`, {
        storefrontCoverUrl: data.coverUrl || null,
        storefrontProfileUrl: data.profileUrl || null,
        storefrontHeadline: data.headline.trim() || null,
        storefrontSubheadline: data.subheadline.trim() || null,
        storefrontThemeColor: data.themeColor,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-storefront', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      notify('บันทึกหน้าร้านเรียบร้อยแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถบันทึกหน้าร้านได้', 'error'),
  });

  // Handlers
  const handleSaveProduct = (formData: any) => {
    if (!formData.name.trim() || !formData.basePrice) {
      notify('กรุณากรอกชื่อและราคาอาหาร', 'warning');
      return;
    }

    const basePrice = parseFloat(formData.basePrice);
    const salePrice = formData.salePrice === '' ? null : parseFloat(formData.salePrice);
    if (salePrice !== null && salePrice >= basePrice) {
      notify('ราคาส่วนลดต้องน้อยกว่าราคาปกติ', 'warning');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      categoryId: formData.categoryId,
      basePrice,
      salePrice,
      description: formData.description.trim() || undefined,
      imageUrl: formData.imageUrl || undefined,
      isAvailable: formData.isAvailable,
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createProductMutation.mutate(payload);
    }
  };

  const handleDeleteProduct = async (product: any) => {
    const isConfirmed = await confirm({
      title: 'ลบเมนูนี้หรือไม่?',
      description: `เมนู “${product.name}” จะหายจากหน้าร้านทันที`,
      confirmLabel: 'ลบเมนู',
      destructive: true,
    });
    if (isConfirmed) deleteProductMutation.mutate(product.id);
  };

  const handleDeleteCategory = async (category: any) => {
    const isConfirmed = await confirm({
      title: 'ลบหมวดหมู่นี้?',
      description: category.products?.length
        ? `เมนู ${category.products.length} รายการในหมวด “${category.name}” จะไม่แสดงที่หน้าร้าน แต่ข้อมูลเดิมยังเก็บไว้`
        : `หมวด “${category.name}” จะไม่แสดงที่หน้าร้าน แต่ข้อมูลเดิมยังเก็บไว้`,
      confirmLabel: 'ลบหมวดหมู่',
      destructive: true,
    });
    if (isConfirmed) deleteCategoryMutation.mutate(category.id);
  };

  const tabs: TabItem[] = [
    { id: 'MENU', label: 'รายการเมนูอาหาร', icon: <Utensils className="w-4 h-4" /> },
    { id: 'DECORATE', label: 'ตกแต่งหน้าร้าน & แบนเนอร์', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'CATEGORIES', label: 'หมวดหมู่', icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 pb-24 bg-slate-50 min-h-screen">
      {/* 1. Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors btn-tactile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              จัดการและตกแต่งเมนูอาหาร (Menu & Store Decoration)
            </h1>
            <p className="text-xs text-slate-500">
              เพิ่ม-แก้ไขเมนู, ปรับราคา, อัปโหลดรูปภาพ และตกแต่งแบนเนอร์หน้าร้าน
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/menu')}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors btn-tactile"
          >
            <Eye className="w-4 h-4 text-[#06C755]" />
            <span>ดูหน้าเมนูลูกค้า</span>
          </button>
          <button
            onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
            className="px-4 py-2 bg-[#06C755] hover:bg-[#05A848] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors btn-tactile"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มเมนูอาหารใหม่</span>
          </button>
        </div>
      </div>

      <div className="my-4 max-w-md">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          variant="filled"
        />
      </div>

      {activeTab === 'MENU' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อเมนู..."
                className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                <option value="">ทุกหมวดหมู่ ({categories.length})</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.products?.length || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-7 h-7 text-[#06C755] animate-spin mb-2" />
              <p className="text-xs text-slate-500">กำลังโหลดรายการอาหาร...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories
                .filter((cat) => (selectedCategoryId ? cat.id === selectedCategoryId : true))
                .map((cat: any) => {
                  const filteredProducts = cat.products?.filter((p: any) =>
                    searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true,
                  );

                  if (filteredProducts?.length === 0 && searchQuery) return null;

                  return (
                    <div key={cat.id} className="space-y-3">
                      <div className="flex items-center justify-between pb-1">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>{cat.name}</span>
                          <span className="text-xs text-slate-400 font-normal">
                            ({filteredProducts?.length || 0} รายการ)
                          </span>
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredProducts?.map((product: any) => (
                          <MenuItemCard
                            key={product.id}
                            product={{ ...product, categoryId: cat.id }}
                            onEdit={(p) => { setEditingProduct(p); setIsProductModalOpen(true); }}
                            onDelete={handleDeleteProduct}
                            onToggleAvailability={(p) =>
                              toggleAvailabilityMutation.mutate({ id: p.id, isAvailable: !p.isAvailable })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'DECORATE' && (
        <StorefrontEditor
          branches={branches}
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          selectedBranch={selectedBranch}
          onSave={(data) => updateStorefrontMutation.mutate(data)}
          isSaving={updateStorefrontMutation.isPending}
          isLoading={isLoadingStorefront}
        />
      )}

      {activeTab === 'CATEGORIES' && (
        <CategoryManager
          categories={categories}
          onAdd={(name) => createCategoryMutation.mutate(name)}
          onEdit={(id, name) => updateCategoryMutation.mutate({ id, name })}
          onDelete={handleDeleteCategory}
          isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending}
        />
      )}

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSubmit={handleSaveProduct}
        isSubmitting={createProductMutation.isPending || updateProductMutation.isPending}
      />
    </div>
  );
}
