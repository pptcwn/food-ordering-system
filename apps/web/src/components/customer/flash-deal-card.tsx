'use client';

import * as React from 'react';
import { Plus, Utensils } from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';
import { getSalePrice } from './product-card';

export interface FlashDealCardProps {
  product: any;
  onSelect: (product: any) => void;
  className?: string;
}

export const FlashDealCard = React.forwardRef<HTMLDivElement, FlashDealCardProps>(
  ({ product, onSelect, className }, ref) => {
    return (
      <div
        ref={ref}
        onClick={() => onSelect(product)}
        className={cn(
          'w-32 bg-white rounded-2xl p-3 border border-slate-100 shadow-soft flex-shrink-0 flex flex-col justify-between cursor-pointer hover:border-emerald-200 transition-all btn-tactile',
          className
        )}
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
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xs text-slate-900">
              {formatPrice(getSalePrice(product) ?? product.basePrice)}
            </span>
            {getSalePrice(product) !== null && (
              <span className="text-[10px] text-slate-400 line-through">
                {formatPrice(product.basePrice)}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="w-6 h-6 rounded-full bg-[#00A86B] text-white flex items-center justify-center shadow-xs hover:bg-[#00925D] btn-tactile"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
);
FlashDealCard.displayName = 'FlashDealCard';
