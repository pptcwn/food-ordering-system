'use client';

import React from 'react';
import { QrCode, Store, ChefHat, Bike, CheckCircle2 } from 'lucide-react';
import { STATUS_CONFIG } from './order-status-hero';

interface OrderProgressStepperProps {
  currentStatus: string;
  orderType: string;
}

export function OrderProgressStepper({ currentStatus, orderType }: OrderProgressStepperProps) {
  const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING_PAYMENT;

  return (
    <div className="bg-white border-b border-slate-200/80 px-4 py-4 mb-3 shadow-xs">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
        
        {[
          { step: 1, label: 'สั่งซื้อ', icon: QrCode },
          { step: 2, label: 'รับออเดอร์', icon: Store },
          { step: 3, label: 'ปรุงอาหาร', icon: ChefHat },
          { step: 5, label: 'กำลังส่ง', icon: Bike },
          { step: 6, label: 'สำเร็จ', icon: CheckCircle2 },
        ].map((s, idx) => {
          const isCompleted = statusInfo.step >= s.step;
          const isCurrent = statusInfo.step === s.step || (s.step === 5 && statusInfo.step === 4);

          return (
            <div key={idx} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#06C755] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                } ${isCurrent ? 'ring-4 ring-emerald-100 scale-110' : ''}`}
              >
                <s.icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] mt-1.5 font-medium text-center ${
                  isCompleted ? 'text-slate-900 font-semibold' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
