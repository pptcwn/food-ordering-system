'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { Loader2, Utensils } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isProfileComplete, activeBranchId, setActiveBranch } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // 1. Fetch nearest/default branch if not set
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

      // 2. Check customer onboarding state
      const ready = isProfileComplete();
      if (!ready) {
        router.replace('/onboarding');
      } else {
        router.replace('/menu');
      }
      setLoading(false);
    }

    init();
  }, [activeBranchId, isProfileComplete, router, setActiveBranch]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
        <Utensils className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-zinc-900 mb-2">ยินดีต้อนรับสู่ร้านอาหาร</h1>
      <p className="text-sm text-zinc-500 mb-6">กำลังเตรียมระบบสั่งอาหารของคุณ...</p>
      <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
    </div>
  );
}
