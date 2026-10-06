import type { ReactNode } from 'react';
import Link from 'next/link';

const adminLinks = [
  { href: '/clinical/operations', label: 'داشبورد عملیات', icon: '▦' },
  { href: '/clinical/demo', label: 'پرونده‌های نمایشی', icon: '◈' },
  { href: '/clinical/reviews', label: 'صف بررسی بالینی', icon: '◎' },
  { href: '/clinical/documents', label: 'مدارک ورودی', icon: '▤' },
  { href: '/clinical/health-pictures', label: 'تصویرهای سلامت', icon: '◇' },
  { href: '/clinical/integrations', label: 'اتصال ارائه‌دهندگان', icon: '↔' },
];

export default function AdminShell({ children, active, reviewerName = 'دکتر نجمه شیرافکن' }: { children: ReactNode; active: string; reviewerName?: string }) {
  const initials = reviewerName.split(' ').filter(Boolean).slice(-2).map((part) => part[0]).join('');
  return <main className="admin-shell">
    <aside className="admin-side">
      <Link className="brand admin-brand" href="/clinical/operations">
        <span className="brand-mark">ه‍</span>
        <span><strong>همیار سلامت</strong><small>مرکز عملیات</small></span>
      </Link>
      <div className="admin-role"><span>پزشک و تیم بالینی</span><b>پنل پزشک</b></div>
      <nav className="admin-nav" aria-label="پنل مدیریت">
        {adminLinks.map((item) => <Link className={active === item.href ? 'active' : ''} href={item.href} key={item.href}>
          <i aria-hidden="true">{item.icon}</i><span>{item.label}</span>
        </Link>)}
      </nav>
      <Link className="customer-switch" href="/dashboard"><span>نمای پنل مشتری</span><b>←</b></Link>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar">
        <div><span className="system-live" /> <b>سامانه فعال</b></div>
        <div className="admin-user"><div><b>{reviewerName}</b><small>مسئول بالینی</small></div><span>{initials}</span></div>
      </header>
      <div className="admin-content">{children}</div>
    </section>
  </main>;
}
