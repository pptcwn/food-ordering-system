'use client';

import React from 'react';
import {
  Clock,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Store,
  ChefHat,
  PackageCheck,
  Bike
} from 'lucide-react';

export const STATUS_CONFIG: Record<string, { title: string; subtitle: string; icon: any; step: number; color: string; badgeBg: string; badgeText: string }> = {
  PENDING_PAYMENT: {
    title: 'รอการชำระเงิน',
    subtitle: 'กรุณาสแกน QR Code หรืออัปโหลดสลิปเพื่อยืนยันออเดอร์',
    icon: Clock,
    step: 1,
    color: 'from-amber-500 to-orange-500',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700',
  },
  PAYMENT_VERIFYING: {
    title: 'กำลังตรวจสอบสลิป...',
    subtitle: 'ระบบกำลังตรวจสอบยอดเงินด้วย Slip2Go สักครู่ครับ',
    icon: FileCheck,
    step: 2,
    color: 'from-blue-500 to-indigo-600',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
  },
  PAYMENT_FAILED: {
    title: 'ตรวจสอบสลิปไม่สำเร็จ',
    subtitle: 'กรุณาตรวจสอบรายละเอียดด้านล่าง แล้วส่งสลิปอีกครั้งเมื่อพร้อม',
    icon: AlertCircle,
    step: 1,
    color: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
  },
  PAID: {
    title: 'ชำระเงินสำเร็จแล้ว',
    subtitle: 'ร้านค้ารับออเดอร์แล้ว กำลังส่งรายการเข้าครัว',
    icon: CheckCircle2,
    step: 2,
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  CONFIRMED: {
    title: 'ร้านค้ารับออเดอร์แล้ว',
    subtitle: 'กำลังเตรียมจัดคิวเข้าครัว',
    icon: Store,
    step: 2,
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  PREPARING: {
    title: 'ร้านกำลังปรุงอาหารของคุณ 🍳',
    subtitle: 'เชฟกำลังปรุงอาหารสดใหม่ตามคิวของคุณ',
    icon: ChefHat,
    step: 3,
    color: 'from-emerald-600 to-green-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  READY: {
    title: 'อาหารปรุงเสร็จแล้ว 📦',
    subtitle: 'แพ็กอาหารเรียบร้อย พร้อมส่งมอบให้ไรเดอร์',
    icon: PackageCheck,
    step: 4,
    color: 'from-emerald-600 to-green-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  OUT_FOR_DELIVERY: {
    title: 'ไรเดอร์กำลังนำอาหารไปส่ง 🛵',
    subtitle: 'คนขับกำลังเดินทางไปยังจุดหมายของคุณ',
    icon: Bike,
    step: 5,
    color: 'from-[#06C755] to-[#04943E]',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  DELIVERED: {
    title: 'จัดส่งอาหารสำเร็จแล้ว 🎉',
    subtitle: 'ขอให้อร่อยกับมื้ออาหารของคุณ ขอบคุณที่ใช้บริการครับ',
    icon: CheckCircle2,
    step: 6,
    color: 'from-emerald-600 to-teal-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  CANCELLED: {
    title: 'ออเดอร์ถูกยกเลิก',
    subtitle: 'รายการนี้ถูกยกเลิกแล้ว หากมีข้อสงสัยติดต่อฝ่ายบริการลูกค้า',
    icon: AlertCircle,
    step: 0,
    color: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
  },
};

interface OrderStatusHeroProps {
  status: string;
  orderType: string;
  isDelivery: boolean;
}

export function OrderStatusHero({ status, orderType, isDelivery }: OrderStatusHeroProps) {
  const currentStatus = status || 'PENDING_PAYMENT';
  const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING_PAYMENT;
  const isDelivered = currentStatus === 'DELIVERED';

  return (
    <div className={`bg-gradient-to-br ${statusInfo.color} text-white p-5 pt-6 pb-7 shadow-md relative overflow-hidden`}>
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute right-4 top-4 opacity-15 pointer-events-none">
        <statusInfo.icon className="w-24 h-24 text-white" />
      </div>

      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-white mb-3">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          {currentStatus === 'OUT_FOR_DELIVERY' ? 'กำลังจัดส่งด่วน' : 'สถานะสด'}
        </div>

        <h2 className="text-xl font-bold text-white mb-1.5 flex items-center gap-2">
          {statusInfo.title}
        </h2>
        <p className="text-white/90 text-xs font-normal leading-relaxed max-w-[320px]">
          {statusInfo.subtitle}
        </p>

        {!isDelivered && !['CANCELLED', 'PAYMENT_FAILED'].includes(currentStatus) && (
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
            <span className="text-white/80">เวลาจัดส่งโดยประมาณ:</span>
            <span className="font-bold bg-white text-slate-900 px-3 py-0.5 rounded-full text-xs shadow-xs">
              {currentStatus === 'OUT_FOR_DELIVERY' ? '10-15 นาที' : '20-30 นาที'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
