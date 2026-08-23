'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Loader2, Store, Upload, Check } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useFeedback } from '@/components/ui/feedback-provider';

export interface StorefrontData {
  coverUrl: string;
  profileUrl: string;
  headline: string;
  subheadline: string;
  themeColor: string;
}

interface StorefrontEditorProps {
  branches: any[];
  selectedBranchId: string;
  onBranchChange: (id: string) => void;
  selectedBranch: any;
  onSave: (data: StorefrontData) => void;
  isSaving: boolean;
  isLoading: boolean;
}

export function StorefrontEditor({
  branches,
  selectedBranchId,
  onBranchChange,
  selectedBranch,
  onSave,
  isSaving,
  isLoading,
}: StorefrontEditorProps) {
  const { notify } = useFeedback();
  const [storefront, setStorefront] = useState<StorefrontData>({
    coverUrl: '',
    profileUrl: '',
    headline: '',
    subheadline: '',
    themeColor: '#1F5D45',
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!selectedBranch) return;
    setStorefront({
      coverUrl: selectedBranch.storefrontCoverUrl || '',
      profileUrl: selectedBranch.storefrontProfileUrl || '',
      headline: selectedBranch.storefrontHeadline || '',
      subheadline: selectedBranch.storefrontSubheadline || '',
      themeColor: selectedBranch.storefrontThemeColor || '#1F5D45',
    });
  }, [selectedBranch]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'coverUrl' | 'profileUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res: any = await apiClient.post('/storage/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.url) setStorefront((current) => ({ ...current, [field]: res.url }));
    } catch (err: any) {
      notify(err.message || 'ไม่สามารถอัปโหลดรูปภาพได้', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-5 items-start">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">หน้าร้านที่ลูกค้าเห็น</h2>
            <p className="text-xs text-slate-500">
              อัปโหลดภาพปกและโลโก้ พร้อมกำหนดข้อความต้อนรับของแต่ละสาขา
            </p>
          </div>
          <select
            value={selectedBranchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className="min-w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          >
            {branches.map((branch: any) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#06C755] animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-[1.7fr_1fr] gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">ภาพปกหน้าร้าน</label>
                <label className="group relative block aspect-[16/7] overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-[#06C755] transition-colors">
                  {storefront.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storefront.coverUrl} alt="ภาพปกหน้าร้าน" className="w-full h-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <ImageIcon className="w-7 h-7" />
                      <span className="text-xs font-bold">อัปโหลดภาพแนวนอน</span>
                    </span>
                  )}
                  <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />เปลี่ยนภาพปก
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'coverUrl')}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400">แนะนำอัตราส่วน 16:7 เพื่อให้ครอบคลุมทุกขนาดหน้าจอ</p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">รูปโปรไฟล์ร้าน</label>
                <label className="group relative mx-auto block w-36 aspect-square overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-[#06C755] transition-colors">
                  {storefront.profileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storefront.profileUrl} alt="รูปโปรไฟล์ร้าน" className="w-full h-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Store className="w-7 h-7" />
                      <span className="text-xs font-bold">โลโก้ร้าน</span>
                    </span>
                  )}
                  <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'profileUrl')}
                    className="hidden"
                  />
                </label>
                <p className="text-center text-[11px] text-slate-400">รูปสี่เหลี่ยมจัตุรัส</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">ข้อความต้อนรับ</label>
                <input
                  value={storefront.headline}
                  onChange={(e) => setStorefront({ ...storefront, headline: e.target.value })}
                  placeholder="เช่น อร่อยทุกวัน ส่งถึงบ้าน"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">ข้อความรอง</label>
                <input
                  value={storefront.subheadline}
                  onChange={(e) => setStorefront({ ...storefront, subheadline: e.target.value })}
                  placeholder="เช่น เปิดทุกวัน 10:00 - 22:00"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={storefront.themeColor}
                onChange={(e) => setStorefront({ ...storefront, themeColor: e.target.value })}
                className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">สีประจำหน้าร้าน</p>
                <p className="text-[11px] text-slate-400">ใช้เป็นสีพื้นหลังของข้อความต้อนรับ</p>
              </div>
            </div>
            <button
              type="button"
              disabled={!selectedBranchId || isUploading || isSaving}
              onClick={() => onSave(storefront)}
              className="w-full py-3 bg-[#1F5D45] hover:bg-[#174733] text-white font-bold text-sm rounded-xl shadow-md transition-colors btn-tactile disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading || isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isUploading ? 'กำลังอัปโหลดรูปภาพ...' : isSaving ? 'กำลังบันทึก...' : 'บันทึกหน้าร้าน'}
            </button>
          </div>
        )}
      </div>

      <div className="sticky top-5 bg-[#FAF8F5] p-4 rounded-3xl border border-[#D5E5DA] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">ตัวอย่างหน้าลูกค้า</h2>
          <span className="text-[10px] font-bold text-slate-400">LIVE PREVIEW</span>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
          <div className="h-28 relative" style={{ backgroundColor: storefront.themeColor }}>
            {storefront.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storefront.coverUrl} alt="ตัวอย่างภาพปก" className="w-full h-full object-cover opacity-85" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
          </div>
          <div className="relative px-4 pb-4">
            <div
              className="absolute -top-10 left-4 w-20 h-20 rounded-2xl overflow-hidden bg-white border-4 border-white shadow-md flex items-center justify-center"
              style={{ color: storefront.themeColor }}
            >
              {storefront.profileUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storefront.profileUrl} alt="ตัวอย่างรูปโปรไฟล์" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8" />
              )}
            </div>
            <div className="pt-12">
              <h3 className="text-sm font-extrabold text-slate-900">{selectedBranch?.name || 'ชื่อร้านของคุณ'}</h3>
              <p className="mt-1 text-sm font-bold" style={{ color: storefront.themeColor }}>
                {storefront.headline || 'ข้อความต้อนรับของร้าน'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {storefront.subheadline || 'เพิ่มรายละเอียดให้ลูกค้ารู้จักร้านของคุณมากขึ้น'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
