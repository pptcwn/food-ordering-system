'use client';

import { ImageOff, Utensils } from 'lucide-react';
import React, { useState } from 'react';

type ProductThumbnailProps = {
  alt: string;
  src?: string | null;
  className?: string;
};

export function ProductThumbnail({ alt, src, className = '' }: ProductThumbnailProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const showFallback = !src || hasImageError;

  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[#EAF3ED] ${className}`}>
      {showFallback ? (
        <span aria-label={`ไม่มีรูปสินค้า: ${alt}`} className="flex flex-col items-center gap-1 text-[#5C806A]">
          <Utensils className="h-6 w-6" aria-hidden="true" />
          <ImageOff className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setHasImageError(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
