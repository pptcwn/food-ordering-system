'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, ChevronDown, Bell, MapPin } from 'lucide-react';
import { OrderModeSwitch } from '@/components/customer/order-mode-switch';
import { cn } from '@/lib/utils';

export interface MenuHeaderProps {
  orderType: 'DELIVERY' | 'PICKUP';
  onOrderTypeChange: (mode: 'DELIVERY' | 'PICKUP') => void;
  deliveryAddress?: string;
  storeName: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBranchPickerOpen: () => void;
  className?: string;
}

export const MenuHeader = React.forwardRef<HTMLElement, MenuHeaderProps>(
  ({ orderType, onOrderTypeChange, deliveryAddress, storeName, searchQuery, onSearchChange, onBranchPickerOpen, className }, ref) => {
    const router = useRouter();

    return (
      <header ref={ref} className={cn('sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-4 pb-3 border-b border-slate-100 shadow-xs', className)}>
        <div className="flex items-center justify-between">
          <button
            onClick={onBranchPickerOpen}
            className="flex items-center gap-2 text-left min-w-0 flex-1 btn-tactile"
          >
            <div className="w-8 h-8 rounded-full bg-[#EAF8F1] text-[#00A86B] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block">
                {orderType === 'DELIVERY' ? 'จุดจัดส่งอาหาร' : 'รับสินค้าที่สาขา'}
              </span>
              <div className="flex items-center gap-1 font-bold text-xs text-slate-800 truncate">
                <span className="truncate">
                  {orderType === 'DELIVERY'
                    ? deliveryAddress || 'เลือกจุดปักหมุด'
                    : storeName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/orders')}
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 transition-colors btn-tactile relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00A86B]" />
          </button>
        </div>

        {/* Search Bar with Filter Button */}
        <div className="mt-3.5 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหาอาหารและเครื่องดื่ม..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#00A86B] rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
          <OrderModeSwitch 
            value={orderType} 
            onValueChange={(mode) => {
              onOrderTypeChange(mode);
              if (mode === 'DELIVERY' && !deliveryAddress) {
                router.push('/onboarding');
              }
            }} 
          />
          <button className="w-10 h-10 rounded-2xl bg-[#00A86B] text-white flex items-center justify-center shadow-md shadow-[#00A86B]/25 btn-tactile flex-shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>
    );
  }
);
MenuHeader.displayName = 'MenuHeader';
