'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'รอชำระ',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3 h-3" />,
  },
  VERIFYING: {
    label: 'กำลังตรวจ',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Clock className="w-3 h-3 animate-spin" />,
  },
  VERIFIED: {
    label: 'ชำระแล้ว',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  FAILED: {
    label: 'ล้มเหลว',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <XCircle className="w-3 h-3" />,
  },
  MANUAL_REVIEW: {
    label: 'รอตรวจสอบ',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  REFUNDED: {
    label: 'คืนเงินแล้ว',
    color: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    icon: <CreditCard className="w-3 h-3" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS_CONFIG[status] ?? {
    label: status,
    color: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

const STATUS_FILTERS = ['', 'PENDING', 'VERIFYING', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW'];

export default function AdminPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: payments = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-payments', statusFilter],
    queryFn: () =>
      apiClient.get(`/admin/payments${statusFilter ? `?status=${statusFilter}` : ''}`),
    refetchInterval: 10000,
  });

  // Summary counts
  const counts = STATUS_FILTERS.slice(1).reduce<Record<string, number>>((acc, s) => {
    acc[s] = payments.filter((p) => p.status === s).length;
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 pb-20 space-y-5 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">การชำระเงิน</h1>
          <p className="text-xs text-zinc-500">ตรวจสอบสลิปและสถานะการชำระเงินทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter chips */}
          {STATUS_FILTERS.map((s) => {
            const cfg = s ? PAYMENT_STATUS_CONFIG[s] : null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                  statusFilter === s
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {s ? (cfg?.label ?? s) : 'ทั้งหมด'}
                {s && counts[s] > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">({counts[s]})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">ทั้งหมด</p>
          <p className="text-2xl font-black text-zinc-900">{payments.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">ชำระแล้ว</p>
          <p className="text-2xl font-black text-emerald-700">{counts.VERIFIED ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-orange-200 p-4 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">รอตรวจ</p>
          <p className="text-2xl font-black text-orange-700">{counts.MANUAL_REVIEW ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-rose-200 p-4 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">ล้มเหลว</p>
          <p className="text-2xl font-black text-rose-700">{counts.FAILED ?? 0}</p>
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-zinc-400">
            กำลังโหลด...
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-sm text-zinc-400 space-y-2">
            <CreditCard className="w-8 h-8 opacity-30" />
            <p>ไม่พบรายการชำระเงิน</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {payments.map((payment: any) => {
              const isExpanded = expandedId === payment.id;
              return (
                <div key={payment.id} className="group">
                  {/* Main row */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-zinc-50 transition"
                    onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                  >
                    {/* Order No */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-rose-600">
                          #{payment.order?.orderNo ?? '—'}
                        </span>
                        <StatusBadge status={payment.status} />
                      </div>
                      <p className="text-xs text-zinc-600 mt-0.5 truncate">
                        {payment.order?.customerName} · {payment.order?.branch?.name}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="font-black text-sm text-zinc-900">
                        {formatPrice(Number(payment.amount ?? 0))}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {payment.slips?.length ?? 0} สลิป
                      </p>
                    </div>

                    {/* Expand chevron */}
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 bg-zinc-50 space-y-3 text-xs border-t border-zinc-100">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">ผู้โอน</p>
                          <p className="font-medium text-zinc-800">{payment.senderName || '—'}</p>
                          <p className="text-zinc-500">{payment.senderBank || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">ผู้รับ</p>
                          <p className="font-medium text-zinc-800">{payment.receiverName || '—'}</p>
                          <p className="text-zinc-500">{payment.receiverBank || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">Transaction Ref</p>
                          <p className="font-mono text-zinc-700 break-all">{payment.transactionRef || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">เวลาโอน</p>
                          <p className="text-zinc-700">
                            {payment.transferDatetime
                              ? new Date(payment.transferDatetime).toLocaleString('th-TH')
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">ยืนยันเมื่อ</p>
                          <p className="text-zinc-700">
                            {payment.verifiedAt
                              ? new Date(payment.verifiedAt).toLocaleString('th-TH')
                              : '—'}
                          </p>
                        </div>
                      </div>
                      {/* Slip thumbnails placeholder */}
                      {payment.slips?.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-zinc-500">
                            {payment.slips.length} สลิปแนบ — ดูใน Swagger /api/orders/:id/payment
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
