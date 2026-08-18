import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'LINE Food Ordering',
  description: 'สั่งอาหารง่ายๆ ผ่าน LINE Official Account & LIFF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-[100dvh] bg-zinc-50 text-zinc-900 font-sans selection:bg-rose-500 selection:text-white">
        <Providers>
          <div className="max-w-md mx-auto min-h-[100dvh] bg-white shadow-xl flex flex-col relative border-x border-zinc-200">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
