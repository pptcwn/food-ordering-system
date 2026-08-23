'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { X, Store, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface BranchPickerModalProps {
  branches: any[];
  activeBranchId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (branch: any) => void;
}

export const BranchPickerModal: React.FC<BranchPickerModalProps> = ({
  branches,
  activeBranchId,
  isOpen,
  onClose,
  onSelect,
}) => {
  const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent variant="modal" hideCloseButton className="p-5 max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1F5D45]">Choose branch</p>
            <h2 id="branch-picker-title" className="mt-1 text-lg font-black text-slate-900">เลือกสาขาที่ต้องการสั่ง</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label="ปิด">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {branches.map((branch: any) => {
            const selected = branch.id === activeBranchId;
            return (
              <button 
                key={branch.id} 
                type="button" 
                onClick={() => onSelect(branch)} 
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition',
                  selected ? 'border-[#1F5D45] bg-[#EAF3EE]' : 'border-slate-200 bg-white hover:border-[#1F5D45]/50'
                )}
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-[#1F5D45] text-white' : 'bg-slate-100 text-slate-600')}>
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">{branch.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{branch.address || branch.code}</p>
                </div>
                {selected && <Check className="h-5 w-5 shrink-0 text-[#1F5D45]" />}
              </button>
            );
          })}
          {branches.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">ไม่พบสาขาที่เปิดให้บริการ</p>}
        </div>
        <button 
          type="button" 
          onClick={() => { onClose(); router.push('/onboarding'); }} 
          className="mt-4 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
        >
          แก้ไขข้อมูลจัดส่งและตำแหน่ง
        </button>
      </DialogContent>
    </Dialog>
  );
};
