'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Loader2, Upload } from 'lucide-react';
import { apiClient } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  categories: any[];
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  categories,
  onSubmit,
  isSubmitting = false,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    basePrice: '',
    salePrice: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name || '',
          categoryId: product.categoryId || (categories.length > 0 ? categories[0].id : ''),
          basePrice: product.basePrice?.toString() || '',
          salePrice: product.salePrice?.toString() || '',
          description: product.description || '',
          imageUrl: product.imageUrl || '',
          isAvailable: product.isAvailable ?? true,
        });
      } else {
        setFormData({
          name: '',
          categoryId: categories.length > 0 ? categories[0].id : '',
          basePrice: '',
          salePrice: '',
          description: '',
          imageUrl: '',
          isAvailable: true,
        });
      }
    }
  }, [isOpen, product, categories]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-100 pb-4">
          <DialogTitle>{product ? 'แก้ไขรายการเมนู' : 'เพิ่มเมนูอาหารใหม่'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">ชื่อเมนูอาหาร *</label>
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
              <label className="block text-xs font-bold text-slate-800 mb-1">หมวดหมู่ *</label>
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
              <label className="block text-xs font-bold text-slate-800 mb-1">ราคาเริ่มต้น (฿) *</label>
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
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">ราคาส่วนลด (฿)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                placeholder="เว้นว่างหากไม่มีส่วนลด"
                className="w-full px-3.5 py-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white font-mono"
              />
              <p className="mt-1 text-[10px] text-slate-400">ต้องน้อยกว่าราคาปกติ ระบบจะแสดงราคาเดิมขีดทับที่หน้าร้าน</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">คำอธิบายเมนู (สั้นๆ)</label>
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
            <label className="block text-xs font-bold text-slate-800">รูปภาพประกอบเมนู</label>

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
              <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">หรือเลือกจากรูปภาพอาหารยอดนิยม:</span>
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
              disabled={isSubmitting || isUploading}
              className="w-full py-3.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              <span>{product ? 'บันทึกการแก้ไข' : 'ยืนยันสร้างเมนูอาหาร'}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
