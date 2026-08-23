'use client';

import React from 'react';
import { Bike, Phone, MessageCircle } from 'lucide-react';
import { useFeedback } from '@/components/ui/feedback-provider';

interface RiderInfoCardProps {
  rider: {
    name?: string;
    phone?: string;
    vehicleModel?: string;
    vehiclePlate?: string;
  } | null;
  isVisible: boolean;
}

export function RiderInfoCard({ rider, isVisible }: RiderInfoCardProps) {
  const { notify } = useFeedback();

  if (!isVisible) return null;

  const vehicleInfo = [rider?.vehicleModel, rider?.vehiclePlate].filter(Boolean).join(' · ');

  return (
    <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-[#06C755]/10 border-2 border-[#06C755] flex items-center justify-center text-[#06C755]">
              <Bike className="w-6 h-6" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#06C755] border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">
              ✓
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">
                {rider?.name ? `คนขับ: ${rider.name}` : 'ร้านกำลังมอบหมายคนขับ'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {rider?.name ? (vehicleInfo || 'ยังไม่ได้ระบุข้อมูลรถ') : 'จะแจ้งข้อมูลคนขับเมื่อร้านมอบหมายงานแล้ว'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        {rider?.phone ? (
          <a
            href={`tel:${rider.phone}`}
            className="flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#06C755] font-semibold text-xs rounded-xl transition-colors btn-tactile"
          >
            <Phone className="w-3.5 h-3.5" />
            โทร {rider.phone}
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-400 font-semibold text-xs rounded-xl">
            รอข้อมูลเบอร์คนขับ
          </div>
        )}
        <button
          onClick={() => notify(rider?.name ? `ติดต่อร้านเพื่อส่งข้อความถึง ${rider.name}` : 'ร้านกำลังมอบหมายคนขับ', 'info')}
          className="flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors btn-tactile"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          ส่งข้อความ
        </button>
      </div>
    </div>
  );
}
