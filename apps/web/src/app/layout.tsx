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
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1F5D45" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-[100dvh] bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#1F5D45] focus:text-white focus:rounded-xl focus:text-sm focus:font-bold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Providers>
          <div id="main-content" className="w-full min-h-[100dvh] bg-white shadow-2xl flex flex-col relative border-x border-slate-200/80 lg:max-w-none lg:shadow-none">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
