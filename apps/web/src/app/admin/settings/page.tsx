'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronRight, CreditCard, Loader2, MapPin, Palette, Settings2, Store, Trash2, Truck } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useFeedback } from '@/components/ui/feedback-provider';

const LocationMapPicker = dynamic(() => import('@/components/location-map-picker'), {
  ssr: false,
  loading: () => <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100" />,
});

export default function AdminSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [paymentReceiverType, setPaymentReceiverType] = useState('PROMPTPAY');
  const [paymentReceiverValue, setPaymentReceiverValue] = useState('');
  const [paymentReceiverName, setPaymentReceiverName] = useState('');
  const [paymentReceiverBank, setPaymentReceiverBank] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [freeDeliveryDistanceKm, setFreeDeliveryDistanceKm] = useState('3');
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState('8');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverVehicleType, setDriverVehicleType] = useState('');
  const [driverVehiclePlate, setDriverVehiclePlate] = useState('');
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ role?: string; branchId?: string | null } | null>(null);
  const hydratedBranchIdRef = useRef<string | null>(null);
  const mapLatitude = latitude.trim() && Number.isFinite(Number(latitude)) ? Number(latitude) : 13.7563;
  const mapLongitude = longitude.trim() && Number.isFinite(Number(longitude)) ? Number(longitude) : 100.5018;

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });

  const { data: branch, isLoading } = useQuery<any>({
    queryKey: ['branch-settings', selectedBranchId],
    queryFn: () => apiClient.get(`/branches/${selectedBranchId}`),
    enabled: Boolean(selectedBranchId),
  });

  const { data: deliveryStaff = [] } = useQuery<any[]>({
    queryKey: ['delivery-staff', selectedBranchId],
    queryFn: () => apiClient.get(`/admin/deliveries/staff/list?branchId=${selectedBranchId}`),
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
    // Do not overwrite coordinates while this branch's settings form is being edited.
    if (!branch || hydratedBranchIdRef.current === branch.id) return;
    setStoreName(branch.name || '');
    setStoreAddress(branch.address || '');
    setPaymentReceiverType(branch.paymentReceiverType || 'PROMPTPAY');
    setPaymentReceiverValue(branch.paymentReceiverValue || '');
    setPaymentReceiverName(branch.paymentReceiverName || '');
    setPaymentReceiverBank(branch.paymentReceiverBank || '');
    setLatitude(branch.latitude?.toString() || '');
    setLongitude(branch.longitude?.toString() || '');
    setFreeDeliveryDistanceKm(branch.freeDeliveryDistanceKm?.toString() || '3');
    setDeliveryFeePerKm(branch.deliveryFeePerKm?.toString() || '8');
    hydratedBranchIdRef.current = branch.id;
  }, [branch]);

  const updateNameMutation = useMutation({
    mutationFn: () => apiClient.patch(`/branches/${selectedBranchId}/settings`, {
      name: storeName.trim(),
      address: storeAddress.trim() || null,
      paymentReceiverType: paymentReceiverValue.trim() ? paymentReceiverType : null,
      paymentReceiverValue: paymentReceiverValue.trim().replace(/[^0-9A-Za-z]/g, '') || null,
      paymentReceiverName: paymentReceiverName.trim() || null,
      paymentReceiverBank: paymentReceiverBank.trim() || null,
      latitude: latitude.trim() ? Number(latitude) : null,
      longitude: longitude.trim() ? Number(longitude) : null,
      freeDeliveryDistanceKm: Number(freeDeliveryDistanceKm),
      deliveryFeePerKm: Number(deliveryFeePerKm),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branch-settings', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-storefront', selectedBranchId] });
      notify('บันทึกการตั้งค่าร้านเรียบร้อยแล้ว', 'success');
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

  const resetDriverForm = () => {
    setDriverName('');
    setDriverPhone('');
    setDriverVehicleType('');
    setDriverVehiclePlate('');
    setEditingDriverId(null);
  };

  const saveDriverMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: driverName.trim(),
        phone: driverPhone.trim(),
        vehicleType: driverVehicleType.trim(),
        vehiclePlate: driverVehiclePlate.trim(),
      };
      if (editingDriverId) {
        await apiClient.patch(`/admin/deliveries/staff/${editingDriverId}`, payload);
        return;
      }

      await apiClient.post('/admin/deliveries/staff', { ...payload, branchId: selectedBranchId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-staff', selectedBranchId] });
      resetDriverForm();
      notify('บันทึกข้อมูลคนขับเรียบร้อยแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'ไม่สามารถบันทึกข้อมูลคนขับได้', 'error'),
  });

  const deleteDriverMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/deliveries/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-staff', selectedBranchId] });
      notify('ปิดใช้งานข้อมูลคนขับแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'ไม่สามารถลบข้อมูลคนขับได้', 'error'),
  });

  const handleDeleteDriver = async (driver: any) => {
    const confirmed = await confirm({
      title: 'ปิดใช้งานคนขับ?',
      description: `“${driver.name}” จะไม่สามารถรับงานใหม่ได้ แต่ประวัติการจัดส่งเดิมยังคงอยู่`,
      confirmLabel: 'ปิดใช้งาน',
      destructive: true,
    });
    if (confirmed) deleteDriverMutation.mutate(driver.id);
  };

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
          <div><h1 className="text-xl font-black tracking-tight text-slate-900">การตั้งค่าร้าน</h1><p className="text-xs text-slate-500">จัดการข้อมูลที่ลูกค้าเห็นและรูปแบบหน้าร้าน</p></div>
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

            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#1F5D45]" /></div> : managedBranches.length === 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">ไม่พบสาขาที่บัญชีนี้ได้รับสิทธิ์จัดการ กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลร้านที่ถูกต้อง</div> : <>
              <div className="rounded-2xl bg-[#F7F8F5] p-4"><label htmlFor="store-name" className="mb-1.5 block text-xs font-bold text-slate-800">ชื่อร้าน</label><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Store className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-[#1F5D45]" /><input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={120} placeholder="เช่น ครัวบ้านอร่อย" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F5D45]" /></div><button type="button" disabled={!selectedBranchId || !storeName.trim() || updateNameMutation.isPending} onClick={() => updateNameMutation.mutate()} className="rounded-xl bg-[#1F5D45] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#174733] disabled:opacity-50 flex items-center justify-center gap-2">{updateNameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}บันทึกชื่อร้าน</button></div><p className="mt-2 text-[11px] text-slate-500">ใช้ชื่อนี้ในหัวข้อหน้าร้านและข้อมูลการรับสินค้า</p></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="mb-4 flex items-start gap-2"><div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><CreditCard className="h-4 w-4" /></div><div><h3 className="text-sm font-black text-slate-900">การรับชำระเงินผ่าน QR</h3><p className="text-[11px] text-slate-600">ใช้สร้าง PromptPay QR และตรวจสอบผู้รับเงินในสลิป</p></div></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-800">ประเภทการรับเงิน<select value={paymentReceiverType} onChange={(e) => setPaymentReceiverType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F5D45]"><option value="PROMPTPAY">PromptPay</option><option value="BANK_ACCOUNT">บัญชีธนาคาร</option></select></label>
                  <label className="text-xs font-bold text-slate-800">{paymentReceiverType === 'PROMPTPAY' ? 'เบอร์ PromptPay / เลขบัตรประชาชน' : 'เลขบัญชีธนาคาร'}<input value={paymentReceiverValue} onChange={(e) => setPaymentReceiverValue(e.target.value)} inputMode="numeric" placeholder={paymentReceiverType === 'PROMPTPAY' ? '0812345678' : 'xxx-x-x1234-x'} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F5D45]" /></label>
                  <label className="text-xs font-bold text-slate-800">ชื่อผู้รับเงิน<input value={paymentReceiverName} onChange={(e) => setPaymentReceiverName(e.target.value)} maxLength={120} placeholder="ชื่อบัญชี/ชื่อร้าน" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F5D45]" /></label>
                  <label className="text-xs font-bold text-slate-800">ธนาคาร (ถ้ามี)<input value={paymentReceiverBank} onChange={(e) => setPaymentReceiverBank(e.target.value)} maxLength={80} placeholder="เช่น กสิกรไทย" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F5D45]" /></label>
                </div>
                <button type="button" disabled={!selectedBranchId || !storeName.trim() || updateNameMutation.isPending} onClick={() => updateNameMutation.mutate()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F5D45] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#174733] disabled:opacity-50">{updateNameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}บันทึกการตั้งค่า QR</button>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
                <div className="mb-4 flex items-start gap-2"><div className="rounded-xl bg-sky-100 p-2 text-sky-700"><Truck className="h-4 w-4" /></div><div><h3 className="text-sm font-black text-slate-900">พิกัดและค่าจัดส่ง</h3><p className="text-[11px] text-slate-600">ระยะทางคำนวณจากพิกัดร้านถึงพิกัดลูกค้า คิดค่าบริการเฉพาะส่วนที่เกินระยะฟรี</p></div></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-800 sm:col-span-2">ที่อยู่ร้าน<input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} maxLength={500} placeholder="เช่น 123 ถนนสุขุมวิท แขวง... เขต... กรุงเทพมหานคร 10110" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600" /></label>
                  <label className="text-xs font-bold text-slate-800">ละติจูดร้าน<input value={latitude} onChange={(e) => setLatitude(e.target.value)} inputMode="decimal" placeholder="13.7563" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600" /></label>
                  <label className="text-xs font-bold text-slate-800">ลองจิจูดร้าน<input value={longitude} onChange={(e) => setLongitude(e.target.value)} inputMode="decimal" placeholder="100.5018" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600" /></label>
                  <label className="text-xs font-bold text-slate-800">ระยะฟรีค่าส่ง (กม.)<input value={freeDeliveryDistanceKm} onChange={(e) => setFreeDeliveryDistanceKm(e.target.value)} inputMode="decimal" min="0" max="100" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600" /></label>
                  <label className="text-xs font-bold text-slate-800">ค่าส่งต่อกม. (บาท)<input value={deliveryFeePerKm} onChange={(e) => setDeliveryFeePerKm(e.target.value)} inputMode="decimal" min="0" max="1000" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600" /></label>
                </div>
                <div className="mt-3"><LocationMapPicker latitude={mapLatitude} longitude={mapLongitude} onChange={({ latitude: nextLatitude, longitude: nextLongitude }) => { setLatitude(nextLatitude.toFixed(7)); setLongitude(nextLongitude.toFixed(7)); }} label="กดบนแผนที่หรือลากหมุด เพื่อกำหนดพิกัดร้าน" /></div>
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-100 bg-white/80 p-3 text-[11px] leading-relaxed text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />ตัวอย่าง: ตั้งฟรี 3 กม. และ 8 บาท/กม. ลูกค้าอยู่ 3.1 กม. จะคิด 8 บาท, อยู่ 5 กม. จะคิด 16 บาท</div>
                <button type="button" disabled={!selectedBranchId || !storeName.trim() || updateNameMutation.isPending} onClick={() => updateNameMutation.mutate()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-800 disabled:opacity-50">{updateNameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}บันทึกพิกัดและค่าส่ง</button>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="mb-4 flex items-start gap-2"><div className="rounded-xl bg-amber-100 p-2 text-amber-700"><Truck className="h-4 w-4" /></div><div><h3 className="text-sm font-black text-slate-900">คนขับ / ไรเดอร์</h3><p className="text-[11px] text-slate-600">เลือกคนขับก่อนเริ่มจัดส่ง เพื่อแสดงชื่อ เบอร์โทร และข้อมูลรถจริงให้ลูกค้า</p></div></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-800">ชื่อคนขับ<input value={driverName} onChange={(e) => setDriverName(e.target.value)} maxLength={120} placeholder="เช่น สมชาย มุ่งมั่น" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500" /></label>
                  <label className="text-xs font-bold text-slate-800">เบอร์โทร<input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} inputMode="tel" maxLength={30} placeholder="0812345678" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500" /></label>
                  <label className="text-xs font-bold text-slate-800">ประเภทรถ<input value={driverVehicleType} onChange={(e) => setDriverVehicleType(e.target.value)} maxLength={80} placeholder="เช่น Honda Wave 110i" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500" /></label>
                  <label className="text-xs font-bold text-slate-800">ทะเบียนรถ<input value={driverVehiclePlate} onChange={(e) => setDriverVehiclePlate(e.target.value)} maxLength={40} placeholder="เช่น 1กข 8924 กทม." className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500" /></label>
                </div>
                <div className="mt-3 flex gap-2"><button type="button" disabled={!driverName.trim() || !driverPhone.trim() || saveDriverMutation.isPending} onClick={() => saveDriverMutation.mutate()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50">{saveDriverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editingDriverId ? 'บันทึกการแก้ไข' : 'เพิ่มคนขับ'}</button>{editingDriverId && <button type="button" onClick={resetDriverForm} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">ยกเลิก</button>}</div>
                <div className="mt-4 space-y-2">
                  {deliveryStaff.length === 0 ? <p className="rounded-xl border border-dashed border-amber-200 bg-white/70 p-3 text-center text-xs text-slate-500">ยังไม่มีคนขับสำหรับสาขานี้</p> : deliveryStaff.map((driver: any) => <div key={driver.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3"><div><p className="text-sm font-bold text-slate-900">{driver.name}</p><p className="text-xs text-slate-500">{driver.phone}{[driver.vehicleType, driver.vehiclePlate].filter(Boolean).length > 0 ? ` · ${[driver.vehicleType, driver.vehiclePlate].filter(Boolean).join(' / ')}` : ''}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingDriverId(driver.id); setDriverName(driver.name || ''); setDriverPhone(driver.phone || ''); setDriverVehicleType(driver.vehicleType || ''); setDriverVehiclePlate(driver.vehiclePlate || ''); }} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">แก้ไข</button><button type="button" onClick={() => handleDeleteDriver(driver)} disabled={deleteDriverMutation.isPending} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">ลบ</button></div></div>)}
                </div>
              </div>
            </>}
          </div>
        </section>

        <button onClick={() => router.push('/admin/menu')} className="flex w-full items-center justify-between rounded-2xl border border-[#D9E4DC] bg-white p-4 text-left transition hover:border-[#1F5D45] hover:shadow-xs"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#EAF3EE] p-2.5 text-[#1F5D45]"><Palette className="w-5 h-5" /></div><div><p className="text-sm font-bold text-slate-900">ตกแต่งหน้าร้าน</p><p className="text-xs text-slate-500">เปลี่ยนภาพปก รูปโปรไฟล์ ข้อความต้อนรับ และสีธีม</p></div></div><ChevronRight className="w-5 h-5 text-slate-400" /></button>
      </div>
    </div>
  );
}
