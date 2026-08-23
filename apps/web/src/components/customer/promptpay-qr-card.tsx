'use client';

import React from 'react';
import { AlertCircle, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatPrice } from '@/lib/utils';

interface PromptPayQrCardProps {
  order: any;
  qrData: any;
  isQrError: boolean;
  qrError: any;
  refetchQr: () => void;
  isPaymentFailed: boolean;
  paymentFailureReason: string | null;
  canSimulatePayment: boolean;
  onUploadSlip: (file: File) => void;
  onSimulatePayment: () => void;
  isUploading: boolean;
  isSimulating: boolean;
  selectedFile: File | null;
  previewUrl: string;
  uploadMsg: { text: string; isError?: boolean } | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PromptPayQrCard({
  order,
  qrData,
  isQrError,
  qrError,
  refetchQr,
  isPaymentFailed,
  paymentFailureReason,
  canSimulatePayment,
  onUploadSlip,
  onSimulatePayment,
  isUploading,
  isSimulating,
  selectedFile,
  previewUrl,
  uploadMsg,
  onFileChange
}: PromptPayQrCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
            TH
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Thai QR Payment / พร้อมเพย์</h3>
            <p className="text-[11px] text-slate-500">สแกนชำระผ่าน Mobile Banking ทุกธนาคาร</p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#06C755] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          ฟรีค่าธรรมเนียม
        </span>
      </div>

      {isPaymentFailed && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-black">ตรวจสลิปครั้งล่าสุดไม่สำเร็จ</p>
              <p className="mt-0.5 leading-relaxed">{paymentFailureReason || 'กรุณาตรวจสอบยอดเงินและส่งสลิปอีกครั้ง'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center py-4">
        <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-sm mb-3 relative flex justify-center items-center w-52 h-52">
          {qrData?.payload ? (
            <QRCodeSVG
              value={qrData.payload}
              size={176}
              level="M"
              includeMargin={false}
            />
          ) : isQrError ? (
            <div className="px-4 flex flex-col items-center justify-center text-center text-rose-600 gap-2">
              <AlertCircle className="w-6 h-6" />
              <span className="text-xs font-semibold">
                {qrError instanceof Error ? qrError.message : 'ไม่สามารถสร้าง QR Code ได้'}
              </span>
              <button
                type="button"
                onClick={() => refetchQr()}
                className="text-[11px] font-bold text-[#06C755] hover:text-[#05A848]"
              >
                ลองใหม่
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              <span className="text-xs">กำลังสร้าง QR Code...</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
            <span className="text-[9px] bg-slate-900/90 text-white px-2 py-0.5 rounded-full font-mono">
              PromptPay Official
            </span>
          </div>
        </div>

        <div className="text-center mb-4">
          <span className="text-xs text-slate-500 block mb-0.5">ยอดชำระสุทธิ</span>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatPrice(order.total ?? order.totalAmount ?? 0)}
          </span>
        </div>

        <div className="w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#06C755] rounded-xl p-4 transition-colors">
          <input
            type="file"
            id="slip-input"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Slip preview"
                className="w-32 h-44 object-cover rounded-lg border border-slate-200 shadow-xs"
              />
              <div className="flex gap-2 w-full">
                <label
                  htmlFor="slip-input"
                  className="flex-1 text-center py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  เปลี่ยนรูป
                </label>
                <button
                  onClick={() => selectedFile && onUploadSlip(selectedFile)}
                  disabled={isUploading}
                  className="flex-2 flex items-center justify-center gap-1.5 py-2 bg-[#06C755] hover:bg-[#05A848] text-white text-xs font-bold rounded-lg shadow-sm transition-colors btn-tactile disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  ยืนยันและส่งสลิป
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="slip-input"
              className="flex flex-col items-center justify-center cursor-pointer py-2"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#06C755] flex items-center justify-center mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                แนบหลักฐานการโอนเงิน (สลิป)
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                ระบบตรวจสลิปอัตโนมัติ 24 ชม. ด้วย AI Slip2Go
              </span>
            </label>
          )}

          {uploadMsg && (
            <div
              className={`mt-2.5 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                uploadMsg.isError
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {uploadMsg.isError ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{uploadMsg.text}</span>
            </div>
          )}
        </div>

        {canSimulatePayment && (
          <button
            type="button"
            onClick={onSimulatePayment}
            disabled={isSimulating}
            className="mt-3 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {isSimulating ? 'กำลังยืนยันเดโม...' : 'ยืนยันชำระเงินเดโม (เฉพาะ Development)'}
          </button>
        )}
      </div>
    </div>
  );
}
