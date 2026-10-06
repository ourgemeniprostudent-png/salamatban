import type { ReactNode } from 'react';
import Link from 'next/link';
import { getAuthenticatedUser } from '../chatgpt-auth';
import { getMemberByAuthUser } from '../../lib/member';
import { getJourneyState } from '../../lib/journey';

const customerLinks = [
  { href: '/dashboard', label: 'خانه سلامت', icon: '⌂' },
  { href: '/assessment', label: 'ارزیابی سلامت', icon: '◇' },
  { href: '/appointments', label: 'نوبت‌های من', icon: '◷' },
  { href: '/documents', label: 'مدارک و نتایج', icon: '▤' },
  { href: '/health-picture', label: 'تصویر سلامت', icon: '◎' },
  { href: '/roadmap', label: 'برنامه سلامت', icon: '✓' },
  { href: '/assistance', label: 'خدمات همراهی', icon: '♡' },
];

const accountLinks = [
  { href: '/demo', label: 'دموی نمونه‌ها' },
  { href: '/record', label: 'پرونده من' },
  { href: '/settings', label: 'تنظیمات' },
];

export default async function MemberShell({ children, name, active }: { children: ReactNode; name: string; active: string }) {
  const user = await getAuthenticatedUser();
  const member = user ? await getMemberByAuthUser(user.userId) : null;
  const state = member ? await getJourneyState(member.id) : null;
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
  const progress = Math.round(((state?.completedThrough ?? 1) / 11) * 100);

  return <main className="portal-shell customer-shell">
    <aside className="customer-side">
      <Link className="brand customer-brand" href="/">
        <span className="brand-mark">ه‍</span>
        <span><strong>همیار سلامت</strong><small>پنل شخصی من</small></span>
      </Link>

      <div className="customer-profile">
        <span className="user-pill">{initials}</span>
        <div><b>{name}</b><small>عضو همیار سلامت</small></div>
      </div>

      <nav className="customer-nav" aria-label="پنل مشتری">
        {customerLinks.map((item) => <Link className={active === item.href ? 'active' : ''} href={item.href} key={item.href}>
          <i aria-hidden="true">{item.icon}</i><span>{item.label}</span>
        </Link>)}
      </nav>

      <div className="customer-progress-card">
        <div><b>پیشرفت برنامه</b><span>{progress.toLocaleString('fa-IR')}٪</span></div>
        <div className="customer-progress"><span style={{ width: `${progress}%` }} /></div>
        <small>{(state?.completedThrough ?? 1).toLocaleString('fa-IR')} از ۱۱ بخش تکمیل شده</small>
      </div>
    </aside>

    <section className="customer-main">
      <header className="customer-topbar">
        <nav>{accountLinks.map((item) => <Link className={active === item.href ? 'active' : ''} href={item.href} key={item.href}>{item.label}</Link>)}</nav>
        <div className="customer-support"><span className="support-dot" /> <b>پشتیبانی همیار</b><small>پاسخ‌گو در ساعات کاری</small></div>
      </header>
      <div className="customer-content">{children}</div>
    </section>
  </main>;
}
