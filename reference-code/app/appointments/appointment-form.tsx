'use client';

import { useRef, useState } from 'react';

type Provider = { id: string; name: string; city: string; adapter: string };

export default function AppointmentForm({ providers, actions, initialAction }: { providers: Provider[]; actions: { id: string; title: string }[]; initialAction: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [busy, setBusy] = useState(false);

  function fillDemo() {
    const form = formRef.current;
    if (!form) return;
    const provider = form.querySelector('[name="providerId"]') as unknown as { value: string } | null;
    const action = form.querySelector('[name="actionId"]') as unknown as { value: string } | null;
    const date = form.querySelector<HTMLInputElement>('[name="scheduledFor"]');
    if (providers[0] && provider) provider.value = providers[0].id;
    if (actions[0] && action) action.value = actions[0].id;
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    nextWeek.setMinutes(0, 0, 0);
    nextWeek.setHours(10);
    if (date) date.value = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}T10:00`;
    setMessage('مرکز، اقدام و زمان پیشنهادی نمونه تکمیل شد.');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setCheckoutUrl('');
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/appointments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ providerId: data.get('providerId'), actionId: data.get('actionId'), scheduledFor: data.get('scheduledFor') }) });
    const result = await response.json() as { checkoutUrl?: string; reference?: string; status?: string; error?: string };
    if (response.ok && result.checkoutUrl) {
      setMessage(`درخواست ${result.reference} آماده انتقال است. پرداخت و تأیید نهایی در سایت ارائه‌دهنده انجام می‌شود.`);
      setCheckoutUrl(result.checkoutUrl);
    } else if (response.ok && result.status === 'manual_pending_test') {
      setMessage(`درخواست ${result.reference} در صف هماهنگی ثبت شد.`);
      setTimeout(() => location.reload(), 900);
    } else if (response.ok && result.status === 'handoff_test') {
      setMessage(`درخواست شریک با شناسه ${result.reference} ثبت شد.`);
      setTimeout(() => location.reload(), 700);
    } else if (response.ok) {
      setMessage(`نوبت با شناسه ${result.reference} تأیید شد.`);
      setTimeout(() => location.reload(), 700);
    } else if (result.error === 'PARTNER_CONTRACT_REQUIRED') {
      setMessage('اتصال زنده تا دریافت قرارداد و مستندات رسمی ارائه‌دهنده غیرفعال است. مسیر هماهنگی دستی را انتخاب کنید.');
    } else {
      setMessage('ثبت نوبت انجام نشد. تاریخ یا وضعیت اتصال ارائه‌دهنده را بررسی کنید.');
    }
    setBusy(false);
  }

  return <form ref={formRef} className="compact-form booking-form" onSubmit={submit}>
    <button type="button" className="demo-fill-button" onClick={fillDemo}><b>⚡ پر کردن رزرو نمونه</b><span>اولین مرکز، اقدام برنامه و ساعت ۱۰ هفته آینده انتخاب می‌شود.</span></button>
    <div className="form-row">
      <label><span>مسیر ارائه خدمت</span><select name="providerId" required>{providers.map((provider) => <option value={provider.id} key={provider.id}>{provider.name} · {provider.city}{provider.adapter !== 'local_test' && provider.adapter !== 'manual_crm' ? ' · پرداخت نزد ارائه‌دهنده' : ''}</option>)}</select></label>
      <label><span>اقدام مسیر همراهی</span><select name="actionId" defaultValue={initialAction}><option value="">بدون اتصال</option>{actions.map((action) => <option value={action.id} key={action.id}>{action.title}</option>)}</select></label>
    </div>
    <label><span>زمان پیشنهادی</span><input name="scheduledFor" type="datetime-local" required /></label>
    <button className="primary-button" disabled={busy}>{busy ? 'در حال ثبت…' : 'درخواست رزرو'}</button>
    {message && <p className="inline-message" role="status">{message}</p>}
    {checkoutUrl && <a className="primary-button" href={checkoutUrl} rel="noopener noreferrer">ادامه رزرو و پرداخت نزد ارائه‌دهنده</a>}
    <small>پرداخت خدمت بیرونی نزد ارائه‌دهنده انجام می‌شود. همیار فقط درخواست، وضعیت و نتیجه بازگشتی معتبر را ثبت می‌کند.</small>
  </form>;
}
