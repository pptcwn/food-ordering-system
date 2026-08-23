'use client';

import React from 'react';
import { Store, MapPin } from 'lucide-react';

interface OrderLocationCardProps {
  branch: {
    name?: string;
    address?: string;
  } | null;
  customerAddress?: string;
  customerPhone?: string;
  orderType?: string;
}

export function OrderLocationCard({ branch, customerAddress, customerPhone, orderType }: OrderLocationCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
      <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Store className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-slate-900 truncate">
            {branch?.name || 'ร้านอาหารหลัก (สาขาใหญ่)'}
          </h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {branch?.address || 'กรุงเทพมหานคร'}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#06C755] flex items-center justify-center flex-shrink-0 mt-0.5">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">ที่อยู่จัดส่งของคุณ</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {orderType === 'DELIVERY' ? 'ส่งถึงที่' : 'รับที่ร้าน'}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {customerAddress || 'จัดส่งตามที่อยู่ที่ระบุในระบบ'}
          </p>
          {customerPhone && (
            <p className="text-[11px] text-slate-500 mt-1">
              เบอร์โทร: <span className="font-mono text-slate-700">{customerPhone}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
