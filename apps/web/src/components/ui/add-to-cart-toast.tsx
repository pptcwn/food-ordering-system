'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function useCartToast() {
  const [visible, setVisible] = useState(false);
  const [itemName, setItemName] = useState('');

  const show = useCallback((name: string) => {
    setItemName(name);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [visible]);

  return { visible, itemName, show };
}

export function CartToast({ visible, itemName }: { visible: boolean; itemName: string }) {
  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1F5D45] text-white text-sm font-bold shadow-lg transition-all duration-300',
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
      )}
    >
      <CheckCircle2 className="w-4 h-4" />
      <span>เพิ่ม {itemName} แล้ว ✓</span>
    </div>
  );
}
