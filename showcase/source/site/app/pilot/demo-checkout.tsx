'use client';
import { useEffect, useRef, useState } from 'react';
import { formatPersianDate } from '../../lib/persian-date';
export type DemoOrder = { id: string; amountRial: number; status: string; reference?: string; createdAt: number };
const fa = (n: number) => n.toLocaleString('fa-IR');
export function DemoCheckout({ order, onPay, onBack, onSubmit, canSubmit }: {
  order: DemoOrder; onPay: (result: 'paid' | 'failed') => Promise<void>; onBack: () => void; onSubmit: () => void; canSubmit: boolean;
}) {
  const [stage, setStage] = useState<'review' | 'gateway' | 'result'>(['paid', 'failed'].includes(order.status) ? 'result' : 'review');
  const [result, setResult] = useState<'paid' | 'failed'>('paid');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start' }); }, [stage]);
  async function pay() {
    if (busy) return;
    setBusy(true); setError('');
    try { await onPay(result); setStage('result'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="ux-checkout" aria-label="فرایند پرداخت نمایشی" aria-busy={busy}>
    <ol className="ux-checkout-steps">{['مرور مبلغ', 'پرداخت آزمایشی', 'نتیجه و رسید'].map((label, index) => <li key={label} aria-current={index === ['review', 'gateway', 'result'].indexOf(stage) ? 'step' : undefined}>{label}</li>)}</ol>
    <h3 tabIndex={-1} ref={heading}>{stage === 'review' ? 'مرور سفارش' : stage === 'gateway' ? 'درگاه آزمایشی سلامت‌بان' : order.status === 'paid' ? 'پرداخت نمایشی موفق بود' : 'پرداخت نمایشی ناموفق بود'}</h3>
    <p className="ux-demo-label">این پرداخت فقط تمرینی است؛ هیچ پولی جابه‌جا نمی‌شود و اطلاعات بانکی لازم نیست.</p>
    <dl className="ux-receipt"><div><dt>خدمت</dt><dd>ارزیابی و برنامه اولیه</dd></div><div><dt>مبلغ نمونه</dt><dd><strong>{fa(order.amountRial / 10)} تومان</strong><small>{fa(order.amountRial)} ریال · هزینه مراکز جداست</small></dd></div><div><dt>شناسه سفارش</dt><dd><bdi>{order.id}</bdi></dd></div>{stage === 'result' && <><div><dt>تاریخ سفارش</dt><dd>{formatPersianDate(new Date(order.createdAt).toISOString().slice(0, 10))}</dd></div>{order.status === 'paid' && <div><dt>رسید نمایشی</dt><dd><bdi>{order.reference}</bdi></dd></div>}</>}</dl>
    {stage === 'review' && <div className="p-actions"><button className="p-primary" onClick={() => setStage('gateway')}>ادامه به پرداخت آزمایشی</button><button className="p-secondary" onClick={onBack}>انصراف و بازگشت به پرونده</button></div>}
    {stage === 'gateway' && <><p>با تأیید زیر، نتیجهٔ پرداخت در همین نسخهٔ نمایشی ثبت می‌شود.</p><details className="ux-payment-scenario"><summary>آزمودن پرداخت ناموفق</summary><label className="p-choice"><input type="checkbox" checked={result === 'failed'} disabled={busy} onChange={e => setResult(e.target.checked ? 'failed' : 'paid')}/>این بار پرداخت را ناموفق شبیه‌سازی کن</label></details>{error && <p className="ux-error" role="alert">{error} وضعیت را دوباره بررسی کنید؛ پاسخ موفقی دریافت نشده است.</p>}<div className="p-actions"><button className="p-primary" disabled={busy} onClick={() => void pay()}>{busy ? 'در حال ثبت نتیجه…' : error ? 'بررسی و تلاش دوباره' : 'تأیید پرداخت نمایشی'}</button><button className="p-secondary" disabled={busy} onClick={onBack}>انصراف و بازگشت به پرونده</button></div></>}
    {stage === 'result' && <><p role="status">{order.status === 'paid' ? 'رسید در حساب شما ثبت شد. اکنون پرونده را برای بررسی پزشک ارسال کنید.' : 'پرداختی ثبت نشده است. پاسخ‌های پرونده محفوظ‌اند؛ می‌توانید دوباره تلاش کنید.'}</p><div className="p-actions">{order.status === 'paid' && <button className="p-primary" disabled={!canSubmit} onClick={onSubmit}>ارسال برای بررسی پزشک</button>}<button className="p-secondary" onClick={onBack}>{order.status === 'paid' ? 'بازگشت به پرونده' : 'بازگشت و تلاش دوباره'}</button></div></>}
  </section>;
}
