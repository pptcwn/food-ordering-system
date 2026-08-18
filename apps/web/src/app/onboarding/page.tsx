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
    activeBranchName,
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
      (err) => {
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

      // Attempt to persist to API if logged in
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
    <div className="flex-1 flex flex-col justify-between p-5 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-rose-600 mb-1">
          <MapPin className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">ขั้นตอนเริ่มต้น</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
          ข้อมูลการติดต่อ & จุดจัดส่ง
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          กรุณากรอกชื่อ เบอร์โทร และระบุจุดส่งอาหารก่อนเริ่มเลือกเมนู
        </p>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAndProceed} className="mt-6 space-y-4">
          {/* Order Type Toggle */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('DELIVERY')}
              className={`flex items-center justify-center space-x-2 py-3 rounded-xl font-medium text-sm transition-all ${
                type === 'DELIVERY'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>จัดส่ง Delivery</span>
            </button>
            <button
              type="button"
              onClick={() => setType('PICKUP')}
              className={`flex items-center justify-center space-x-2 py-3 rounded-xl font-medium text-sm transition-all ${
                type === 'PICKUP'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>รับที่ร้าน (Pickup)</span>
            </button>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1.5">
              ชื่อผู้รับ / ผู้สั่งซื้อ *
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น บีม หรือ คุณสมชาย"
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Customer Phone */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1.5">
              เบอร์โทรศัพท์ติดต่อ *
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812345678"
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition font-mono"
              />
            </div>
          </div>

          {/* Location & Address Section (if Delivery) */}
          {type === 'DELIVERY' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-700 uppercase">
                  ที่อยู่และจุดปักหมุดจัดส่ง *
                </label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={locating}
                  className="text-xs text-rose-600 font-semibold flex items-center space-x-1 hover:underline"
                >
                  <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span>{locating ? 'กำลังหาพิกัด...' : 'ใช้พิกัดปัจจุบัน (GPS)'}</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={2}
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="กรอกบ้านเลขที่, ชื่อคอนโด/ตึก, ซอย, ถนน หรือจุดสังเกต"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition resize-none"
                />
              </div>

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติมถึงไรเดอร์ (เช่น วางไว้หน้าประตู)"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
              />

              {/* Nearest Branch Card */}
              {nearestBranchInfo && (
                <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-800">
                      สาขาที่จัดส่ง: {nearestBranchInfo.name}
                    </span>
                    <p className="text-zinc-500">
                      ระยะทาง: ~{nearestBranchInfo.distanceKm} กม. | ค่าส่ง ฿30
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-rose-600 flex-shrink-0" />
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Action CTA Button */}
      <div className="pt-6">
        <button
          type="button"
          onClick={handleSaveAndProceed}
          className="w-full py-4 bg-rose-600 text-white font-semibold text-base rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 hover:bg-rose-700 active:scale-[0.98] transition"
        >
          <span>เข้าสู่เมนูอาหาร (Browse Menu)</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
