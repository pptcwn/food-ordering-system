'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { initLiff } from '@/lib/liff';
import { Loader2, Utensils } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { customerName, setCustomerInfo, activeBranchId, setActiveBranch } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // 1. Fetch default branch if not set
      if (!activeBranchId) {
        try {
          const branches: any = await apiClient.get('/branches');
          if (branches && Array.isArray(branches) && branches.length > 0) {
            setActiveBranch(branches[0].id, branches[0].name);
          }
        } catch (e) {
          console.error('Could not load branches:', e);
        }
      }

      // 2. Auto-fetch LINE Profile when opened inside LINE Official Account
      try {
        const lineProfile = await initLiff();
        if (lineProfile && lineProfile.displayName && !customerName) {
          setCustomerInfo(lineProfile.displayName, '');
        }
      } catch (err) {
        console.warn('LIFF initialization skipped:', err);
      }

      // 3. Direct customer to menu immediately
      router.replace('/menu');
      setLoading(false);
    }

    init();
  }, [activeBranchId, customerName, router, setActiveBranch, setCustomerInfo]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-screen bg-[#FAF8F5]">
      <div className="w-16 h-16 bg-[#EAF8F1] text-[#00A86B] rounded-full flex items-center justify-center mb-4 animate-bounce shadow-soft">
        <Utensils className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-black text-slate-900 mb-2">ยินดีต้อนรับสู่ร้านอาหาร</h1>
      <p className="text-xs text-slate-500 mb-6">กำลังเตรียมรายการอาหารสดใหม่สำหรับคุณ...</p>
      <Loader2 className="w-6 h-6 text-[#00A86B] animate-spin" />
    </div>
  );
}
