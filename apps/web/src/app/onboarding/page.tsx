'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import {
  User,
  Phone,
  MapPin,
  Bike,
  Store,
  Navigation,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

const LocationMapPicker = dynamic(() => import('@/components/location-map-picker'), {
  ssr: false,
  loading: () => <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100" />,
});

export default function OnboardingPage() {
  const router = useRouter();
  const {
    customerName,
    customerPhone,
    orderType,
    location,
    setCustomerInfo,
    setOrderType,
    setLocation,
    setActiveBranch,
  } = useAppStore();

  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [type, setType] = useState<'DELIVERY' | 'PICKUP'>(orderType);
  const [addressLine, setAddressLine] = useState(location?.addressLine || '');
  const [lat, setLat] = useState(location?.latitude || 13.7563);
  const [lng, setLng] = useState(location?.longitude || 100.5018);
  const [note, setNote] = useState(location?.note || '');
  const [locating, setLocating] = useState(false);
  const [nearestBranchInfo, setNearestBranchInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-fetch nearest branch when coordinates change
  useEffect(() => {
    async function fetchNearest() {
      if (lat && lng) {
        try {
          const res: any = await apiClient.get(`/branches/nearest?lat=${lat}&lng=${lng}`);
          if (res) {
            setNearestBranchInfo(res);
            setActiveBranch(res.id, res.name);
          }
        } catch (err) {
          console.error('Error fetching nearest branch:', err);
        }
      }
    }
    fetchNearest();
  }, [lat, lng, setActiveBranch]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('อุปกรณ์ของคุณไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }

    setLocating(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        if (!addressLine) {
          setAddressLine(`ตำแหน่งปักหมุด GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setErrorMsg('ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณากรอกที่อยู่ด้วยตนเอง');
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleSaveAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!cleanName) {
      setErrorMsg('กรุณากรอกชื่อของคุณ');
      return;
    }

    if (!/^0[0-9]{8,9}$/.test(cleanPhone)) {
      setErrorMsg('กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (เช่น 0812345678)');
      return;
    }

    if (type === 'DELIVERY' && !addressLine.trim()) {
      setErrorMsg('กรุณากรอกที่อยู่หรือปักหมุดสถานที่จัดส่ง');
      return;
    }

    setCustomerInfo(cleanName, cleanPhone);
    setOrderType(type);

    if (type === 'DELIVERY') {
      const locData = {
        addressLine: addressLine.trim(),
        latitude: lat,
        longitude: lng,
        note: note.trim(),
      };
      setLocation(locData);

      try {
        await apiClient.put('/customers/profile', { name: cleanName, phone: cleanPhone });
        await apiClient.post('/customers/location', locData);
      } catch (err) {
        setErrorMsg('บันทึกข้อมูลจัดส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
    } else {
      try {
        await apiClient.put('/customers/profile', { name: cleanName, phone: cleanPhone });
      } catch (err) {
        setErrorMsg('บันทึกข้อมูลผู้ใช้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
    }

    router.push('/menu');
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-[#FAF8F5] pb-8">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-md">
        <h1 className="text-base font-black text-slate-900">ข้อมูลสำหรับสั่งอาหาร</h1>
        <p className="mt-0.5 text-xs text-slate-500">กรอกครั้งเดียว เพื่อสั่งครั้งต่อไปได้เร็วขึ้น</p>
      </header>

      <div className="space-y-4 p-4">

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs shadow-soft">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAndProceed} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-soft">
            <button
              type="button"
              onClick={() => setType('DELIVERY')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all btn-tactile ${
                type === 'DELIVERY'
                  ? 'bg-[#00A86B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>จัดส่ง</span>
            </button>
            <button
              type="button"
              onClick={() => setType('PICKUP')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all btn-tactile ${
                type === 'PICKUP'
                  ? 'bg-[#00A86B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>รับที่ร้าน</span>
            </button>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-soft space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                ชื่อผู้สั่งซื้อ *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น คุณบีม หรือ คุณสมชาย"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                เบอร์โทรศัพท์ติดต่อ *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812345678"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {type === 'DELIVERY' && (
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800">
                  ที่อยู่และจุดปักหมุดจัดส่ง *
                </label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={locating}
                  className="text-xs text-[#1F5D45] font-bold flex items-center gap-1 hover:underline btn-tactile"
                >
                  <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span>{locating ? 'กำลังหาพิกัด...' : 'ใช้พิกัด GPS'}</span>
                </button>
              </div>

              <textarea
                rows={2}
                required
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="กรอกบ้านเลขที่, คอนโด/ตึก, ซอย, ถนน หรือจุดสังเกต"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all resize-none"
              />

              <LocationMapPicker
                latitude={lat}
                longitude={lng}
                onChange={({ latitude, longitude }) => {
                  setLat(latitude);
                  setLng(longitude);
                }}
              />

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="หมายเหตุถึงไรเดอร์ (เช่น วางไว้ที่ล็อบบี้)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all"
              />
            </div>
          )}

          {type === 'PICKUP' && nearestBranchInfo && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              <Store className="h-5 w-5 shrink-0 text-[#00A86B]" />
              <div>
                <p className="font-bold">รับสินค้าที่ {nearestBranchInfo.name}</p>
                <p className="mt-0.5 text-xs text-emerald-800">เลือกสาขาใกล้คุณแล้ว</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-full bg-[#00A86B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#00A86B]/30 transition-all hover:bg-[#00925D] btn-tactile"
          >
            <span>บันทึกและเลือกเมนู</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </main>
  );
}
