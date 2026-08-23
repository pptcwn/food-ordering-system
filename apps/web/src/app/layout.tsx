import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { DemoRoleDock } from '@/components/demo-role-dock';

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
    <html lang="th" className="bg-background">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-[100dvh] bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white antialiased">
        <Providers>
          <div className="w-full min-h-[100dvh] bg-white shadow-2xl flex flex-col relative border-x border-slate-200/80 lg:max-w-none lg:shadow-none">
            {children}
          </div>
          <DemoRoleDock />
        </Providers>
      </body>
    </html>
  );
}
