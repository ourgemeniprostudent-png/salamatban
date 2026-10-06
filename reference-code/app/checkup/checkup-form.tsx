'use client';

import { useRef, useState } from 'react';

export default function CheckupForm({ initialGoal, initialInsurance }: { initialGoal?: string; initialInsurance?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  function fillDemo() {
    const form = formRef.current;
    if (!form) return;
    const goal = form.querySelector('[name="goal"]') as unknown as { value: string } | null;
    const insurance = form.querySelector('[name="insuranceStatus"]') as unknown as { value: string } | null;
    const consent = form.querySelector<HTMLInputElement>('[name="bookingConsent"]');
    if (goal) goal.value = 'concern';
    if (insurance) insurance.value = 'basic_plus';
    if (consent) consent.checked = true;
    setMessage('فرم با اطلاعات نمونه تکمیل شد؛ اکنون ارسال عادی را نمایش دهید.');
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/checkup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal: data.get('goal'), insuranceStatus: data.get('insuranceStatus'), bookingConsent: data.has('bookingConsent') }) });
    const result = await response.json() as { next?: string };
    if (response.ok && result.next) location.href = result.next;
    else { setMessage('هدف، وضعیت بیمه و رضایت هماهنگی را کامل کنید.'); setBusy(false); }
  }
  return <form ref={formRef} className="checkup-flow-form" onSubmit={submit}>
    <div className="package-card"><div><span>بسته ارزیابی سلامت</span><h2>ارزیابی و طراحی مسیر سلامت</h2><p>ارزیابی پایه، هماهنگی خدمت، مرور انسانی، تصویر سلامت و برنامه ۱۲ ماهه.</p><ul><li>ارزیابی متناسب با سابقه و پاسخ‌های شما</li><li>مرور نتایج توسط بازبین انسانی</li><li>برنامه زمان‌دار با اقدام‌های مشخص</li></ul></div><aside><span>هزینه بسته</span><b>۰ ریال</b><small>مشمول طرح فعلی</small></aside></div>
    <button type="button" className="demo-fill-button" onClick={fillDemo}><b>⚡ پر کردن انتخاب‌های نمونه</b><span>هدف پیگیری دیابت و بیمه پایه و تکمیلی انتخاب می‌شود.</span></button>
    <div className="choice-fields"><label><span>هدف اصلی · قابل بازبینی</span><select name="goal" required defaultValue={initialGoal ?? ''}><option value="" disabled>انتخاب کنید</option><option value="general">اطمینان از وضعیت عمومی</option><option value="prevention">پیشگیری</option><option value="concern">پیگیری یک نگرانی</option><option value="lifestyle">بهبود سبک زندگی</option></select></label><label><span>وضعیت بیمه · قابل بازبینی</span><select name="insuranceStatus" required defaultValue={initialInsurance ?? ''}><option value="" disabled>انتخاب کنید</option><option value="none">بدون بیمه</option><option value="basic">فقط بیمه پایه</option><option value="basic_plus">بیمه پایه و تکمیلی</option></select></label></div>
    <label className="consent-row"><input type="checkbox" name="bookingConsent" defaultChecked={true} /><span><b>هماهنگی خدمت</b> فقط داده حداقلی لازم برای رزرو با سایت نوبت‌دهی استفاده شود.</span></label>
    <button className="primary-button" disabled={busy}>{busy ? 'در حال ثبت…' : 'فعال‌سازی بسته و انتخاب مرکز'}</button>
    {message && <p className="form-error" role="alert">{message}</p>}
    <p className="service-boundary">هزینه خدمات آزمایشگاه یا پزشک بیرونی در بسته همیار نیست و در محیط واقعی مستقیماً به ارائه‌دهنده پرداخت می‌شود.</p>
  </form>;
}
