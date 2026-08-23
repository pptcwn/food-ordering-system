'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

const tabsVariants = cva('flex items-center', {
  variants: {
    variant: {
      pill: 'bg-slate-100 p-1 rounded-xl',
      filled: 'bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm',
    },
  },
  defaultVariants: {
    variant: 'pill',
  },
});

export interface TabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof tabsVariants> {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'filled';
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ items, activeId, onChange, variant = 'pill', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(tabsVariants({ variant }), className)}
        {...props}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          const isDisabled = item.disabled;

          const activeClasses =
            variant === 'filled'
              ? 'bg-emerald-600 text-white shadow-sm rounded-xl'
              : 'bg-white text-slate-900 shadow-sm rounded-lg';

          const inactiveClasses =
            variant === 'filled'
              ? 'text-slate-500 hover:bg-slate-50 rounded-xl'
              : 'text-slate-500 hover:text-slate-700';

          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              disabled={isDisabled}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex-1 py-2 px-3 text-sm font-bold transition-all flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#1F5D45]',
                isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
                isActive ? activeClasses : inactiveClasses
              )}
            >
              {item.icon && (
                <span className="inline-flex shrink-0 items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="truncate">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="bg-[#06C755] text-white text-[10px] w-5 h-5 rounded-full inline-flex items-center justify-center font-bold shrink-0">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);
Tabs.displayName = 'Tabs';

export { Tabs, tabsVariants };
