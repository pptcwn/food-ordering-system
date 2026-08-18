'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Users, Search, Phone, ShoppingBag, MapPin, MessageCircle } from 'lucide-react';

function CustomerAvatar({ name, pictureUrl }: { name?: string; pictureUrl?: string }) {
  if (pictureUrl) {
    return (
      <img
        src={pictureUrl}
        alt={name ?? '?'}
        className="w-9 h-9 rounded-full object-cover border border-zinc-200"
      />
    );
  }
  const initials = (name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-xs shrink-0">
      {initials}
    </div>
  );
}

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: customers = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-customers', debouncedSearch],
    queryFn: () =>
      apiClient.get(`/admin/customers${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''}`),
    refetchInterval: 30000,
  });

  const totalOrders = customers.reduce((sum: number, c: any) => sum + (c._count?.orders ?? 0), 0);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 pb-20 space-y-5 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">ลูกค้า</h1>
          <p className="text-xs text-zinc-500">รายชื่อลูกค้าที่สั่งผ่าน LINE LIFF</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-black text-zinc-900">{customers.length}</span>
            <span className="text-xs text-zinc-400">คน</span>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-2 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-black text-zinc-900">{totalOrders}</span>
            <span className="text-xs text-zinc-400">ออเดอร์รวม</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="ค้นหาชื่อหรือเบอร์โทร..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent placeholder-zinc-400"
        />
      </div>

      {/* Customer cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-sm text-zinc-400">
          กำลังโหลด...
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 space-y-2 text-sm text-zinc-400">
          <Users className="w-8 h-8 opacity-30" />
          <p>{debouncedSearch ? `ไม่พบ "${debouncedSearch}"` : 'ยังไม่มีลูกค้า'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {customers.map((customer: any) => {
              const lineUser = customer.lineUser;
              const orderCount = customer._count?.orders ?? 0;
              const addressCount = customer._count?.addresses ?? 0;
              return (
                <div
                  key={customer.id}
                  className="flex items-center gap-3.5 px-5 py-4 hover:bg-zinc-50 transition"
                >
                  {/* Avatar */}
                  <CustomerAvatar
                    name={lineUser?.displayName ?? customer.name ?? '?'}
                    pictureUrl={lineUser?.pictureUrl}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-zinc-900 truncate">
                        {lineUser?.displayName ?? customer.name ?? 'ไม่ระบุชื่อ'}
                      </span>
                      {customer.name && lineUser?.displayName && customer.name !== lineUser.displayName && (
                        <span className="text-[10px] text-zinc-400 truncate">({customer.name})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {customer.phone && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </span>
                      )}
                      {lineUser?.lineUserId && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                          <MessageCircle className="w-3 h-3" />
                          LINE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div className="text-center">
                      <p className="font-black text-sm text-zinc-900">{orderCount}</p>
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400">ออเดอร์</p>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-sm text-zinc-900">{addressCount}</p>
                      <div className="flex items-center gap-0.5 justify-center">
                        <MapPin className="w-2.5 h-2.5 text-zinc-400" />
                        <p className="text-[9px] text-zinc-400">ที่อยู่</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-zinc-400">
        แสดงสูงสุด 200 รายการ · อัปเดตทุก 30 วินาที
      </p>
    </div>
  );
}
