'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Category {
  id: string;
  name: string;
  products?: any[];
}

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (category: Category) => void;
  isSubmitting?: boolean;
}

export function CategoryManager({
  categories,
  onAdd,
  onEdit,
  onDelete,
  isSubmitting = false,
}: CategoryManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingCategory) {
      onEdit(editingCategory.id, name.trim());
    } else {
      onAdd(name.trim());
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 max-w-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">หมวดหมู่อาหารทั้งหมด</h2>
          <p className="text-xs text-slate-500">จัดการหมวดหมู่เมนูที่แสดงบนแถบเลื่อนหน้าร้าน</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 btn-tactile"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มหมวดหมู่
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {categories.map((cat, idx) => (
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
              <button
                type="button"
                onClick={() => handleOpenEdit(cat)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-[#1F5D45]"
                aria-label={`แก้ไขหมวดหมู่ ${cat.name}`}
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onDelete(cat)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                aria-label={`ลบหมวดหมู่ ${cat.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent size="sm">
          <DialogHeader className="mb-4">
            <DialogTitle>{editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">ชื่อหมวดหมู่ *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น เครื่องดื่ม & ขนมหวาน"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isSubmitting || !name.trim()}
              className="w-full py-3 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-xs rounded-xl shadow-md transition-colors btn-tactile disabled:opacity-50"
            >
              {editingCategory ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มหมวดหมู่'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
