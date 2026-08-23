'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  Home,
  LayoutGrid,
  ShoppingBag,
  Clock,
  User,
} from 'lucide-react';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  // Fetch Cart count
  const { data: cart } = useQuery<any>({
    queryKey: ['cart'],
    queryFn: () => apiClient.get('/cart'),
    refetchInterval: 5000,
  });

  const totalItems = cart?.totalItems || 0;

  // Don't show bottom nav on checkout or single order tracking page if preferred
  const isOrderTracking = pathname?.startsWith('/orders/') && pathname !== '/orders';

  return (
    <div className="fixed bottom-0 inset-x-0 max-w-[480px] mx-auto z-40 px-4 pb-3 pointer-events-none">
      <nav className="bg-white/95 backdrop-blur-lg border border-slate-100 rounded-3xl shadow-xl shadow-slate-900/5 px-4 py-2.5 flex items-center justify-between pointer-events-auto relative">
        {/* 1. Home */}
        <button
          onClick={() => router.push('/menu')}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all btn-tactile ${
            pathname === '/menu' || pathname === '/'
              ? 'text-[#1F5D45]'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="w-5 h-5" strokeWidth={pathname === '/menu' ? 2.5 : 1.8} />
          <span className="text-[10px] font-semibold">หน้าแรก</span>
        </button>

        {/* 2. Categories */}
        <button
          onClick={() => router.push('/menu')}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all btn-tactile ${
            pathname === '/categories'
              ? 'text-[#1F5D45]'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <LayoutGrid className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[10px] font-semibold">หมวดหมู่</span>
        </button>

        {/* 3. Center Floating Cart Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => router.push('/cart')}
            className="w-13 h-13 rounded-full bg-[#00A86B] hover:bg-[#00925D] text-white flex items-center justify-center shadow-lg shadow-[#00A86B]/40 transition-all btn-tactile relative ring-4 ring-white"
          >
            <ShoppingBag className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-in zoom-in">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </button>
        </div>

        {/* 4. Orders */}
        <button
          onClick={() => router.push('/orders')}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all btn-tactile ${
            pathname?.startsWith('/orders')
              ? 'text-[#1F5D45]'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock className="w-5 h-5" strokeWidth={pathname?.startsWith('/orders') ? 2.5 : 1.8} />
          <span className="text-[10px] font-semibold">คำสั่งซื้อ</span>
        </button>

        {/* 5. Profile / Info */}
        <button
          onClick={() => router.push('/onboarding')}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all btn-tactile ${
            pathname === '/onboarding'
              ? 'text-[#1F5D45]'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5" strokeWidth={pathname === '/onboarding' ? 2.5 : 1.8} />
          <span className="text-[10px] font-semibold">โปรไฟล์</span>
        </button>
      </nav>
    </div>
  );
}
