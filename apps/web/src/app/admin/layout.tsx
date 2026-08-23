'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, Menu, X } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Keep existing auth logic exactly as-is
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      return;
    }
    const token = localStorage.getItem('access_token');
    const rawAdminUser = localStorage.getItem('admin_user');
    let role: string | undefined;
    try {
      role = rawAdminUser ? JSON.parse(rawAdminUser).role : undefined;
    } catch {
      role = undefined;
    }
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'];
    if (!token || !role || !allowedRoles.includes(role)) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('admin_user');
      router.replace('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  // Don't show sidebar on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-black text-slate-900">Food Admin</span>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
