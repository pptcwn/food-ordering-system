'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  UtensilsCrossed,
  CheckCircle2,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const isDevelopmentDemo = process.env.NEXT_PUBLIC_DEV_DEMO_ENABLED === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loginMutation = useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      apiClient.post('/auth/admin/login', payload),
    onSuccess: (data: any) => {
      if (data && data.accessToken) {
        localStorage.setItem('access_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken);
        }
        if (data.user) {
          localStorage.setItem('admin_user', JSON.stringify(data.user));
        }
        router.replace('/admin');
      }
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  const handleQuickDemoLogin = () => {
    setErrorMessage('');
    apiClient.post('/auth/dev/staff/admin')
      .then((data: any) => {
        localStorage.setItem('access_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        router.replace('/admin');
      })
      .catch((err: Error) => setErrorMessage(err.message || 'ไม่สามารถเข้าสู่ระบบเดโมได้'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF8F5] via-[#F2F8F4] to-[#EAF5EF] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-4xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 border border-slate-100 space-y-6 relative overflow-hidden">
        {/* Top Decorative Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00A86B]/10 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 rounded-3xl bg-[#EAF8F1] text-[#00A86B] flex items-center justify-center mx-auto shadow-soft mb-3 border border-emerald-100">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            ระบบจัดการร้านอาหาร
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            เข้าสู่ระบบสำหรับผู้ดูแลร้าน (Admin & Staff Portal) เพื่อควบคุมออเดอร์ ครัว และเมนูอาหาร
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs animate-in zoom-in-95">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* 2. Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              อีเมลผู้ดูแลระบบ (Admin Email)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@foodordering.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3.5 bg-[#00A86B] hover:bg-[#00925D] text-white font-extrabold text-xs rounded-full shadow-lg shadow-[#00A86B]/30 flex items-center justify-center gap-2 transition-all btn-tactile disabled:opacity-50"
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <span>เข้าสู่ระบบ (Sign In)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 3. Quick 1-Click Demo Login */}
        {isDevelopmentDemo && <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loginMutation.isPending}
            className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-[#00A86B] font-bold text-xs rounded-2xl border border-emerald-200/80 flex items-center justify-center gap-2 transition-all btn-tactile"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบเดโมผู้ดูแล (Development only)</span>
          </button>
        </div>}

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-400 space-y-1">
          {isDevelopmentDemo && <p>บัญชีเดโมถูกสร้างจาก environment ของ API เท่านั้น</p>}
          <div className="flex items-center justify-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" />
            <span>ระบบความปลอดภัยเข้ารหัสด้วย JWT Token</span>
          </div>
        </div>
      </div>
    </div>
  );
}
