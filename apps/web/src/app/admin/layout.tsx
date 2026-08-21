'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // If the user is already on the login page, don't require auth.
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

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  return <>{children}</>;
}
