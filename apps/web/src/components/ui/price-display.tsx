'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, formatPrice } from '@/lib/utils';

const priceDisplayVariants = cva('inline-flex items-baseline gap-1.5 flex-wrap', {
  variants: {
    size: {
      sm: 'text-xs',
      default: 'text-sm',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface PriceDisplayProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof priceDisplayVariants> {
  price: number;
  salePrice?: number;
  currency?: string;
  showDiscount?: boolean;
}

const PriceDisplay = React.forwardRef<HTMLSpanElement, PriceDisplayProps>(
  (
    {
      price,
      salePrice,
      currency = 'THB',
      size = 'default',
      showDiscount = false,
      className,
      ...props
    },
    ref
  ) => {
    const hasDiscount = typeof salePrice === 'number' && salePrice < price && salePrice >= 0;
    const discountPercent = hasDiscount && price > 0 ? Math.round(((price - salePrice) / price) * 100) : 0;

    const format = (value: number) => {
      if (currency === 'THB') {
        return formatPrice(value);
      }
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value || 0);
    };

    return (
      <span
        ref={ref}
        className={cn(priceDisplayVariants({ size }), className)}
        {...props}
      >
        {hasDiscount ? (
          <>
            <span className="font-black text-[#1F5D45]">
              {format(salePrice)}
            </span>
            <span className="line-through text-slate-400">
              {format(price)}
            </span>
            {showDiscount && discountPercent > 0 && (
              <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full">
                -{discountPercent}%
              </span>
            )}
          </>
        ) : (
          <span className="font-black text-slate-900">
            {format(price)}
          </span>
        )}
      </span>
    );
  }
);
PriceDisplay.displayName = 'PriceDisplay';

export { PriceDisplay, priceDisplayVariants };
