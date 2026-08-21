'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useFeedback } from '@/components/ui/feedback-provider';
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Upload,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  Search,
  Store,
  Layers,
  Flame,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Sliders,
  DollarSign,
  Camera,
} from 'lucide-react';

const PRESET_FOOD_IMAGES = [
  { name: 'ผัดกะเพราไข่ดาว', url: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80' },
  { name: 'ข้าวผัดต้มยำกุ้ง', url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&auto=format&fit=crop&q=80' },
  { name: 'ผัดไทยกุ้งสด', url: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=80' },
  { name: 'ต้มยำกุ้งน้ำข้น', url: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=80' },
  { name: 'ไก่ทอดหาดใหญ่', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80' },
  { name: 'ชาไทยเย็น / ชานม', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80' },
  { name: 'ข้าวเหนียวมะม่วง', url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80' },
  { name: 'ส้มตำไทยไข่เค็ม', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80' },
];

export default function AdminMenuManagerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();

  const [activeTab, setActiveTab] = useState<'MENU' | 'DECORATE' | 'CATEGORIES'>('MENU');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form States for Product
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    basePrice: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
  });

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [storefront, setStorefront] = useState({
    coverUrl: '',
    profileUrl: '',
    headline: '',
    subheadline: '',
    themeColor: '#1F5D45',
  });

  // Fetch Categories & Menu
  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-menu-categories'],
    queryFn: () => apiClient.get('/menu'),
  });

  // Fetch Branches
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

  useEffect(() => {
    if (!selectedBranch) return;
    setStorefront({
      coverUrl: selectedBranch.storefrontCoverUrl || '',
      profileUrl: selectedBranch.storefrontProfileUrl || '',
      headline: selectedBranch.storefrontHeadline || '',
      subheadline: selectedBranch.storefrontSubheadline || '',
      themeColor: selectedBranch.storefrontThemeColor || '#1F5D45',
    });
  }, [selectedBranch]);

  // Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/admin/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setIsProductModalOpen(false);
      resetProductForm();
      notify('เพิ่มเมนูอาหารเรียบร้อยแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถสร้างเมนูได้', 'error'),
  });

  // Update Product Mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.patch(`/admin/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setIsProductModalOpen(false);
      resetProductForm();
      notify('บันทึกการแก้ไขเมนูแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถแก้ไขเมนูได้', 'error'),
  });

  // Delete Product Mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      notify('ลบเมนูออกจากรายการแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถลบเมนูได้', 'error'),
  });

  // Toggle Availability Mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      apiClient.patch(`/admin/products/${id}/availability`, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });

  // Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => apiClient.post('/categories/admin', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
      notify('เพิ่มหมวดหมู่เรียบร้อยแล้ว', 'success');
    },
    onError: (err: any) => notify(err.message || 'ไม่สามารถเพิ่มหมวดหมู่ได้', 'error'),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.patch(`/categories/admin/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setNewCategoryName('');
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
    mutationFn: (data: typeof storefront) =>
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

  const resetProductForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      basePrice: '',
      description: '',
      imageUrl: '',
      isAvailable: true,
    });
  };

  const handleOpenCreateProduct = () => {
    resetProductForm();
    if (categories.length > 0) {
      setFormData((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: any, catId: string) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.categoryId || catId,
      basePrice: product.basePrice.toString(),
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      isAvailable: product.isAvailable,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (category: any) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, name });
      return;
    }
    createCategoryMutation.mutate(name);
  };

  const handleDeleteCategory = async (category: any) => {
    if (deleteCategoryMutation.isPending) return;
    const confirmed = await confirm({
      title: 'ลบหมวดหมู่นี้?',
      description: category.products?.length
        ? `เมนู ${category.products.length} รายการในหมวด “${category.name}” จะไม่แสดงที่หน้าร้าน แต่ข้อมูลเดิมยังเก็บไว้`
        : `หมวด “${category.name}” จะไม่แสดงที่หน้าร้าน แต่ข้อมูลเดิมยังเก็บไว้`,
      confirmLabel: 'ลบหมวดหมู่',
      destructive: true,
    });
    if (confirmed) deleteCategoryMutation.mutate(category.id);
  };

  // Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      const data = new FormData();
      data.append('file', file);

      try {
        const res: any = await apiClient.post('/storage/upload', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.url) {
          setFormData((prev) => ({ ...prev, imageUrl: res.url }));
        }
      } catch (err: any) {
        // Fallback: Read as local Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleStorefrontImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'coverUrl' | 'profileUrl',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res: any = await apiClient.post('/storage/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.url) setStorefront((current) => ({ ...current, [field]: res.url }));
    } catch (err: any) {
      notify(err.message || 'ไม่สามารถอัปโหลดรูปภาพได้', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.basePrice) {
      notify('กรุณากรอกชื่อและราคาอาหาร', 'warning');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      categoryId: formData.categoryId,
      basePrice: parseFloat(formData.basePrice),
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/menu')}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors btn-tactile"
          >
            <Eye className="w-4 h-4 text-[#06C755]" />
            <span>ดูหน้าเมนูลูกค้า</span>
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="px-4 py-2 bg-[#06C755] hover:bg-[#05A848] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors btn-tactile"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มเมนูอาหารใหม่</span>
          </button>
        </div>
      </div>

      {/* 2. Top Segmented Navigation Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs my-4 max-w-md">
        <button
          onClick={() => setActiveTab('MENU')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'MENU'
              ? 'bg-[#06C755] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          รายการเมนูอาหาร
        </button>
        <button
          onClick={() => setActiveTab('DECORATE')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'DECORATE'
              ? 'bg-[#06C755] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          ตกแต่งหน้าร้าน & แบนเนอร์
        </button>
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'CATEGORIES'
              ? 'bg-[#06C755] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          หมวดหมู่
        </button>
      </div>

      {/* 3. TAB 1: MENU ITEMS MANAGEMENT */}
      {activeTab === 'MENU' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
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

          {/* Menu Items List */}
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
                          <div
                            key={product.id}
                            className={`p-3.5 bg-white border rounded-2xl shadow-xs flex gap-3.5 transition-all relative ${
                              product.isAvailable
                                ? 'border-slate-200/80 hover:border-[#06C755]/60'
                                : 'border-slate-200 bg-slate-50/70 opacity-75'
                            }`}
                          >
                            {/* Product Thumbnail */}
                            <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative flex items-center justify-center border border-slate-200">
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
                              {!product.isAvailable && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                                  <span className="text-[9px] font-black text-white px-1.5 py-0.5 bg-rose-600 rounded">
                                    หมด
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <h3 className="font-bold text-xs text-slate-900 truncate">
                                    {product.name}
                                  </h3>
                                  <span className="font-extrabold text-xs text-[#06C755]">
                                    {formatPrice(product.basePrice)}
                                  </span>
                                </div>
                                {product.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              {/* Action Footer */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                                {/* Sold Out Toggle */}
                                <button
                                  onClick={() =>
                                    toggleAvailabilityMutation.mutate({
                                      id: product.id,
                                      isAvailable: !product.isAvailable,
                                    })
                                  }
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                    product.isAvailable
                                      ? 'bg-emerald-50 text-[#06C755] border-emerald-200 hover:bg-rose-50 hover:text-rose-600'
                                      : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-emerald-50 hover:text-[#06C755]'
                                  }`}
                                >
                                  {product.isAvailable ? '● พร้อมขาย' : '○ สินค้าหมด'}
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditProduct(product, cat.id)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    title="แก้ไขข้อมูล"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      void confirm({
                                        title: 'ลบเมนูนี้หรือไม่?',
                                        description: `เมนู “${product.name}” จะหายจากหน้าร้านทันที`,
                                        confirmLabel: 'ลบเมนู',
                                        destructive: true,
                                      }).then((isConfirmed) => {
                                        if (isConfirmed) deleteProductMutation.mutate(product.id);
                                      });
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="ลบเมนู"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: STORE DECORATION & BANNER */}
      {activeTab === 'DECORATE' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-5 items-start">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">หน้าร้านที่ลูกค้าเห็น</h2>
                <p className="text-xs text-slate-500">อัปโหลดภาพปกและโลโก้ พร้อมกำหนดข้อความต้อนรับของแต่ละสาขา</p>
              </div>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="min-w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                {branches.map((branch: any) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>

            {isLoadingStorefront ? (
              <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-[#06C755] animate-spin" /></div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-[1.7fr_1fr] gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">ภาพปกหน้าร้าน</label>
                    <label className="group relative block aspect-[16/7] overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-[#06C755] transition-colors">
                      {storefront.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={storefront.coverUrl} alt="ภาพปกหน้าร้าน" className="w-full h-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2"><ImageIcon className="w-7 h-7" /><span className="text-xs font-bold">อัปโหลดภาพแนวนอน</span></span>
                      )}
                      <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center"><span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />เปลี่ยนภาพปก</span></span>
                      <input type="file" accept="image/*" onChange={(e) => handleStorefrontImageUpload(e, 'coverUrl')} className="hidden" />
                    </label>
                    <p className="text-[11px] text-slate-400">แนะนำอัตราส่วน 16:7 เพื่อให้ครอบคลุมทุกขนาดหน้าจอ</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">รูปโปรไฟล์ร้าน</label>
                    <label className="group relative mx-auto block w-36 aspect-square overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-[#06C755] transition-colors">
                      {storefront.profileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={storefront.profileUrl} alt="รูปโปรไฟล์ร้าน" className="w-full h-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2"><Store className="w-7 h-7" /><span className="text-xs font-bold">โลโก้ร้าน</span></span>
                      )}
                      <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center"><Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" /></span>
                      <input type="file" accept="image/*" onChange={(e) => handleStorefrontImageUpload(e, 'profileUrl')} className="hidden" />
                    </label>
                    <p className="text-center text-[11px] text-slate-400">รูปสี่เหลี่ยมจัตุรัส</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-slate-800 mb-1">ข้อความต้อนรับ</label><input value={storefront.headline} onChange={(e) => setStorefront({ ...storefront, headline: e.target.value })} placeholder="เช่น อร่อยทุกวัน ส่งถึงบ้าน" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]" /></div>
                  <div><label className="block text-xs font-bold text-slate-800 mb-1">ข้อความรอง</label><input value={storefront.subheadline} onChange={(e) => setStorefront({ ...storefront, subheadline: e.target.value })} placeholder="เช่น เปิดทุกวัน 10:00 - 22:00" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]" /></div>
                </div>
                <div className="flex items-center gap-3"><input type="color" value={storefront.themeColor} onChange={(e) => setStorefront({ ...storefront, themeColor: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /><div><p className="text-xs font-bold text-slate-800">สีประจำหน้าร้าน</p><p className="text-[11px] text-slate-400">ใช้เป็นสีพื้นหลังของข้อความต้อนรับ</p></div></div>
                <button type="button" disabled={!selectedBranchId || isUploading || updateStorefrontMutation.isPending} onClick={() => updateStorefrontMutation.mutate(storefront)} className="w-full py-3 bg-[#1F5D45] hover:bg-[#174733] text-white font-bold text-sm rounded-xl shadow-md transition-colors btn-tactile disabled:opacity-50 flex items-center justify-center gap-2">{isUploading || updateStorefrontMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{isUploading ? 'กำลังอัปโหลดรูปภาพ...' : updateStorefrontMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกหน้าร้าน'}</button>
              </div>
            )}
          </div>

          <div className="sticky top-5 bg-[#FAF8F5] p-4 rounded-3xl border border-[#D5E5DA] shadow-xs space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">ตัวอย่างหน้าลูกค้า</h2><span className="text-[10px] font-bold text-slate-400">LIVE PREVIEW</span></div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
              <div className="h-28 relative" style={{ backgroundColor: storefront.themeColor }}>
                {storefront.coverUrl && <img src={storefront.coverUrl} alt="ตัวอย่างภาพปก" className="w-full h-full object-cover opacity-85" />}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
              </div>
              <div className="relative px-4 pb-4"><div className="absolute -top-10 left-4 w-20 h-20 rounded-2xl overflow-hidden bg-white border-4 border-white shadow-md flex items-center justify-center" style={{ color: storefront.themeColor }}>{storefront.profileUrl ? <img src={storefront.profileUrl} alt="ตัวอย่างรูปโปรไฟล์" className="w-full h-full object-cover" /> : <Store className="w-8 h-8" />}</div><div className="pt-12"><h3 className="text-sm font-extrabold text-slate-900">{selectedBranch?.name || 'ชื่อร้านของคุณ'}</h3><p className="mt-1 text-sm font-bold" style={{ color: storefront.themeColor }}>{storefront.headline || 'ข้อความต้อนรับของร้าน'}</p><p className="mt-1 text-xs text-slate-500">{storefront.subheadline || 'เพิ่มรายละเอียดให้ลูกค้ารู้จักร้านของคุณมากขึ้น'}</p></div></div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: CATEGORIES MANAGEMENT */}
      {activeTab === 'CATEGORIES' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 max-w-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">หมวดหมู่อาหารทั้งหมด</h2>
              <p className="text-xs text-slate-500">จัดการหมวดหมู่เมนูที่แสดงบนแถบเลื่อนหน้าร้าน</p>
            </div>
            <button
              onClick={handleOpenCreateCategory}
              className="px-3.5 py-1.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 btn-tactile"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มหมวดหมู่
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {categories.map((cat: any, idx: number) => (
              <div key={cat.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{cat.name}</h3>
                    <p className="text-[11px] text-slate-400">{cat.products?.length || 0} เมนูในหมวดนี้</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => handleOpenEditCategory(cat)} className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-[#1F5D45]" aria-label={`แก้ไขหมวดหมู่ ${cat.name}`}><Edit2 className="h-4 w-4" /></button>
                  <button type="button" disabled={deleteCategoryMutation.isPending} onClick={() => handleDeleteCategory(cat)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" aria-label={`ลบหมวดหมู่ ${cat.name}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. CREATE / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                {editingProduct ? 'แก้ไขรายการเมนู' : 'เพิ่มเมนูอาหารใหม่'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ชื่อเมนูอาหาร *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ข้าวผัดกะเพราหมูกรอบ"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white"
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    หมวดหมู่ *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ราคาเริ่มต้น (฿) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="65"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  คำอธิบายเมนู (สั้นๆ)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="เช่น หมูกรอบทอดใหม่ๆ คั่วพริกแห้งและใบกะเพราหอมกรุ่น"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white resize-none"
                />
              </div>

              {/* Image Upload & Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  รูปภาพประกอบเมนู
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {formData.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      id="product-image-upload"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="product-image-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      อัปโหลดรูปจากเครื่อง
                    </label>

                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="หรือวางลิงก์รูปภาพ (Image URL)"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#06C755]"
                    />
                  </div>
                </div>

                {/* Preset Food Images Quick Picker */}
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">
                    หรือเลือกจากรูปภาพอาหารยอดนิยม:
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {PRESET_FOOD_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                        className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-[#06C755] text-slate-600 rounded-md text-[10px] whitespace-nowrap transition-colors border border-slate-200"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Availability Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">สถานะพร้อมจำหน่าย</span>
                  <span className="text-[11px] text-slate-500">
                    {formData.isAvailable ? 'เปิดให้ลูกค้าสั่งซื้อได้ทันที' : 'ปิดจำหน่ายชั่วคราว (หมด)'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-5 h-5 text-[#06C755] rounded focus:ring-[#06C755]"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  className="w-full py-3.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {createProductMutation.isPending || updateProductMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingProduct ? 'บันทึกการแก้ไข' : 'ยืนยันสร้างเมนูอาหาร'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">{editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h3>
              <button
                onClick={() => { setIsCategoryModalOpen(false); setEditingCategory(null); setNewCategoryName(''); }}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                ชื่อหมวดหมู่ *
              </label>
              <input
                type="text"
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="เช่น เครื่องดื่ม & ขนมหวาน"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>

            <button
              onClick={handleSaveCategory}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending || !newCategoryName.trim()}
              className="w-full py-3 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile disabled:opacity-50"
            >
              {editingCategory ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มหมวดหมู่'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
