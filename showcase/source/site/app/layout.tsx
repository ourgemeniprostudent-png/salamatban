import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:4173'),
  title: 'سلامت‌بان | راهنمای شخصی سلامت شما',
  icons: { icon: '/favicon.svg' },
  description: 'از ارزیابی ساختاریافته تا تصویر سلامت و برنامهٔ پیگیری، با بررسی انسانی و پیگیری شفاف.',
  openGraph: {
    title: 'سلامت‌بان | تصویر روشن، مسیر مشخص',
    description: 'برنامهٔ شخصی پیگیری سلامت، با بررسی انسانی و پیگیری شفاف.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'سلامت‌بان؛ تصویر روشن، مسیر مشخص' }],
    locale: 'fa_IR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'سلامت‌بان | تصویر روشن، مسیر مشخص',
    description: 'برنامهٔ شخصی پیگیری سلامت، با بررسی انسانی و پیگیری شفاف.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
