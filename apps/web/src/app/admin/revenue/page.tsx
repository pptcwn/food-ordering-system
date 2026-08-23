'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bike, Building2, CreditCard, FileText, ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useFeedback } from '@/components/ui/feedback-provider';

const today = new Date().toISOString().slice(0, 10);
const DEDUCTION_TYPES = ['ค่า GP', 'ค่าโฆษณา', 'ค่าบริการแพลตฟอร์ม', 'ค่าจัดส่ง', 'VAT', 'ส่วนลด/โปรโมชัน', 'ค่าปรับ', 'อื่นๆ'];
type Source = 'SYSTEM' | 'GRAB' | 'LINEMAN' | 'REPORTS';
type Deduction = { type: string; description: string; amount: string };

export default function RevenuePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify, confirm } = useFeedback();
  const [source, setSource] = useState<Source>('SYSTEM');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [adminUser, setAdminUser] = useState<{ role?: string; branchId?: string | null } | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ settlementDate: today, periodStart: '', periodEnd: '', referenceNumber: '', grossAmount: '', note: '', deductions: [{ type: 'ค่า GP', description: '', amount: '' }] as Deduction[] });

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      notify('กรุณาเข้าสู่ระบบใหม่เพื่อใช้งานรายรับ', 'warning');
      router.replace('/admin/login');
      return;
    }
    const rawAdminUser = localStorage.getItem('admin_user');
    if (rawAdminUser) {
      try {
        setAdminUser(JSON.parse(rawAdminUser));
      } catch {
        setAdminUser(null);
      }
    }
    setIsAuthenticated(true);
  }, [notify, router]);
  const handleAuthError = (error: any) => {
    if (/authentication required|unauthorized|jwt expired/i.test(error?.message || '')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('admin_user');
      notify('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'warning');
      router.replace('/admin/login');
    }
  };

  const { data: branches = [], error: branchesError } = useQuery<any[]>({ queryKey: ['branches'], queryFn: () => apiClient.get('/branches'), enabled: isAuthenticated });
  const managedBranches = adminUser?.role === 'SUPER_ADMIN'
    ? branches
    : branches.filter((branch: any) => branch.id === adminUser?.branchId);
  useEffect(() => {
    if (managedBranches.length === 0) return;
    if (!managedBranches.some((branch: any) => branch.id === branchId)) {
      setBranchId(managedBranches[0].id);
    }
  }, [branchId, managedBranches]);
  const { data: system, error: systemError } = useQuery<any>({ queryKey: ['system-revenue', branchId, month], queryFn: () => apiClient.get(`/admin/revenue/system?branchId=${branchId}&month=${month}`), enabled: Boolean(isAuthenticated && branchId && source === 'SYSTEM') });
  const { data: settlements = [], error: settlementsError } = useQuery<any[]>({ queryKey: ['revenue-settlements', branchId, month, source], queryFn: () => apiClient.get(`/admin/revenue?branchId=${branchId}&month=${month}&source=${source}`), enabled: Boolean(isAuthenticated && branchId && (source === 'GRAB' || source === 'LINEMAN')) });
  const { data: summary, error: summaryError } = useQuery<any>({ queryKey: ['revenue-summary', branchId, month, source], queryFn: () => apiClient.get(`/admin/revenue/summary?branchId=${branchId}&month=${month}&source=${source}`), enabled: Boolean(isAuthenticated && branchId && (source === 'GRAB' || source === 'LINEMAN')) });
  useEffect(() => { [branchesError, systemError, settlementsError, summaryError].forEach(handleAuthError); }, [branchesError, systemError, settlementsError, summaryError]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { branchId, source, ...form, grossAmount: Number(form.grossAmount), deductions: form.deductions.map((item) => ({ ...item, amount: Number(item.amount || 0) })) };
      const row: any = editingId ? await apiClient.patch(`/admin/revenue/${editingId}`, payload) : await apiClient.post('/admin/revenue', payload);
      if (!editingId) await Promise.all(files.map((file) => { const data = new FormData(); data.append('file', file); return apiClient.post(`/admin/revenue/${row.id}/attachments`, data, { headers: { 'Content-Type': 'multipart/form-data' } }); }));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['revenue-settlements', branchId, month, source] }); queryClient.invalidateQueries({ queryKey: ['revenue-summary', branchId, month, source] }); closeForm(); notify(editingId ? 'แก้ไขรายรับแล้ว' : 'บันทึกรายรับแล้ว', 'success'); },
    onError: (error: any) => notify(error.message || 'บันทึกรายรับไม่สำเร็จ', 'error'),
  });

  const resetForm = () => setForm({ settlementDate: today, periodStart: '', periodEnd: '', referenceNumber: '', grossAmount: '', note: '', deductions: [{ type: 'ค่า GP', description: '', amount: '' }] });
  const closeForm = () => { setFormOpen(false); setEditingId(null); setFiles([]); resetForm(); };
  const openNew = () => { setEditingId(null); setFiles([]); resetForm(); setFormOpen(true); };
  const edit = (row: any) => { setEditingId(row.id); setFiles([]); setForm({ settlementDate: new Date(row.settlementDate).toISOString().slice(0, 10), periodStart: row.periodStart ? new Date(row.periodStart).toISOString().slice(0, 10) : '', periodEnd: row.periodEnd ? new Date(row.periodEnd).toISOString().slice(0, 10) : '', referenceNumber: row.referenceNumber || '', grossAmount: String(row.grossAmount), note: row.note || '', deductions: row.deductions.length ? row.deductions.map((item: any) => ({ type: item.type, description: item.description || '', amount: String(item.amount) })) : [{ type: 'ค่า GP', description: '', amount: '' }] }); setFormOpen(true); };
  const remove = async (row: any) => { if (!await confirm({ title: 'ลบรายการรายรับ?', description: `รายการ ${row.referenceNumber || new Date(row.settlementDate).toLocaleDateString('th-TH')} และไฟล์แนบจะถูกลบ`, confirmLabel: 'ลบรายการ', destructive: true })) return; try { await apiClient.delete(`/admin/revenue/${row.id}`); queryClient.invalidateQueries({ queryKey: ['revenue-settlements', branchId, month, source] }); queryClient.invalidateQueries({ queryKey: ['revenue-summary', branchId, month, source] }); notify('ลบรายการรายรับแล้ว', 'success'); } catch (error: any) { notify(error.message || 'ลบรายการไม่สำเร็จ', 'error'); } };
  const deductionsTotal = form.deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const downloadReport = async (format: 'pdf' | 'xlsx') => { setExporting(format); try { const blob: Blob = await apiClient.get(`/admin/reports/revenue/export?branchId=${branchId}&month=${month}&format=${format}`, { responseType: 'blob' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `revenue-report-${month}.${format}`; anchor.click(); URL.revokeObjectURL(url); notify(`กำลังดาวน์โหลดรายงาน ${format.toUpperCase()}`, 'success'); } catch (error: any) { notify(error.message || 'สร้างรายงานไม่สำเร็จ', 'error'); } finally { setExporting(null); } };

  return <div className="min-h-screen bg-slate-50 p-4 pb-20 md:p-6"><div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4"><div><h1 className="text-xl font-black text-slate-900">รายรับ</h1><p className="text-xs text-slate-500">รายรับระบบของเรา และรอบโอนเงินจากแพลตฟอร์ม</p></div><div className="flex gap-2"><select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">{managedBranches.map((branch: any) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold" /></div></header>
    <nav className="flex flex-wrap rounded-2xl border border-slate-200 bg-white p-1 shadow-sm"><SourceButton active={source === 'SYSTEM'} onClick={() => setSource('SYSTEM')} icon={<CreditCard className="h-4 w-4" />}>ระบบของเรา</SourceButton><SourceButton active={source === 'GRAB'} onClick={() => setSource('GRAB')} icon={<Bike className="h-4 w-4" />}>Grab</SourceButton><SourceButton active={source === 'LINEMAN'} onClick={() => setSource('LINEMAN')} icon={<Building2 className="h-4 w-4" />}>LINE MAN</SourceButton><SourceButton active={source === 'REPORTS'} onClick={() => setSource('REPORTS')} icon={<FileText className="h-4 w-4" />}>รายงาน</SourceButton></nav>
    {source === 'SYSTEM' ? <SystemRevenue data={system} /> : source === 'REPORTS' ? <section className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><FileText className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">รายงานรายรับประจำเดือน</h2><p className="text-xs text-slate-500">รวมรายรับระบบของเรา Grab และ LINE MAN พร้อมยอดหักและยอดรับสุทธิ</p></div></div><div className="mt-5 space-y-4"><Field label="เดือนรายงาน"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></Field><div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><p className="text-sm font-black text-emerald-900">ขอบเขตรายงาน</p><p className="mt-1 text-xs leading-relaxed text-emerald-800">ใช้ข้อมูลออเดอร์ที่ชำระสำเร็จของระบบ และรายการ settlement Grab/LINE MAN ของสาขาที่เลือก</p></div><div className="grid gap-3 sm:grid-cols-2"><button disabled={exporting !== null || !branchId} onClick={() => downloadReport('xlsx')} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">{exporting === 'xlsx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Export Excel</button><button disabled={exporting !== null || !branchId} onClick={() => downloadReport('pdf')} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">{exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Export PDF</button></div></div></section> : <><section className="grid gap-3 md:grid-cols-4"><Summary label="ยอดขายรวม" value={formatPrice(summary?.gross || 0)} /><Summary label="ยอดหัก" value={formatPrice(summary?.deductions || 0)} /><Summary label="ยอดรับสุทธิ" value={formatPrice(summary?.net || 0)} /><Summary label="รอบโอนเงิน" value={`${summary?.count || 0} รอบ`} /></section><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-black text-slate-900">รายรับจาก {source === 'GRAB' ? 'Grab' : 'LINE MAN'}</h2><p className="text-xs text-slate-500">บันทึกเป็นรอบ settlement หลังหัก GP และค่าบริการ</p></div><button onClick={openNew} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />บันทึกรายรับ</button></div><div className="space-y-3">{settlements.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">ยังไม่มีรายการรายรับในเดือนนี้</p> : settlements.map((row: any) => <SettlementRow key={row.id} row={row} onEdit={() => edit(row)} onDelete={() => remove(row)} onView={() => setViewing(row)} />)}</div></section></>}
    {formOpen && <Dialog title={editingId ? 'แก้ไขรายรับ' : `บันทึกรายรับ ${source === 'GRAB' ? 'Grab' : 'LINE MAN'}`} onClose={closeForm}><form onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="วันที่รับเงิน"><input type="date" value={form.settlementDate} onChange={(event) => setForm({ ...form, settlementDate: event.target.value })} required /></Field><Field label="เลขที่ Settlement"><input value={form.referenceNumber} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} placeholder="เช่น GR-202608-001" /></Field><Field label="เริ่มรอบยอดขาย"><input type="date" value={form.periodStart} onChange={(event) => setForm({ ...form, periodStart: event.target.value })} /></Field><Field label="สิ้นสุดรอบยอดขาย"><input type="date" value={form.periodEnd} onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} /></Field></div><Field label="ยอดขายรวมก่อนหัก"><input inputMode="decimal" value={form.grossAmount} onChange={(event) => setForm({ ...form, grossAmount: event.target.value })} required placeholder="0.00" /></Field><div className="rounded-2xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-900">รายการหัก</h3><p className="text-xs text-slate-500">GP, โฆษณา และค่าบริการอื่น</p></div><button type="button" onClick={() => setForm({ ...form, deductions: [...form.deductions, { type: 'ค่า GP', description: '', amount: '' }] })} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">+ เพิ่มรายการหัก</button></div><div className="space-y-2">{form.deductions.map((item, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_110px_32px]"><select value={item.type} onChange={(event) => setForm({ ...form, deductions: form.deductions.map((entry, i) => i === index ? { ...entry, type: event.target.value } : entry) })} className="rounded-xl border px-3 py-2 text-sm">{DEDUCTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input value={item.description} onChange={(event) => setForm({ ...form, deductions: form.deductions.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry) })} className="rounded-xl border px-3 py-2 text-sm" placeholder="รายละเอียด" /><input inputMode="decimal" value={item.amount} onChange={(event) => setForm({ ...form, deductions: form.deductions.map((entry, i) => i === index ? { ...entry, amount: event.target.value } : entry) })} className="rounded-xl border px-3 py-2 text-sm" placeholder="0.00" /><button type="button" disabled={form.deductions.length === 1} onClick={() => setForm({ ...form, deductions: form.deductions.filter((_, i) => i !== index) })} className="rounded-lg text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>)}</div><div className="mt-3 flex justify-between border-t pt-3 text-sm"><span className="font-bold text-slate-500">ยอดรับสุทธิ</span><span className="font-black text-emerald-700">{formatPrice(Number(form.grossAmount || 0) - deductionsTotal)}</span></div></div><Field label="หมายเหตุ"><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>{!editingId && <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-4 text-sm font-bold text-slate-600"><Upload className="h-4 w-4 text-emerald-600" />แนบสลิป/รายงานโอนเงิน<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles(Array.from(event.target.files || []))} className="hidden" /></label>}<div className="flex gap-2"><button type="button" onClick={closeForm} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">ยกเลิก</button><button disabled={saveMutation.isPending || !branchId} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50">{saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{editingId ? 'บันทึกการแก้ไข' : 'บันทึกรายรับ'}</button></div></form></Dialog>}
    {viewing && <AttachmentsDialog row={viewing} onClose={() => setViewing(null)} />}
  </div></div>;
}

function SystemRevenue({ data }: { data: any }) { const totals = data?.totals; return <><section className="grid gap-3 md:grid-cols-4"><Summary label="ยอดอาหาร" value={formatPrice(totals?.food || 0)} /><Summary label="ค่าส่ง" value={formatPrice(totals?.delivery || 0)} /><Summary label="ส่วนลด" value={formatPrice(totals?.discount || 0)} /><Summary label="ยอดขายสุทธิ" value={formatPrice(totals?.total || 0)} /></section><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-black text-slate-900">รายรับจากระบบของเรา</h2><p className="text-xs text-slate-500">ดึงอัตโนมัติจากออเดอร์ที่ชำระสำเร็จหรือดำเนินการแล้ว แก้ไขไม่ได้</p></div><div className="space-y-2">{!data?.orders?.length ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">ยังไม่มีออเดอร์ในเดือนนี้</p> : data.orders.map((order: any) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3"><div><p className="font-bold text-slate-900">{order.orderNo}</p><p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString('th-TH')} · {order.branch.name}</p></div><p className="font-black text-emerald-700">{formatPrice(order.total)}</p></div>)}</div></section></>; }
function SourceButton({ active, icon, children, onClick }: any) { return <button type="button" onClick={onClick} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${active ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{icon}{children}</button>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-slate-900">{value}</p></div>; }
function SettlementRow({ row, onEdit, onDelete, onView }: any) { return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"><div><p className="font-bold text-slate-900">{row.referenceNumber || `รอบโอน ${new Date(row.settlementDate).toLocaleDateString('th-TH')}`}</p><p className="mt-1 text-xs text-slate-500">ยอดขาย {formatPrice(row.grossAmount)} · หัก {formatPrice(row.deductionsTotal)} · {row.deductions.length} รายการหัก</p><p className="mt-1 text-xs text-slate-500">เอกสารแนบ {row.attachments.length} ไฟล์</p></div><div className="flex items-center gap-1"><div className="mr-2 text-right"><p className="font-black text-emerald-700">{formatPrice(row.netAmount)}</p><p className="text-xs text-slate-400">ยอดรับสุทธิ</p></div>{row.attachments.length > 0 && <button onClick={onView} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"><ImageIcon className="h-4 w-4" /></button>}<button onClick={onEdit} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50"><Pencil className="h-4 w-4" /></button><button onClick={onDelete} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></div>; }
function Field({ label, children }: any) { return <label className="block text-xs font-bold text-slate-700">{label}<span className="mt-1 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_input]:py-2.5 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:px-3 [&_textarea]:py-2.5">{children}</span></label>; }
function Dialog({ title, children, onClose }: any) { return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-slate-900">{title}</h2><button onClick={onClose} className="rounded-full bg-slate-100 p-2"><X className="h-5 w-5" /></button></div>{children}</div></div>; }
function AttachmentsDialog({ row, onClose }: any) { return <Dialog title="เอกสารแนบรายรับ" onClose={onClose}><div className="grid gap-4 sm:grid-cols-2">{row.attachments.map((item: any) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border"><img src={item.url} alt="เอกสารแนบ" className="w-full" /><p className="p-2 text-xs font-bold text-emerald-700">เปิดรูปเต็ม</p></a>)}</div></Dialog>; }
