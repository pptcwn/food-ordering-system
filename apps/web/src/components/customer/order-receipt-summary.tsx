'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface OrderReceiptSummaryProps {
  items: any[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

export function OrderReceiptSummary({ items, subtotal, deliveryFee, discount, total }: OrderReceiptSummaryProps) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-600" />
          <h3 className="font-bold text-sm text-slate-900">รายการอาหารที่สั่ง</h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {items?.length || 0} รายการ
        </span>
      </div>

      <div className="divide-y divide-slate-100 py-1">
        {items?.map((item: any, idx: number) => (
          <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 flex-1">
              <span className="w-5 h-5 rounded bg-emerald-50 text-[#06C755] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.quantity}x
              </span>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">
                  {item.productName || item.menuItem?.name || item.name || 'รายการอาหาร'}
                </h4>
                {(item.variantName || item.modifiers?.length > 0) && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {[item.variantName, ...(item.modifiers || []).map((modifier: any) => modifier.modifierName)]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs font-bold text-slate-900">
              {formatPrice(Number(item.subtotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 1)))}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>ยอดรวมค่าอาหาร</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>ค่าจัดส่ง</span>
          <span className="text-[#06C755] font-semibold">
            {deliveryFee ? formatPrice(deliveryFee) : '฿0 (โปรโมชั่นฟรี)'}
          </span>
        </div>
        {Number(discount) > 0 && (
          <div className="flex justify-between text-rose-600">
            <span>ส่วนลดโปรโมชั่น</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 text-sm font-extrabold text-slate-900">
          <span>ยอดชำระทั้งหมด</span>
          <span className="text-base text-[#06C755]">
            {formatPrice(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
