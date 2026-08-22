'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Download, FileText, ImageIcon, Loader2, Pencil, Plus, ReceiptText, Trash2, Upload, WalletCards, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useFeedback } from '@/components/ui/feedback-provider';

const CATEGORIES = ['วัตถุดิบ', 'ค่าแรง', 'ค่าน้ำไฟ', 'ค่าเช่า', 'ค่าจัดส่ง', 'อุปกรณ์', 'การตลาด', 'อื่นๆ'];
const today = new Date().toISOString().slice(0, 10);
type Section = 'EXPENSES' | 'VENDORS' | 'REPORTS';

export default function ExpensesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify, confirm } = useFeedback();
  const [activeSection, setActiveSection] = useState<Section>('EXPENSES');
  const [branchId, setBranchId] = useState('');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [vendorId, setVendorId] = useState('');
  const [expenseDate, setExpenseDate] = useState(today);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [vatAmount, setVatAmount] = useState('0');
  const [files, setFiles] = useState<File[]>([]);
  const [vendorForm, setVendorForm] = useState({ name: '', taxId: '', address: '', office: '', phone: '' });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [viewingExpense, setViewingExpense] = useState<any | null>(null);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'xlsx' | null>(null);

  const { data: branches = [] } = useQuery<any[]>({ queryKey: ['branches'], queryFn: () => apiClient.get('/branches') });
  useEffect(() => {
    if (!branchId && branches.length) setBranchId(branches[0].id);
  }, [branchId, branches]);

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['expense-vendors', branchId],
    queryFn: () => apiClient.get(`/admin/expenses/vendors?branchId=${branchId}`),
    enabled: Boolean(branchId),
  });
  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ['expenses', branchId, month],
    queryFn: () => apiClient.get(`/admin/expenses?branchId=${branchId}&month=${month}`),
    enabled: Boolean(branchId),
  });
  const { data: summary } = useQuery<any>({
    queryKey: ['expense-summary', branchId, month],
    queryFn: () => apiClient.get(`/admin/expenses/summary?branchId=${branchId}&month=${month}`),
    enabled: Boolean(branchId),
  });

  const addVendorMutation = useMutation({
    mutationFn: () => editingVendorId ? apiClient.patch(`/admin/expenses/vendors/${editingVendorId}`, vendorForm) : apiClient.post('/admin/expenses/vendors', { ...vendorForm, branchId }),
    onSuccess: (vendor: any) => {
      queryClient.invalidateQueries({ queryKey: ['expense-vendors', branchId] });
      setVendorId(vendor.id);
      setVendorForm({ name: '', taxId: '', address: '', office: '', phone: '' }); setEditingVendorId(null); setIsVendorFormOpen(false);
      notify(editingVendorId ? 'แก้ไขข้อมูลผู้ขายแล้ว' : 'เพิ่มข้อมูลผู้ขายแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'เพิ่มผู้ขายไม่สำเร็จ', 'error'),
  });

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        branchId, vendorId: vendorId || undefined, expenseDate, category, description, documentNumber,
        subtotal: Number(subtotal), vatAmount: Number(vatAmount || 0),
      };
      const response: any = editingExpenseId ? await apiClient.patch(`/admin/expenses/${editingExpenseId}`, payload) : await apiClient.post('/admin/expenses', payload);
      if (editingExpenseId) return;
      await Promise.all(files.map((file) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post(`/admin/expenses/${response.id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', branchId, month] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', branchId, month] });
      setDescription(''); setDocumentNumber(''); setSubtotal(''); setVatAmount('0'); setFiles([]); setEditingExpenseId(null); setIsExpenseFormOpen(false);
      notify(editingExpenseId ? 'แก้ไขรายการรายจ่ายแล้ว' : 'บันทึกรายจ่ายและหลักฐานเรียบร้อยแล้ว', 'success');
    },
    onError: (error: any) => notify(error.message || 'บันทึกรายจ่ายไม่สำเร็จ', 'error'),
  });

  const total = Number(subtotal || 0) + Number(vatAmount || 0);
  const resetExpenseForm = () => { setEditingExpenseId(null); setVendorId(''); setExpenseDate(today); setCategory(CATEGORIES[0]); setDescription(''); setDocumentNumber(''); setSubtotal(''); setVatAmount('0'); setFiles([]); setIsExpenseFormOpen(false); };
  const openNewExpense = () => { setEditingExpenseId(null); setVendorId(''); setExpenseDate(today); setCategory(CATEGORIES[0]); setDescription(''); setDocumentNumber(''); setSubtotal(''); setVatAmount('0'); setFiles([]); setIsExpenseFormOpen(true); };
  const editExpense = (expense: any) => { setEditingExpenseId(expense.id); setVendorId(expense.vendorId || ''); setExpenseDate(new Date(expense.expenseDate).toISOString().slice(0, 10)); setCategory(expense.category); setDescription(expense.description); setDocumentNumber(expense.documentNumber || ''); setSubtotal(String(expense.subtotal)); setVatAmount(String(expense.vatAmount)); setIsExpenseFormOpen(true); };
  const openNewVendor = () => { setEditingVendorId(null); setVendorForm({ name: '', taxId: '', address: '', office: '', phone: '' }); setIsVendorFormOpen(true); };
  const editVendor = (vendor: any) => { setEditingVendorId(vendor.id); setVendorForm({ name: vendor.name || '', taxId: vendor.taxId || '', address: vendor.address || '', office: vendor.office || '', phone: vendor.phone || '' }); setIsVendorFormOpen(true); };
  const deleteExpense = async (expense: any) => { if (!await confirm({ title: 'ลบรายการรายจ่าย?', description: `รายการ “${expense.description}” และหลักฐานที่แนบจะถูกลบ`, confirmLabel: 'ลบรายการ', destructive: true })) return; try { await apiClient.delete(`/admin/expenses/${expense.id}`); queryClient.invalidateQueries({ queryKey: ['expenses', branchId, month] }); queryClient.invalidateQueries({ queryKey: ['expense-summary', branchId, month] }); notify('ลบรายการรายจ่ายแล้ว', 'success'); } catch (error: any) { notify(error.message || 'ลบรายการไม่สำเร็จ', 'error'); } };
  const deleteVendor = async (vendor: any) => { if (!await confirm({ title: 'ลบข้อมูลผู้ขาย?', description: `ผู้ขาย “${vendor.name}” จะไม่สามารถเลือกใช้ในรายการใหม่`, confirmLabel: 'ลบผู้ขาย', destructive: true })) return; try { await apiClient.delete(`/admin/expenses/vendors/${vendor.id}`); queryClient.invalidateQueries({ queryKey: ['expense-vendors', branchId] }); notify('ลบข้อมูลผู้ขายแล้ว', 'success'); } catch (error: any) { notify(error.message || 'ลบผู้ขายไม่สำเร็จ', 'error'); } };
  const downloadReport = async (format: 'pdf' | 'xlsx') => { setExportingFormat(format); try { const blob: Blob = await apiClient.get(`/admin/reports/expenses/export?branchId=${branchId}&month=${month}&format=${format}&includeAttachments=${includeAttachments}`, { responseType: 'blob' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `expense-report-${month}.${format}`; anchor.click(); URL.revokeObjectURL(url); notify(`กำลังดาวน์โหลดรายงาน ${format.toUpperCase()}`, 'success'); } catch (error: any) { notify(error.message || 'สร้างรายงานไม่สำเร็จ', 'error'); } finally { setExportingFormat(null); } };

  return <div className="min-h-screen bg-slate-50 p-4 pb-20 md:p-6"><div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4"><div className="flex items-center gap-3"><button onClick={() => router.push('/admin')} className="rounded-full border bg-white p-2 text-slate-700"><ArrowLeft className="h-5 w-5" /></button><div><h1 className="text-xl font-black text-slate-900">รายจ่ายและภาษี</h1><p className="text-xs text-slate-500">เก็บหลักฐานรายจ่าย แยกตามวันและสรุปรายเดือน</p></div></div><div className="flex gap-2"><select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">{branches.map((branch: any) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>{activeSection === 'EXPENSES' && <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold" />}</div></header>

    <nav className="flex w-full flex-wrap rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit" aria-label="เมนูรายจ่าย"><SectionButton active={activeSection === 'EXPENSES'} onClick={() => setActiveSection('EXPENSES')} icon={<ReceiptText className="h-4 w-4" />}>บันทึกรายจ่าย</SectionButton><SectionButton active={activeSection === 'VENDORS'} onClick={() => setActiveSection('VENDORS')} icon={<Building2 className="h-4 w-4" />}>ข้อมูลผู้ขาย</SectionButton><SectionButton active={activeSection === 'REPORTS'} onClick={() => setActiveSection('REPORTS')} icon={<FileText className="h-4 w-4" />}>รายงาน</SectionButton></nav>

    {activeSection === 'EXPENSES' ? <><section className="grid gap-3 md:grid-cols-3"><SummaryCard icon={<WalletCards />} label="รายจ่ายเดือนนี้" value={formatPrice(summary?.totals?.total || 0)} /><SummaryCard icon={<ReceiptText />} label="VAT ซื้อ" value={formatPrice(summary?.totals?.vatAmount || 0)} /><SummaryCard icon={<FileText />} label="ยอดก่อนภาษี" value={formatPrice(summary?.totals?.subtotal || 0)} /></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-black text-slate-900">รายการรายจ่ายเดือนนี้</h2><button type="button" onClick={openNewExpense} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />บันทึกรายจ่าย</button></div><div className="space-y-3">{expenses.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">ยังไม่มีรายจ่ายในเดือนนี้</p> : expenses.map((expense: any) => <ExpenseRow key={expense.id} expense={expense} onView={() => setViewingExpense(expense)} onEdit={() => editExpense(expense)} onDelete={() => deleteExpense(expense)} />)}</div></section>
    </> : activeSection === 'VENDORS' ? <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-black text-slate-900">ข้อมูลผู้ขายที่บันทึกไว้</h2><p className="text-xs text-slate-500">เลือกใช้ได้จากเมนูบันทึกรายจ่าย</p></div><button type="button" onClick={openNewVendor} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />เพิ่มผู้ขาย</button></div><div className="space-y-3">{vendors.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">ยังไม่มีข้อมูลผู้ขาย</p> : vendors.map((vendor: any) => <VendorRow key={vendor.id} vendor={vendor} onEdit={() => editVendor(vendor)} onDelete={() => deleteVendor(vendor)} />)}</div></section> : <section className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><SectionHeading icon={<FileText className="h-5 w-5" />} title="รายงานรายจ่ายประจำเดือน" description="ส่งออกเฉพาะรายการที่ยืนยันแล้ว พร้อมยอดก่อน VAT และภาษีซื้อ" tone="emerald" /><div className="mt-5 space-y-4"><Field label="เดือนรายงาน"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></Field><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={includeAttachments} onChange={(event) => setIncludeAttachments(event.target.checked)} className="h-4 w-4 accent-emerald-600" /><span><span className="block text-sm font-bold text-slate-900">แนบสลิปและเอกสารท้าย PDF</span><span className="text-xs text-slate-500">PDF จะมีรูปหลักฐานของแต่ละรายการต่อท้าย</span></span></label><div className="grid gap-3 sm:grid-cols-2"><button type="button" disabled={exportingFormat !== null || !branchId} onClick={() => downloadReport('xlsx')} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{exportingFormat === 'xlsx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Export Excel</button><button type="button" disabled={exportingFormat !== null || !branchId} onClick={() => downloadReport('pdf')} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{exportingFormat === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Export PDF</button></div></div></section>}
    {viewingExpense && <AttachmentDialog expense={viewingExpense} onClose={() => setViewingExpense(null)} />}
    {isExpenseFormOpen && <EntryDialog title={editingExpenseId ? 'แก้ไขรายจ่าย' : 'บันทึกรายจ่าย'} onClose={resetExpenseForm}><form onSubmit={(event) => { event.preventDefault(); addExpenseMutation.mutate(); }} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="วันที่เอกสาร"><input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required /></Field><Field label="หมวดรายจ่าย"><select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="ผู้ขาย"><select value={vendorId} onChange={(event) => setVendorId(event.target.value)}><option value="">ไม่ระบุผู้ขาย</option>{vendors.map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}{vendor.taxId ? ` · ${vendor.taxId}` : ''}</option>)}</select></Field><Field label="เลขที่เอกสาร"><input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} placeholder="INV-0001" /></Field></div><Field label="รายละเอียดรายจ่าย"><textarea value={description} onChange={(event) => setDescription(event.target.value)} required placeholder="เช่น ซื้อวัตถุดิบสำหรับร้าน" /></Field><div className="grid gap-3 sm:grid-cols-3"><Field label="ยอดก่อนภาษี"><input inputMode="decimal" value={subtotal} onChange={(event) => setSubtotal(event.target.value)} required placeholder="0.00" /></Field><Field label="VAT"><input inputMode="decimal" value={vatAmount} onChange={(event) => setVatAmount(event.target.value)} placeholder="0.00" /></Field><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">ยอดสุทธิ</p><p className="mt-1 text-lg font-black text-emerald-700">{formatPrice(total)}</p></div></div>{!editingExpenseId && <><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-600 hover:border-emerald-500"><Upload className="h-4 w-4 text-emerald-600" />แนบสลิป / ใบกำกับภาษี<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles(Array.from(event.target.files || []))} className="hidden" /></label>{files.length > 0 && <p className="text-xs text-slate-500">แนบแล้ว {files.length} ไฟล์</p>}</>}<div className="flex gap-2"><button type="button" onClick={resetExpenseForm} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">ยกเลิก</button><button disabled={addExpenseMutation.isPending || !branchId} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50">{addExpenseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{editingExpenseId ? 'บันทึกการแก้ไข' : 'บันทึกรายจ่าย'}</button></div></form></EntryDialog>}
    {isVendorFormOpen && <EntryDialog title={editingVendorId ? 'แก้ไขข้อมูลผู้ขาย' : 'เพิ่มข้อมูลผู้ขาย'} onClose={() => { setIsVendorFormOpen(false); setEditingVendorId(null); }}><form onSubmit={(event) => { event.preventDefault(); addVendorMutation.mutate(); }} className="space-y-3"><Field label="ชื่อบริษัท / ร้าน"><input value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} required /></Field><Field label="เลขประจำตัวผู้เสียภาษี"><input value={vendorForm.taxId} onChange={(event) => setVendorForm({ ...vendorForm, taxId: event.target.value })} /></Field><Field label="ที่อยู่ผู้ขาย"><textarea value={vendorForm.address} onChange={(event) => setVendorForm({ ...vendorForm, address: event.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="สำนักงานใหญ่/สาขา"><input value={vendorForm.office} onChange={(event) => setVendorForm({ ...vendorForm, office: event.target.value })} /></Field><Field label="เบอร์โทร"><input value={vendorForm.phone} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value })} /></Field></div><div className="flex gap-2"><button type="button" onClick={() => { setIsVendorFormOpen(false); setEditingVendorId(null); }} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">ยกเลิก</button><button disabled={addVendorMutation.isPending || !branchId} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white disabled:opacity-50">{addVendorMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{editingVendorId ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ขาย'}</button></div></form></EntryDialog>}
  </div></div>;
}

function SectionButton({ active, icon, children, onClick }: { active: boolean; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition sm:flex-none ${active ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{icon}{children}</button>; }
function SectionHeading({ icon, title, description, tone }: { icon: React.ReactNode; title: string; description: string; tone: 'emerald' | 'amber' }) { const color = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-700'; return <div className="flex items-center gap-2"><div className={`rounded-xl p-2 ${color}`}>{icon}</div><div><h2 className="font-black text-slate-900">{title}</h2><p className="text-xs text-slate-500">{description}</p></div></div>; }
function ExpenseRow({ expense, onView, onEdit, onDelete }: { expense: any; onView: () => void; onEdit: () => void; onDelete: () => void }) { const attachmentCount = expense.attachments?.length || 0; return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"><div><p className="font-bold text-slate-900">{expense.description}</p><p className="mt-1 text-xs text-slate-500">{new Date(expense.expenseDate).toLocaleDateString('th-TH')} · {expense.category} · {expense.vendorName || 'ไม่ระบุผู้ขาย'}{expense.documentNumber ? ` · ${expense.documentNumber}` : ''}</p><p className="mt-1 text-xs text-slate-500">VAT {formatPrice(expense.vatAmount)} · หลักฐาน {attachmentCount} ไฟล์</p></div><div className="flex items-center gap-2"><div className="text-right"><p className="text-lg font-black text-slate-900">{formatPrice(expense.total)}</p><span className="text-xs font-bold text-emerald-700">{expense.status === 'CONFIRMED' ? 'ยืนยันแล้ว' : 'ร่าง'}</span></div>{attachmentCount > 0 && <button type="button" onClick={onView} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" aria-label="ดูหลักฐาน"><ImageIcon className="h-4 w-4" /></button>}<ActionButtons onEdit={onEdit} onDelete={onDelete} /></div></div>; }
function VendorRow({ vendor, onEdit, onDelete }: { vendor: any; onEdit: () => void; onDelete: () => void }) { return <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-4"><div className="flex min-w-0 items-start gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-700"><Building2 className="h-4 w-4" /></div><div className="min-w-0"><p className="font-bold text-slate-900">{vendor.name}</p><p className="mt-1 text-xs text-slate-500">{vendor.taxId ? `เลขผู้เสียภาษี ${vendor.taxId}` : 'ไม่ระบุเลขผู้เสียภาษี'}{vendor.office ? ` · ${vendor.office}` : ''}</p>{vendor.address && <p className="mt-1 text-xs text-slate-500">{vendor.address}</p>}{vendor.phone && <p className="mt-1 text-xs text-slate-500">โทร. {vendor.phone}</p>}</div></div><ActionButtons onEdit={onEdit} onDelete={onDelete} /></div>; }
function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) { return <div className="flex shrink-0 gap-1"><button type="button" onClick={onEdit} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50" aria-label="แก้ไข"><Pencil className="h-4 w-4" /></button><button type="button" onClick={onDelete} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="ลบ"><Trash2 className="h-4 w-4" /></button></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-slate-700">{label}<span className="mt-1 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2.5">{children}</span></label>; }
function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500">{icon}<span className="text-xs font-bold">{label}</span></div><p className="mt-2 text-xl font-black text-slate-900">{value}</p></div>; }
function EntryDialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-900">{title}</h2><button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="ปิด"><X className="h-5 w-5" /></button></div>{children}</div></div>; }
function AttachmentDialog({ expense, onClose }: { expense: any; onClose: () => void }) { return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="หลักฐานรายจ่าย"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-black text-slate-900">หลักฐานรายจ่าย</h2><p className="text-sm text-slate-500">{expense.description} · {expense.attachments.length} ไฟล์</p></div><button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="ปิด"><X className="h-5 w-5" /></button></div><div className="grid gap-4 sm:grid-cols-2">{expense.attachments.map((attachment: any) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><img src={attachment.url} alt={`หลักฐาน ${expense.description}`} className="h-auto w-full object-contain" /><p className="border-t border-slate-200 px-3 py-2 text-xs font-bold text-emerald-700">เปิดรูปเต็ม</p></a>)}</div></div></div>; }
