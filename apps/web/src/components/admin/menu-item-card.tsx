'use client';

import React from 'react';
import { formatPrice } from '@/lib/utils';
import { Utensils, Edit2, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  basePrice: number;
  salePrice?: number | null;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  categoryId?: string;
}

interface MenuItemCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
}

export function MenuItemCard({ product, onEdit, onDelete, onToggleAvailability }: MenuItemCardProps) {
  return (
    <div
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
            onClick={() => onToggleAvailability(product)}
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
              onClick={() => onEdit(product)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="แก้ไขข้อมูล"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(product)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
              title="ลบเมนู"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
