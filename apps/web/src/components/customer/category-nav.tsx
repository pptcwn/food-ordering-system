'use client';

import * as React from 'react';
import {
  Utensils,
  Flame,
  Soup,
  Sandwich,
  CupSoda,
  Apple,
  CakeSlice,
  Salad,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export interface CategoryNavProps {
  categories: any[];
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export const CategoryNav = React.forwardRef<HTMLDivElement, CategoryNavProps>(
  ({ categories, activeCategoryId, onCategoryChange, className }, ref) => {
    return (
      <div ref={ref} className={cn('', className)}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-extrabold text-sm text-slate-900">หมวดหมู่สินค้า</h3>
          <button
            onClick={() => onCategoryChange('')}
            className="text-xs font-bold text-[#1F5D45] hover:underline"
          >
            ดูทั้งหมด
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat: any) => {
            const CategoryIcon = CATEGORY_ICONS[cat.name] || CATEGORY_ICONS.default;
            const isCurrent = activeCategoryId === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  onCategoryChange(cat.id);
                  document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={cn(
                  'shrink-0 rounded-2xl px-3 py-2.5 flex items-center gap-2 transition-all btn-tactile',
                  isCurrent
                    ? 'bg-white shadow-soft ring-2 ring-[#00A86B] text-[#1F5D45]'
                    : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-100'
                )}
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
    );
  }
);
CategoryNav.displayName = 'CategoryNav';
