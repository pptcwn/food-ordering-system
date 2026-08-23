'use client';

import * as React from 'react';
import { Plus, Star } from 'lucide-react';
import { ProductThumbnail } from '@/components/customer/product-thumbnail';
import { formatPrice, cn } from '@/lib/utils';

export function getSalePrice(product: any) {
  const basePrice = Number(product.basePrice);
  if (product.salePrice === null || product.salePrice === undefined || product.salePrice === '') {
    return null;
  }
  const salePrice = Number(product.salePrice);
  return Number.isFinite(salePrice) && salePrice >= 0 && salePrice < basePrice ? salePrice : null;
}

export function getDiscountPercent(product: any) {
  const salePrice = getSalePrice(product);
  if (salePrice === null) return null;
  return Math.round(((Number(product.basePrice) - salePrice) / Number(product.basePrice)) * 100);
}

export interface ProductCardProps {
  product: any;
  onSelect: (product: any) => void;
  className?: string;
}

export const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  ({ product, onSelect, className }, ref) => {
    return (
      <div
        ref={ref}
        onClick={() => onSelect(product)}
        className={cn(
          'p-3.5 bg-white border border-slate-100 rounded-3xl shadow-soft flex gap-3.5 transition-all cursor-pointer hover:border-emerald-200',
          !product.isAvailable ? 'opacity-70 bg-slate-50' : 'btn-tactile active:scale-[0.99]',
          className
        )}
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
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-sm">
                {formatPrice(getSalePrice(product) ?? product.basePrice)}
              </span>
              {getSalePrice(product) !== null && (
                <span className="text-[10px] text-slate-400 line-through">
                  {formatPrice(product.basePrice)}
                </span>
              )}
            </div>

            {product.isAvailable ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(product);
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
    );
  }
);
ProductCard.displayName = 'ProductCard';
