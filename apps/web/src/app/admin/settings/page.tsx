'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronRight, Loader2, Palette, Settings2, Store, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useFeedback } from '@/components/ui/feedback-provider';

export default function AdminSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [adminUser, setAdminUser] = useState<{ role?: string; branchId?: string | null } | null>(null);

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  const { data: branch, isLoading } = useQuery<any>({
    queryKey: ['branch-settings', selectedBranchId],
    queryFn: () => apiClient.get(`/branches/${selectedBranchId}`),
    enabled: Boolean(selectedBranchId),
  });

  useEffect(() => {
    const rawAdminUser = localStorage.getItem('admin_user');
    if (!rawAdminUser) return;
    try {
      setAdminUser(JSON.parse(rawAdminUser));
    } catch {
      setAdminUser(null);
    }
  }, []);

  const managedBranches = adminUser?.role === 'SUPER_ADMIN'
    ? branches
    : branches.filter((item: any) => item.id === adminUser?.branchId);

  useEffect(() => {
    if (managedBranches.length === 0) return;
    if (!managedBranches.some((item: any) => item.id === selectedBranchId)) {
      setSelectedBranchId(managedBranches[0].id);
    }
  }, [managedBranches, selectedBranchId]);

  useEffect(() => {
    if (branch) setStoreName(branch.name || '');
  }, [branch]);

  const updateNameMutation = useMutation({
    mutationFn: () => apiClient.patch(`/branches/${selectedBranchId}/settings`, { name: storeName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branch-settings', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-storefront', selectedBranchId] });
      notify('บันทึกชื่อร้านเรียบร้อยแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'ไม่สามารถบันทึกชื่อร้านได้', 'error'),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: () => apiClient.delete(`/branches/${selectedBranchId}`),
    onSuccess: () => {
      setSelectedBranchId('');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      notify('ลบสาขาออกจากการใช้งานแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'ไม่สามารถลบสาขาได้', 'error'),
  });

  const handleDeleteBranch = async () => {
    if (!branch || deleteBranchMutation.isPending) return;
    const confirmed = await confirm({
      title: 'ลบสาขานี้?',
      description: `สาขา “${branch.name}” จะไม่แสดงให้ลูกค้าเห็นและรับออเดอร์ใหม่ไม่ได้ ข้อมูลออเดอร์เดิมจะยังเก็บไว้`,
      confirmLabel: 'ลบสาขา',
      destructive: true,
    });
    if (confirmed) deleteBranchMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E4DC] pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100 btn-tactile" aria-label="กลับไปหน้าภาพรวม"><ArrowLeft className="w-5 h-5" /></button>
            <div><h1 className="text-xl font-black tracking-tight text-slate-900">การตั้งค่าร้าน</h1><p className="text-xs text-slate-500">จัดการข้อมูลที่ลูกค้าเห็นและรูปแบบหน้าร้าน</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#D9E4DC] bg-white px-3 py-2 text-xs font-bold text-[#1F5D45]"><Settings2 className="w-4 h-4" />ตั้งค่าร้าน</div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-[#D9E4DC] bg-white shadow-xs">
          <div className="bg-[#1F5D45] px-5 py-6 text-white"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">Store identity</p><h2 className="mt-1 text-lg font-black">ชื่อร้านที่ลูกค้าเห็น</h2><p className="mt-1 text-xs text-emerald-50">เปลี่ยนชื่อได้ตามสาขา และผลจะอัปเดตในหน้าสั่งอาหาร</p></div>
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><label className="mb-1 block text-xs font-bold text-slate-800">เลือกร้าน / สาขา</label><select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} disabled={managedBranches.length <= 1} className="min-w-60 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F5D45] disabled:cursor-not-allowed disabled:opacity-70">{managedBranches.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{adminUser?.role !== 'SUPER_ADMIN' && <p className="mt-1 text-[11px] text-slate-500">บัญชีนี้จัดการได้เฉพาะสาขาที่ได้รับมอบหมาย</p>}</div>
              <div className="flex items-center gap-2">
                {branch?.code && <span className="rounded-full bg-slate-100 px-3 py-1.5 font-mono text-[11px] font-bold text-slate-500">{branch.code}</span>}
                {adminUser?.role === 'SUPER_ADMIN' && (
                  <button type="button" disabled={!branch || managedBranches.length <= 1 || deleteBranchMutation.isPending} onClick={handleDeleteBranch} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">
                    {deleteBranchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}ลบสาขา
                  </button>
                )}
              </div>
            </div>

            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#1F5D45]" /></div> : managedBranches.length === 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">ไม่พบสาขาที่บัญชีนี้ได้รับสิทธิ์จัดการ กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลร้านที่ถูกต้อง</div> : <div className="rounded-2xl bg-[#F7F8F5] p-4"><label htmlFor="store-name" className="mb-1.5 block text-xs font-bold text-slate-800">ชื่อร้าน</label><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Store className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-[#1F5D45]" /><input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={120} placeholder="เช่น ครัวบ้านอร่อย" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F5D45]" /></div><button type="button" disabled={!selectedBranchId || !storeName.trim() || updateNameMutation.isPending} onClick={() => updateNameMutation.mutate()} className="rounded-xl bg-[#1F5D45] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#174733] disabled:opacity-50 flex items-center justify-center gap-2">{updateNameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}บันทึกชื่อร้าน</button></div><p className="mt-2 text-[11px] text-slate-500">ใช้ชื่อนี้ในหัวข้อหน้าร้านและข้อมูลการรับสินค้า</p></div>}
          </div>
        </section>

        <button onClick={() => router.push('/admin/menu')} className="flex w-full items-center justify-between rounded-2xl border border-[#D9E4DC] bg-white p-4 text-left transition hover:border-[#1F5D45] hover:shadow-xs"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#EAF3EE] p-2.5 text-[#1F5D45]"><Palette className="w-5 h-5" /></div><div><p className="text-sm font-bold text-slate-900">ตกแต่งหน้าร้าน</p><p className="text-xs text-slate-500">เปลี่ยนภาพปก รูปโปรไฟล์ ข้อความต้อนรับ และสีธีม</p></div></div><ChevronRight className="w-5 h-5 text-slate-400" /></button>
      </div>
    </div>
  );
}
