'use client';

import * as React from 'react';
import { Heart, Star, Check, Utensils } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { formatPrice, cn } from '@/lib/utils';
import { getSalePrice, getDiscountPercent } from './product-card';

export interface ProductDetailModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (payload: { quantity: number; specialNote: string; selectedVariantId: string; selectedModifiers: string[] }) => void;
  isAddingToCart?: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  isAddingToCart = false,
}) => {
  const [selectedVariantId, setSelectedVariantId] = React.useState<string>('');
  const [selectedModifiers, setSelectedModifiers] = React.useState<string[]>([]);
  const [quantity, setQuantity] = React.useState(1);
  const [specialNote, setSpecialNote] = React.useState('');
  const [isLiked, setIsLiked] = React.useState(false);

  React.useEffect(() => {
    if (product && isOpen) {
      setSelectedVariantId(product.variants?.[0]?.id || '');
      setSelectedModifiers([]);
      setQuantity(1);
      setSpecialNote('');
      setIsLiked(false);
    }
  }, [product, isOpen]);

  const handleToggleModifier = (modifierId: string, group: any) => {
    if (group.maxSelect === 1) {
      const otherGroupModIds = group.modifiers.map((m: any) => m.id);
      const filtered = selectedModifiers.filter((id) => !otherGroupModIds.includes(id));
      setSelectedModifiers([...filtered, modifierId]);
    } else {
      if (selectedModifiers.includes(modifierId)) {
        setSelectedModifiers(selectedModifiers.filter((id) => id !== modifierId));
      } else {
        const currentGroupCount = selectedModifiers.filter((id) =>
          group.modifiers.some((m: any) => m.id === id),
        ).length;
        if (currentGroupCount < group.maxSelect) {
          setSelectedModifiers([...selectedModifiers, modifierId]);
        }
      }
    }
  };

  const calculatePrice = () => {
    if (!product) return 0;
    let base = getSalePrice(product) ?? Number(product.basePrice);
    if (selectedVariantId) {
      const v = product.variants?.find((v: any) => v.id === selectedVariantId);
      if (v) base = Number(v.price);
    }
    let modSum = 0;
    product.modifierGroups?.forEach((g: any) => {
      g.modifiers?.forEach((m: any) => {
        if (selectedModifiers.includes(m.id)) {
          modSum += Number(m.price);
        }
      });
    });
    return (base + modSum) * quantity;
  };

  const handleAdd = () => {
    onAddToCart({
      quantity,
      specialNote,
      selectedVariantId,
      selectedModifiers,
    });
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent variant="sheet" hideCloseButton className="p-0 flex flex-col h-[90vh]">
        {/* Modal Header Bar */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between sticky top-0 bg-white z-10">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors btn-tactile"
          >
            <span className="sr-only">Close</span>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
          </button>
          <h3 className="font-bold text-sm text-slate-900">รายละเอียดสินค้า</h3>
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={cn(
              'w-9 h-9 rounded-full border flex items-center justify-center transition-colors btn-tactile',
              isLiked ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-slate-100 border-transparent text-slate-400'
            )}
          >
            <Heart className={cn('w-4 h-4', isLiked ? 'fill-rose-500' : '')} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 py-3 overflow-y-auto space-y-4 flex-1">
          {/* Product Hero Image */}
          <div className="w-full h-48 rounded-3xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-soft">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Utensils className="w-12 h-12 text-slate-300" />
            )}
          </div>

          {/* Title & Rating */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-black text-lg text-slate-900">{product.name}</h2>
                <span className="text-xs text-slate-400">จานเด็ดปรุงสดใหม่</span>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200/60 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                4.8 (230)
              </span>
            </div>

            {/* Price tag */}
            <div className="flex items-center gap-2.5 mt-2">
              <span className="text-2xl font-black text-slate-900">{formatPrice(getSalePrice(product) ?? product.basePrice)}</span>
              {getSalePrice(product) !== null && <>
                <span className="text-sm font-bold text-slate-400 line-through">{formatPrice(product.basePrice)}</span>
                <span className="text-xs font-bold bg-[#EAF8F1] text-[#00A86B] px-2 py-0.5 rounded-md">{getDiscountPercent(product)}% OFF</span>
              </>}
            </div>

            {product.description && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Variants Section */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-extrabold text-slate-800">เลือกขนาด / เซ็ต</label>
              <div className="space-y-1.5">
                {product.variants.map((variant: any) => (
                  <div
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={cn(
                      'p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all',
                      selectedVariantId === variant.id
                        ? 'border-[#00A86B] bg-[#EAF8F1] text-slate-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    )}
                  >
                    <span className="text-xs">{variant.name}</span>
                    <span className="text-xs font-bold">{formatPrice(variant.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modifier Groups Section */}
          {product.modifierGroups?.map((group: any) => (
            <div key={group.id} className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800">
                  {group.name} {group.isRequired && <span className="text-rose-600">*</span>}
                </label>
                <span className="text-[10px] text-slate-400">
                  {group.maxSelect === 1 ? 'เลือก 1 อย่าง' : `เลือกได้สูงสุด ${group.maxSelect} อย่าง`}
                </span>
              </div>

              <div className="space-y-1.5">
                {group.modifiers?.map((mod: any) => {
                  const isSelected = selectedModifiers.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleToggleModifier(mod.id, group)}
                      className={cn(
                        'p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all',
                        isSelected
                          ? 'border-[#00A86B] bg-[#EAF8F1] text-slate-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-4 h-4 border flex items-center justify-center',
                            group.maxSelect === 1 ? 'rounded-full' : 'rounded-md',
                            isSelected ? 'border-[#00A86B] bg-[#00A86B] text-white' : 'border-slate-300'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs">{mod.name}</span>
                      </div>
                      {Number(mod.price) > 0 && (
                        <span className="text-xs font-bold text-slate-600">
                          +{formatPrice(mod.price)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Note */}
          <div className="space-y-1 pt-2 border-t border-slate-100 pb-4">
            <label className="text-xs font-extrabold text-slate-800">หมายเหตุถึงร้านค้า</label>
            <input
              type="text"
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผักชี, เผ็ดน้อย"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A86B]"
            />
          </div>
        </div>

        {/* Modal Bottom CTA Bar */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-3 sticky bottom-0 z-10">
          <QuantityStepper value={quantity} onChange={setQuantity} min={1} />

          <button
            type="button"
            disabled={isAddingToCart}
            onClick={handleAdd}
            className="flex-1 py-3.5 bg-[#00A86B] hover:bg-[#00925D] text-white font-extrabold text-sm rounded-full shadow-lg shadow-[#00A86B]/30 flex items-center justify-between px-6 transition-all btn-tactile disabled:opacity-50"
          >
            <span>เพิ่มลงตะกร้า</span>
            <span>{formatPrice(calculatePrice())}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
