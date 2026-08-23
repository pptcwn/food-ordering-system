'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  Tag,
  CreditCard,
  Users,
  ChefHat,
  Bike,
  TrendingUp,
  Receipt,
  Settings,
  LogOut,
  Store,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'จัดการเมนู', href: '/admin/menu', icon: Utensils },
  { name: 'โปรโมชั่น', href: '/admin/promotions', icon: Tag },
  { name: 'การชำระเงิน', href: '/admin/payments', icon: CreditCard },
  { name: 'ลูกค้า', href: '/admin/customers', icon: Users },
  { name: 'Kitchen KDS', href: '/kitchen', icon: ChefHat },
  { name: 'จัดส่ง', href: '/delivery', icon: Bike },
  { name: 'รายรับ', href: '/admin/revenue', icon: TrendingUp },
  { name: 'รายจ่าย', href: '/admin/expenses', icon: Receipt },
  { name: 'ตั้งค่า', href: '/admin/settings', icon: Settings },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
            <Store className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-900">Food Admin</span>
        </div>
        {/* Mobile Close Button */}
        <button className="lg:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-lg" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 overflow-y-auto pl-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm rounded-l-xl transition-all",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-r-3 border-emerald-600 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-600" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={() => {
            // Logic to logout
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('admin_user');
            window.location.href = '/admin/login';
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium"
        >
          <LogOut className="w-5 h-5" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
        {SidebarContent}
      </div>

      {/* Mobile Overlay Sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        
        {/* Sidebar Drawer */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {SidebarContent}
        </div>
      </div>
    </>
  );
}
