import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Food Delivery — สั่งอาหารง่ายๆ สไตล์ LINE MAN',
  description: 'ระบบสั่งอาหารออนไลน์สไตล์ LINE MAN / GrabFood จัดส่งรวดเร็ว สดใหม่ทุกออเดอร์',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-[100dvh] bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white antialiased">
        <Providers>
          <div className="max-w-[480px] mx-auto min-h-[100dvh] bg-white shadow-2xl flex flex-col relative border-x border-slate-200/80">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
