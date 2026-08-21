'use client';

import { ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function StickyCartBar({ itemCount, total, onOpen }: { itemCount: number; total: number; onOpen: () => void }) {
  if (itemCount === 0) return null;
  return <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] px-4 pb-safe">
    <Button type="button" onClick={onOpen} aria-label={`เปิดตะกร้า ${itemCount} รายการ`} className="h-auto w-full justify-between rounded-2xl px-4 py-3 shadow-lg shadow-emerald-950/20">
      <span className="flex items-center gap-2 font-bold"><ShoppingBag className="h-5 w-5" />ตะกร้า · {itemCount} รายการ</span><span className="font-black">{formatPrice(total)} →</span>
    </Button>
  </div>;
}
