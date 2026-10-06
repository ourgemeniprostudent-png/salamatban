import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:4173'),
  title: 'همیار سلامت | راهنمای شخصی سلامت شما',
  description: 'از ارزیابی ساختاریافته تا تصویر سلامت و مسیر همراهی ۱۲ ماهه، با بررسی انسانی و پیگیری شفاف.',
  openGraph: {
    title: 'همیار سلامت | تصویر روشن، مسیر مشخص',
    description: 'مسیر همراهی شخصی ۱۲ ماهه سلامت، با بررسی انسانی و پیگیری شفاف.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'همیار سلامت؛ تصویر روشن، مسیر مشخص' }],
    locale: 'fa_IR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'همیار سلامت | تصویر روشن، مسیر مشخص',
    description: 'مسیر همراهی شخصی ۱۲ ماهه سلامت، با بررسی انسانی و پیگیری شفاف.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
