'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuantityStepperProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  onRemove?: () => void;
  size?: 'sm' | 'default';
  disabled?: boolean;
}

const QuantityStepper = React.forwardRef<HTMLDivElement, QuantityStepperProps>(
  (
    {
      value,
      onChange,
      min = 1,
      max,
      onRemove,
      size = 'default',
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const isMinusDisabled = disabled || (value <= min && !onRemove);
    const isPlusDisabled = disabled || (max !== undefined && value >= max);

    const handleDecrement = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      if (value <= min) {
        if (onRemove) {
          onRemove();
        }
      } else {
        onChange(value - 1);
      }
    };

    const handleIncrement = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      if (max !== undefined && value >= max) return;
      onChange(value + 1);
    };

    const isSm = size === 'sm';

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-between gap-2 bg-slate-100 rounded-full select-none',
          isSm ? 'px-2 py-1' : 'px-3 py-2',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        {...props}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={isMinusDisabled}
          aria-label="Decrease quantity"
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100',
            isSm ? 'w-7 h-7' : 'w-8 h-8'
          )}
        >
          <Minus className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>

        <span
          className={cn(
            'font-bold text-slate-800 text-center tabular-nums',
            isSm ? 'text-sm min-w-[1.25rem]' : 'text-base min-w-[1.5rem]'
          )}
        >
          {value}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={isPlusDisabled}
          aria-label="Increase quantity"
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100',
            isSm ? 'w-7 h-7' : 'w-8 h-8'
          )}
        >
          <Plus className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      </div>
    );
  }
);
QuantityStepper.displayName = 'QuantityStepper';

export { QuantityStepper };
