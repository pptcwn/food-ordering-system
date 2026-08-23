'use client';

import * as React from 'react';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StorefrontHeroProps {
  storefront: any;
  storeName: string;
  className?: string;
}

export const StorefrontHero = React.forwardRef<HTMLElement, StorefrontHeroProps>(
  ({ storefront, storeName, className }, ref) => {
    const themeColor = storefront?.storefrontThemeColor || '#1F5D45';

    return (
      <section ref={ref} className={cn('overflow-hidden rounded-3xl bg-white border border-[#D5E5DA] shadow-soft', className)}>
        <div
          className="relative h-36 bg-[#1F5D45]"
          style={{ backgroundColor: themeColor }}
        >
          {storefront?.storefrontCoverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storefront.storefrontCoverUrl}
              alt={`ภาพปก ${storefront.name || storeName}`}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
        </div>
        <div className="relative px-4 pb-4">
          <div className="absolute -top-10 left-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-[#FAF8F5] shadow-md">
            {storefront?.storefrontProfileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storefront.storefrontProfileUrl} alt={`โลโก้ ${storefront.name || storeName}`} className="w-full h-full object-cover" />
            ) : (
              <Utensils className="w-8 h-8" style={{ color: themeColor }} />
            )}
          </div>
          <div className="pt-12">
            <h1 className="text-lg font-black text-slate-900">{storeName}</h1>
            {storefront?.storefrontHeadline && (
              <p className="mt-1 text-sm font-extrabold" style={{ color: themeColor }}>
                {storefront.storefrontHeadline}
              </p>
            )}
            {storefront?.storefrontSubheadline && (
              <p className="mt-1 text-xs text-slate-500">{storefront.storefrontSubheadline}</p>
            )}
          </div>
        </div>
      </section>
    );
  }
);
StorefrontHero.displayName = 'StorefrontHero';
