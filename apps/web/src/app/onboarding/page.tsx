'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import BottomNav from '@/components/BottomNav';
import {
  User,
  Phone,
  MapPin,
  Bike,
  Store,
  Navigation,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Check,
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
      } catch (err) {}
    } else {
      try {
        await apiClient.put('/customers/profile', { name: cleanName, phone: cleanPhone });
      } catch (err) {}
    }

    router.push('/menu');
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAF8F5] min-h-screen p-5 pb-32">
      <div>
        {/* 1. Hero Welcome Card (Exact Match to Reference Screen 1) */}
        <div className="bg-gradient-to-br from-[#EAF8F1] via-[#E4F5ED] to-[#FAF1E6] rounded-4xl p-6 shadow-soft border border-emerald-100/60 relative overflow-hidden mb-5">
          <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-[#00A86B] font-bold text-lg mb-3">
            🍃
          </div>

          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            Fresh Food & Meals <br />
            <span className="text-[#00A86B]">Delivered to Your Doorstep</span>
          </h1>

          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-[260px]">
            อาหารสดใหม่ ปรุงจานต่อจาน พร้อมจัดส่งด่วนถึงมือคุณใน 20-30 นาที
          </p>

          {/* 3D Food Basket Photo */}
          <div className="w-full h-44 my-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80"
              alt="Fresh Groceries"
              className="w-48 h-36 object-cover rounded-3xl shadow-md rotate-2 hover:rotate-0 transition-transform"
            />
          </div>

          {/* Social Proof Avatar Row (Matching Reference Screen 1) */}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-100/60">
            <span className="text-[11px] font-bold text-slate-600">
              Trusted by 10,000+ Happy Foodies
            </span>
            <div className="flex -space-x-1.5">
              <span className="w-6 h-6 rounded-full bg-[#00A86B] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                ⭐
              </span>
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                4.9
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs shadow-soft">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2. Customer Contact & Location Setup Form */}
        <form onSubmit={handleSaveAndProceed} className="space-y-3.5">
          {/* Delivery Type Toggle */}
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
              <span>จัดส่ง Delivery</span>
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
              <span>รับที่ร้าน (Pickup)</span>
            </button>
          </div>

          {/* Name & Phone */}
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all"
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Location & GPS */}
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
                  className="text-xs text-[#00A86B] font-bold flex items-center gap-1 hover:underline btn-tactile"
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

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="หมายเหตุถึงไรเดอร์ (เช่น วางไว้ที่ล็อบบี้)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all"
              />
            </div>
          )}
        </form>
      </div>

      {/* 3. Get Started Button (Matching Reference Screen 1 "Get Started ➔") */}
      <div className="pt-4">
        <button
          type="button"
          onClick={handleSaveAndProceed}
          className="w-full py-4 bg-[#00A86B] hover:bg-[#00925D] text-white font-black text-sm rounded-full shadow-lg shadow-[#00A86B]/30 flex items-center justify-between px-6 transition-all btn-tactile"
        >
          <span>เริ่มต้นเลือกเมนู (Get Started)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
