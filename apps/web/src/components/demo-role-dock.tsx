'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHat, LayoutDashboard, ShoppingBag, Truck } from 'lucide-react';

const roles = [
  { href: '/menu', label: 'ลูกค้า', icon: ShoppingBag },
  { href: '/admin', label: 'ผู้จัดการ', icon: LayoutDashboard },
  { href: '/kitchen', label: 'ครัว', icon: ChefHat },
  { href: '/delivery', label: 'จัดส่ง', icon: Truck },
];

export function DemoRoleDock() {
  const pathname = usePathname();
  if (pathname === '/login' || pathname === '/admin/login') return null;
  return (
    <aside className="demo-role-dock" aria-label="สลับมุมมองระบบจำลอง">
      <span className="demo-role-label">DEMO</span>
      {roles.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/menu' && pathname.startsWith(`${href}/`));
        return <Link key={href} href={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true" /><span>{label}</span></Link>;
      })}
    </aside>
  );
}
