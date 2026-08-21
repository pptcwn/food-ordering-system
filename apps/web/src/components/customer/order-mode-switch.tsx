'use client';

export function OrderModeSwitch({ value, onValueChange }: { value: 'PICKUP' | 'DELIVERY'; onValueChange: (value: 'PICKUP' | 'DELIVERY') => void }) {
  return <div role="radiogroup" aria-label="วิธีรับสินค้า" className="mt-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
    {([['PICKUP', 'รับที่ร้าน'], ['DELIVERY', 'จัดส่ง']] as const).map(([mode, label]) => <button key={mode} type="button" role="radio" aria-checked={value === mode} onClick={() => onValueChange(mode)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${value === mode ? 'bg-white text-[#1F5D45] shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
  </div>;
}
