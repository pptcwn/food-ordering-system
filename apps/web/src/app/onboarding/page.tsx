'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

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

  // Use browser GPS location
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

    // Save in Zustand Store
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
        // Guest mode fallback
      }
    } else {
      try {
        await apiClient.put('/customers/profile', { name: cleanName, phone: cleanPhone });
      } catch (err) {}
    }

    // Proceed to menu!
    router.push('/menu');
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-slate-50 min-h-screen p-5 pb-8">
      <div>
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-[#06C755] text-white p-5 rounded-2xl shadow-sm mb-5 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white mb-2">
              <Sparkles className="w-3 h-3 text-amber-300" />
              ยินดีต้อนรับสู่ระบบสั่งอาหาร
            </div>
            <h1 className="text-xl font-bold leading-tight">
              ระบุข้อมูลผู้รับ & จุดส่งอาหาร
            </h1>
            <p className="text-xs text-white/90 mt-1">
              กรอกข้อมูลเพื่อรับบริการจัดส่งอาหารด่วนและสะสมแต้ม
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAndProceed} className="space-y-4">
          {/* Delivery Type Toggle (LINE MAN style) */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <button
              type="button"
              onClick={() => setType('DELIVERY')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all btn-tactile ${
                type === 'DELIVERY'
                  ? 'bg-[#06C755] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>จัดส่ง Delivery</span>
            </button>
            <button
              type="button"
              onClick={() => setType('PICKUP')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all btn-tactile ${
                type === 'PICKUP'
                  ? 'bg-[#06C755] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>รับที่ร้าน (Pickup)</span>
            </button>
          </div>

          {/* Customer Name */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                ชื่อผู้รับ / ผู้สั่งซื้อ *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น คุณบีม หรือ คุณสมชาย"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Location & Address Section (if Delivery) */}
          {type === 'DELIVERY' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  ที่อยู่และจุดปักหมุดจัดส่ง *
                </label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={locating}
                  className="text-xs text-[#06C755] font-bold flex items-center gap-1 hover:underline btn-tactile"
                >
                  <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span>{locating ? 'กำลังหาพิกัด...' : 'ใช้พิกัดปัจจุบัน (GPS)'}</span>
                </button>
              </div>

              <textarea
                rows={2}
                required
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="กรอกบ้านเลขที่, ชื่อคอนโด/ตึก, ซอย, ถนน หรือจุดสังเกต"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white transition-all resize-none"
              />

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติมถึงไรเดอร์ (เช่น ฝากไว้ที่ป้อม รปภ.)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white transition-all"
              />

              {/* Nearest Branch Card */}
              {nearestBranchInfo && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">
                      สาขาที่จัดส่ง: {nearestBranchInfo.name}
                    </span>
                    <p className="text-slate-500 mt-0.5 text-[11px]">
                      ระยะทาง: ~{nearestBranchInfo.distanceKm} กม. | ค่าส่ง ฿0 (ส่งฟรี)
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#06C755] flex-shrink-0" />
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Action CTA Button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={handleSaveAndProceed}
          className="w-full py-3.5 bg-[#06C755] hover:bg-[#05A848] text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors btn-tactile"
        >
          <span>เข้าสู่เมนูอาหาร</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
