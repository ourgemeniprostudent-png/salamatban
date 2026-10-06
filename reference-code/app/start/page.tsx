import Link from 'next/link';
import { requireAuthenticatedUser } from '../chatgpt-auth';
import OnboardingForm from './onboarding-form';
import { journeySteps } from '../../lib/journey';

export const dynamic = 'force-dynamic';

export default async function StartPage() {
  const user = await requireAuthenticatedUser('/start');
  return (
    <main className="app-shell">
      <header className="app-header"><Link className="brand" href="/"><span className="brand-mark">ه‍</span><strong>همیار سلامت</strong></Link><span>ساخت حساب کاربری</span></header>
      <section className="onboarding-layout">
        <aside className="onboarding-journey" aria-label="مسیر سلامت">
          <div><p>مسیر سلامت من</p><span>گام ۲ از ۱۱</span></div>
          <ol>{journeySteps.map((step) => <li className={step.number === 1 ? 'done' : step.number === 2 ? 'active' : ''} key={step.number}><b>{step.number === 1 ? '✓' : step.number}</b><span>{step.label}</span></li>)}</ol>
          <small>هر مرحله پس از ثبت معتبر مرحله قبل فعال می‌شود.</small>
        </aside>
        <div className="onboarding-wrap">
          <div className="onboarding-intro"><p>رضایت، پروفایل و بیمه</p><h1>کنترل اطلاعات با شماست</h1><span>فقط اطلاعات لازم برای ساخت پرونده، مرور انسانی و هماهنگی خدمت ثبت می‌شود.</span></div>
          <OnboardingForm email={user.email} />
        </div>
      </section>
    </main>
  );
}
