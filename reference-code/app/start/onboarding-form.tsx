'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<'idle'|'saving'|'error'>('idle');

  function fillDemo() {
    const form = formRef.current;
    if (!form) return;
    const values: Record<string, string> = { firstName: 'مریم', lastName: 'احمدی', phone: '09120000000', birthDate: '1972-04-18', city: 'تهران', goal: 'concern', insuranceStatus: 'basic_plus' };
    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (field) field.value = value;
    }
    for (const name of ['recordConsent', 'clinicalConsent', 'bookingConsent']) {
      const checkbox = form.elements.namedItem(name) as HTMLInputElement | null;
      if (checkbox) checkbox.checked = true;
    }
    setStatus('idle');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: data.get('firstName'), lastName: data.get('lastName'), phone: data.get('phone'),
        birthDate: data.get('birthDate'), city: data.get('city'), goal: data.get('goal'), insuranceStatus: data.get('insuranceStatus'),
        serviceConsent: data.get('recordConsent') === 'on', privacyConsent: data.get('recordConsent') === 'on',
        clinicalConsent: data.get('clinicalConsent') === 'on', bookingConsent: data.get('bookingConsent') === 'on',
      }),
    });
    if (!response.ok) { setStatus('error'); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form ref={formRef} className="onboarding-form" onSubmit={submit}>
      <div className="form-banner"><strong>محیط آزمایشی Stage 2</strong><span>فعلاً فقط از اطلاعات ساختگی یا آزمایشی استفاده کنید.</span></div>
      <button type="button" className="demo-fill-button" onClick={fillDemo}><b>⚡ پر کردن با بیمار نمونه</b><span>اطلاعات ساختگی مریم احمدی و رضایت‌های دمو یک‌جا تکمیل می‌شوند.</span></button>
      <div className="field-grid">
        <label><span>نام</span><input name="firstName" required autoComplete="given-name" /></label>
        <label><span>نام خانوادگی</span><input name="lastName" required autoComplete="family-name" /></label>
        <label><span>شماره همراه</span><input name="phone" required inputMode="tel" dir="ltr" placeholder="09123456789" /></label>
        <label><span>تاریخ تولد</span><input name="birthDate" required type="date" dir="ltr" /></label>
        <label><span>شهر محل سکونت</span><input name="city" required autoComplete="address-level2" /></label>
        <label><span>هدف اصلی</span><select name="goal" required defaultValue=""><option value="" disabled>انتخاب کنید</option><option value="general">اطمینان از وضعیت عمومی</option><option value="prevention">پیشگیری از بیماری</option><option value="concern">پیگیری یک نگرانی</option><option value="lifestyle">بهبود سبک زندگی</option></select></label>
        <label><span>وضعیت بیمه</span><select name="insuranceStatus" required defaultValue=""><option value="" disabled>انتخاب کنید</option><option value="none">بدون بیمه</option><option value="basic">فقط بیمه پایه</option><option value="basic_plus">بیمه پایه و تکمیلی</option></select></label>
        <label><span>ایمیل حساب</span><input value={email} disabled dir="ltr" /></label>
      </div>
      <div className="consent-list">
        <label><input type="checkbox" name="recordConsent" required /><span><b>ساخت پرونده سلامت</b><small>پردازش اطلاعات برای ارزیابی و ساخت برنامه سلامت.</small></span></label>
        <label><input type="checkbox" name="clinicalConsent" required /><span><b>مرور توسط تیم بالینی</b><small>مرور نتیجه، ثبت نظر و مشخص‌کردن موارد نیازمند پیگیری.</small></span></label>
        <label><input type="checkbox" name="bookingConsent" required /><span><b>هماهنگی با سایت نوبت‌دهی</b><small>اشتراک فقط داده حداقلی لازم برای یافتن و رزرو خدمت.</small></span></label>
      </div>
      <p className="form-boundary">این نسخه جایگزین پزشک یا خدمات اورژانسی نیست. فعلاً فقط اطلاعات ساختگی وارد کنید.</p>
      {status === 'error' && <p className="form-error" role="alert">اطلاعات کامل یا معتبر نیست. لطفاً فیلدها و شرط حداقل سن ۱۸ سال را بررسی کنید.</p>}
      <button className="submit-button" disabled={status === 'saving'}>{status === 'saving' ? 'در حال ذخیره…' : 'ذخیره و ورود به داشبورد'}</button>
    </form>
  );
}
