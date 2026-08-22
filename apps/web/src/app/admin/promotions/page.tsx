'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useFeedback } from '@/components/ui/feedback-provider';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Percent,
  DollarSign,
  Truck,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  Loader2,
  Pencil,
} from 'lucide-react';

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [selectedPromoForCoupon, setSelectedPromoForCoupon] = useState<any>(null);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Promotion Form
  const [promoName, setPromoName] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoType, setPromoType] = useState<'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY'>('FIXED_DISCOUNT');
  const [discountValue, setDiscountValue] = useState(50);
  const [minSpend, setMinSpend] = useState(200);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  );

  // New Coupon Form
  const [couponCode, setCouponCode] = useState('');
  const [maxUsage, setMaxUsage] = useState(100);
  const [editingCouponCode, setEditingCouponCode] = useState('');
  const [editingCouponMaxUsage, setEditingCouponMaxUsage] = useState(1);

  const { data: promotions = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-promotions'],
    queryFn: () => apiClient.get('/admin/promotions'),
  });

  const createPromoMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/admin/promotions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setIsCreatingPromo(false);
      setPromoName('');
      setPromoDesc('');
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/admin/promotions/coupons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setSelectedPromoForCoupon(null);
      setCouponCode('');
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/admin/promotions/coupons/${id}/toggle`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/promotions/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      notify('ลบโค้ดคูปองแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'ไม่สามารถลบโค้ดคูปองได้', 'error'),
  });

  const deletePromotionMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/promotions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      notify('ลบโปรโมชั่นแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'ไม่สามารถลบโปรโมชั่นได้', 'error'),
  });

  const updateCouponMutation = useMutation({
    mutationFn: ({ id, code, maxUsage }: { id: string; code: string; maxUsage: number }) =>
      apiClient.patch(`/admin/promotions/coupons/${id}`, { code, maxUsage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setEditingCoupon(null);
      notify('บันทึกคูปองแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'ไม่สามารถแก้ไขคูปองได้', 'error'),
  });

  const handleDeleteCoupon = async (coupon: any) => {
    const approved = await confirm({
      title: 'ลบคูปอง?',
      description: `รหัส ${coupon.code} จะไม่สามารถใช้ได้อีก`,
      confirmLabel: 'ลบคูปอง',
      destructive: true,
    });
    if (approved) deleteCouponMutation.mutate(coupon.id);
  };

  const handleDeletePromotion = async (promotion: any) => {
    const couponCount = promotion.coupons?.length || 0;
    const approved = await confirm({
      title: 'ลบโปรโมชั่น?',
      description: `โปรโมชั่น ${promotion.name} และคูปอง ${couponCount} โค้ดจะถูกลบถาวร`,
      confirmLabel: 'ลบโปรโมชั่น',
      destructive: true,
    });
    if (approved) deletePromotionMutation.mutate(promotion.id);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 pb-20 space-y-5 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">
            โปรโมชั่นและคูปองส่วนลด
          </h1>
          <p className="text-xs text-zinc-500">จัดการแคมเปญการตลาดและรหัสคูปอง</p>
        </div>

        <button
          onClick={() => setIsCreatingPromo(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างโปรโมชั่นใหม่</span>
        </button>
      </div>

      {/* Promotion Campaigns List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-zinc-400">
            <Loader2 className="w-7 h-7 animate-spin text-rose-600" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 bg-white rounded-3xl border border-zinc-200 p-6 text-zinc-400 space-y-2">
            <Tag className="w-10 h-10 opacity-30" />
            <p className="text-xs font-medium">ยังไม่มีโปรโมชั่น กดปุ่มด้านบนเพื่อสร้างแคมเปญแรก</p>
          </div>
        ) : (
          promotions.map((promo) => {
            const isExpired = new Date(promo.endDate) < new Date();

            return (
              <div
                key={promo.id}
                className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-5 space-y-4"
              >
                {/* Promo Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-zinc-900">{promo.name}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isExpired
                            ? 'bg-zinc-100 text-zinc-500'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isExpired ? 'หมดอายุ' : 'เปิดใช้งาน'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700">
                        {promo.type === 'PERCENTAGE_DISCOUNT' && `ลด ${promo.discountValue}%`}
                        {promo.type === 'FIXED_DISCOUNT' && `ลด ฿${promo.discountValue}`}
                        {promo.type === 'FREE_DELIVERY' && 'ฟรีค่าจัดส่ง'}
                      </span>
                    </div>
                    {promo.description && (
                      <p className="text-xs text-zinc-500">{promo.description}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPromoForCoupon(promo);
                        setCouponCode(`${promo.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`);
                      }}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มโค้ดคูปอง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePromotion(promo)}
                      disabled={deletePromotionMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletePromotionMutation.isPending ? 'กำลังลบ...' : 'ลบโปรโมชั่น'}</span>
                    </button>
                  </div>
                </div>

                {/* Promo Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-zinc-50 p-3 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-bold uppercase">
                      ยอดสั่งซื้อขั้นต่ำ
                    </span>
                    <span className="font-bold text-zinc-800">
                      {formatPrice(Number(promo.minSpend || 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-bold uppercase">
                      ระยะเวลา
                    </span>
                    <span className="font-medium text-zinc-700">
                      {new Date(promo.startDate).toLocaleDateString('th-TH')} -{' '}
                      {new Date(promo.endDate).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-bold uppercase">
                      สาขาที่ใช้ได้
                    </span>
                    <span className="font-medium text-zinc-700">
                      {promo.branch?.name || 'ทุกสาขา'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-bold uppercase">
                      จำนวนคูปอง
                    </span>
                    <span className="font-medium text-zinc-700">
                      {promo.coupons?.length || 0} โค้ด
                    </span>
                  </div>
                </div>

                {/* Coupons Table */}
                {promo.coupons && promo.coupons.length > 0 && (
                  <div className="border border-zinc-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase">
                        <tr>
                          <th className="py-2 px-3">โค้ดคูปอง</th>
                          <th className="py-2 px-3">การใช้งาน</th>
                          <th className="py-2 px-3">สถานะ</th>
                          <th className="py-2 px-3 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {promo.coupons.map((coupon: any) => (
                          <tr key={coupon.id} className="hover:bg-zinc-50">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                                  {coupon.code}
                                </span>
                                <button
                                  onClick={() => handleCopy(coupon.code)}
                                  className="text-zinc-400 hover:text-zinc-600"
                                  title="คัดลอกโค้ด"
                                >
                                  {copiedCode === coupon.code ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-zinc-700">
                              {coupon.usedCount} / {coupon.maxUsage} สิทธิ์
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                onClick={() =>
                                  toggleCouponMutation.mutate({
                                    id: coupon.id,
                                    isActive: !coupon.isActive,
                                  })
                                }
                                className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                  coupon.isActive ? 'text-emerald-600' : 'text-zinc-400'
                                }`}
                              >
                                {coupon.isActive ? (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>เปิด</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>ปิด</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCoupon(coupon);
                                  setEditingCouponCode(coupon.code);
                                  setEditingCouponMaxUsage(coupon.maxUsage);
                                }}
                                className="text-zinc-400 hover:text-[#00A86B] p-1 transition"
                                title="แก้ไขคูปอง"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCoupon(coupon)}
                                disabled={deleteCouponMutation.isPending}
                                className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                title="ลบคูปอง"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{deleteCouponMutation.isPending ? 'กำลังลบ' : 'ลบโค้ด'}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create Promotion */}
      {isCreatingPromo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-zinc-900">สร้างโปรโมชั่นใหม่</h2>
              <button
                onClick={() => setIsCreatingPromo(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">ชื่อโปรโมชั่น</label>
                <input
                  type="text"
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                  placeholder="เช่น ส่วนลดลูกค้าใหม่ 50 บาท"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">ประเภทส่วนลด</label>
                <select
                  value={promoType}
                  onChange={(e: any) => setPromoType(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="FIXED_DISCOUNT">ส่วนลดเงินสด (Fixed Amount บาท)</option>
                  <option value="PERCENTAGE_DISCOUNT">ส่วนลดเปอร์เซ็นต์ (% Discount)</option>
                  <option value="FREE_DELIVERY">ฟรีค่าจัดส่ง (Free Delivery)</option>
                </select>
              </div>

              {promoType !== 'FREE_DELIVERY' && (
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    มูลค่าส่วนลด {promoType === 'PERCENTAGE_DISCOUNT' ? '(%)' : '(บาท)'}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-zinc-700 block mb-1">ยอดสั่งซื้อขั้นต่ำ (บาท)</label>
                <input
                  type="number"
                  value={minSpend}
                  onChange={(e) => setMinSpend(Number(e.target.value))}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">วันเริ่มต้น</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">วันสิ้นสุด</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingPromo(false)}
                className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!promoName.trim() || createPromoMutation.isPending}
                onClick={() =>
                  createPromoMutation.mutate({
                    name: promoName.trim(),
                    description: promoDesc,
                    type: promoType,
                    discountValue,
                    minSpend,
                    startDate: `${startDate}T00:00:00.000Z`,
                    endDate: `${endDate}T23:59:59.000Z`,
                  })
                }
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {createPromoMutation.isPending ? 'กำลังบันทึก...' : 'สร้างโปรโมชั่น'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Coupon Code */}
      {selectedPromoForCoupon && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-zinc-900">เพิ่มรหัสคูปอง</h2>
              <button
                onClick={() => setSelectedPromoForCoupon(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              สำหรับโปรโมชั่น: <span className="font-bold text-zinc-800">{selectedPromoForCoupon.name}</span>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">รหัสคูปอง (Coupon Code)</label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="เช่น WELCOME50"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">จำนวนสิทธิ์การใช้งาน (Max Usage)</label>
                <input
                  type="number"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(Number(e.target.value))}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPromoForCoupon(null)}
                className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!couponCode.trim() || createCouponMutation.isPending}
                onClick={() =>
                  createCouponMutation.mutate({
                    promotionId: selectedPromoForCoupon.id,
                    code: couponCode.trim(),
                    maxUsage,
                  })
                }
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {createCouponMutation.isPending ? 'กำลังสร้าง...' : 'สร้างคูปอง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div>
              <h2 className="text-base font-black text-zinc-900">แก้ไขคูปอง</h2>
              <p className="mt-1 text-xs text-zinc-500">จำนวนสิทธิ์ต้องไม่ต่ำกว่าที่ถูกใช้ไปแล้ว ({editingCoupon.usedCount})</p>
            </div>
            <label className="block space-y-1.5 text-xs font-bold text-zinc-700">
              <span>รหัสคูปอง</span>
              <input value={editingCouponCode} onChange={(event) => setEditingCouponCode(event.target.value.toUpperCase())} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 font-mono font-bold outline-none focus:border-[#00A86B]" />
            </label>
            <label className="block space-y-1.5 text-xs font-bold text-zinc-700">
              <span>จำนวนสิทธิ์</span>
              <input type="number" min={editingCoupon.usedCount} value={editingCouponMaxUsage} onChange={(event) => setEditingCouponMaxUsage(Number(event.target.value))} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 outline-none focus:border-[#00A86B]" />
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditingCoupon(null)} className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-xs font-bold text-zinc-700">ยกเลิก</button>
              <button type="button" disabled={!editingCouponCode.trim() || editingCouponMaxUsage < editingCoupon.usedCount || updateCouponMutation.isPending} onClick={() => updateCouponMutation.mutate({ id: editingCoupon.id, code: editingCouponCode.trim(), maxUsage: editingCouponMaxUsage })} className="flex-1 rounded-xl bg-[#00A86B] py-2.5 text-xs font-bold text-white disabled:opacity-50">{updateCouponMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
