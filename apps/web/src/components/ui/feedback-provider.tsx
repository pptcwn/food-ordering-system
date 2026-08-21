'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type FeedbackVariant = 'success' | 'error' | 'info' | 'warning';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};

type FeedbackContextValue = {
  notify: (message: string, variant?: FeedbackVariant) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastStyle = {
  success: { icon: CheckCircle2, color: 'text-[#1F5D45]', background: 'bg-[#EAF3EE]' },
  error: { icon: XCircle, color: 'text-rose-700', background: 'bg-rose-50' },
  info: { icon: Info, color: 'text-sky-700', background: 'bg-sky-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-700', background: 'bg-amber-50' },
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; variant: FeedbackVariant } | null>(null);
  const [confirmation, setConfirmation] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!confirmation) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        confirmation.resolve(false);
        setConfirmation(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmation]);

  const value: FeedbackContextValue = {
    notify: (message, variant = 'info') => setToast({ message, variant }),
    confirm: (options) => new Promise<boolean>((resolve) => setConfirmation({ ...options, resolve })),
  };

  const closeConfirmation = (confirmed: boolean) => {
    if (!confirmation) return;
    confirmation.resolve(confirmed);
    setConfirmation(null);
  };

  const ToastIcon = toast ? toastStyle[toast.variant].icon : Info;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-md animate-in slide-in-from-top-3 duration-200" role="status" aria-live="polite">
          <div className={`flex items-start gap-3 rounded-2xl border border-black/5 px-4 py-3 shadow-xl ${toastStyle[toast.variant].background}`}>
            <ToastIcon className={`mt-0.5 h-5 w-5 shrink-0 ${toastStyle[toast.variant].color}`} />
            <p className="flex-1 text-sm font-semibold text-slate-800">{toast.message}</p>
            <button type="button" onClick={() => setToast(null)} className="rounded-full p-1 text-slate-400 hover:bg-black/5 hover:text-slate-700" aria-label="ปิดข้อความแจ้งเตือน"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      {confirmation && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${confirmation.destructive ? 'bg-rose-50 text-rose-600' : 'bg-[#EAF3EE] text-[#1F5D45]'}`}><AlertTriangle className="h-5 w-5" /></div>
            <h2 id="confirm-title" className="text-base font-black text-slate-900">{confirmation.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{confirmation.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => closeConfirmation(false)} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">ยกเลิก</button>
              <button type="button" autoFocus onClick={() => closeConfirmation(true)} className={`rounded-xl px-4 py-3 text-sm font-bold text-white transition ${confirmation.destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#1F5D45] hover:bg-[#174733]'}`}>{confirmation.confirmLabel || 'ยืนยัน'}</button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
}
