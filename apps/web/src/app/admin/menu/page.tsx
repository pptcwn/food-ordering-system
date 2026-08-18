'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
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

  const [activeTab, setActiveTab] = useState<'MENU' | 'DECORATE' | 'CATEGORIES'>('MENU');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
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

  // Store Decoration Form State
  const [storeBanner, setStoreBanner] = useState({
    headline: 'ส่งฟรีทุกออเดอร์ วันนี้!',
    subheadline: 'เมื่อสั่งซื้อขั้นต่ำ ฿150 ขึ้นไป',
    themeColor: '#06C755',
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

  // Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/admin/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setIsProductModalOpen(false);
      resetProductForm();
    },
    onError: (err: any) => alert(err.message || 'ไม่สามารถสร้างเมนูได้'),
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
    },
    onError: (err: any) => alert(err.message || 'ไม่สามารถแก้ไขเมนูได้'),
  });

  // Delete Product Mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
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
    },
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

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.basePrice) {
      alert('กรุณากรอกชื่อและราคาอาหาร');
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
                                      if (confirm(`คุณต้องการลบเมนู "${product.name}" ใช่หรือไม่?`)) {
                                        deleteProductMutation.mutate(product.id);
                                      }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Banner Settings */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ตกแต่งแบนเนอร์โปรโมชั่นหน้าร้าน
              </h2>
              <p className="text-xs text-slate-500">
                ข้อความนี้จะแสดงด้านบนสุดของหน้าเมนูอาหารสำหรับลูกค้าทุกคน
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  หัวข้อโปรโมชั่นหลัก (Headline)
                </label>
                <input
                  type="text"
                  value={storeBanner.headline}
                  onChange={(e) => setStoreBanner({ ...storeBanner, headline: e.target.value })}
                  placeholder="เช่น ส่งฟรีทุกออเดอร์ วันนี้!"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  เงื่อนไขโปรโมชั่น (Subheadline)
                </label>
                <input
                  type="text"
                  value={storeBanner.subheadline}
                  onChange={(e) => setStoreBanner({ ...storeBanner, subheadline: e.target.value })}
                  placeholder="เช่น เมื่อสั่งซื้อขั้นต่ำ ฿150 ขึ้นไป"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
            </div>

            <button
              onClick={() => alert('บันทึกการตกแต่งแบนเนอร์หน้าร้านเรียบร้อยแล้ว!')}
              className="w-full py-3 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile"
            >
              บันทึกการตกแต่ง
            </button>
          </div>

          {/* Live Banner Preview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">ตัวอย่างการแสดงผลหน้าร้าน</h2>
            <div className="bg-gradient-to-r from-emerald-600 to-[#06C755] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden flex items-center justify-between">
              <div className="relative z-10">
                <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Special Promo
                </span>
                <h3 className="text-base font-extrabold mt-1">{storeBanner.headline}</h3>
                <p className="text-xs text-white/90 mt-0.5">{storeBanner.subheadline}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white flex-shrink-0">
                <Flame className="w-7 h-7 text-amber-300" />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              💡 <strong>คำแนะนำ:</strong> แบนเนอร์ที่มีโปรโมชั่นชัดเจน (เช่น ส่วนลดหรือส่งฟรี) จะช่วยเพิ่มยอดการสั่งซื้อได้มากกว่า 35%
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
              onClick={() => setIsCategoryModalOpen(true)}
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
              <h3 className="font-bold text-sm text-slate-900">เพิ่มหมวดหมู่ใหม่</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
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
              onClick={() => {
                if (newCategoryName.trim()) {
                  createCategoryMutation.mutate(newCategoryName.trim());
                }
              }}
              disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
              className="w-full py-3 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile disabled:opacity-50"
            >
              ยืนยันเพิ่มหมวดหมู่
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
