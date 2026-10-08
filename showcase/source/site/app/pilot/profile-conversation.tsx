'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import './grouped-intake.css';

export function ProfileConversation({ fields, validationAttempt }: { validationAttempt: number; fields: { id: string; title: string; content: ReactNode; valid: boolean }[] }) {
  const region = useRef<HTMLDivElement>(null);
  const previousAttempt = useRef(validationAttempt);
  useEffect(() => {
    if (previousAttempt.current === validationAttempt) return;
    previousAttempt.current = validationAttempt;
    const missing = fields.find(field => !field.valid);
    if (missing) {
      const field = region.current?.querySelector<HTMLElement>(`[data-profile-field="${missing.id}"]`);
      field?.querySelector<HTMLInputElement>('input,textarea,button')?.focus({ preventScroll: true });
      field?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [validationAttempt, fields]);

  return <div className="j-profile gi-profile" ref={region}>
    <header className="gi-section-heading"><div><span className="gi-kicker">اطلاعات پایهٔ شما</span><h3>یک‌بار کامل کنید، با هم ادامه می‌دهیم.</h3><p>مشخصات را در همین صفحه وارد کنید؛ سپس به بررسی وضعیت سلامت می‌رویم.</p></div><span className="gi-completion" aria-live="polite">{fields.filter(field => field.valid).length.toLocaleString('fa-IR')} از {fields.length.toLocaleString('fa-IR')} بخش کامل</span></header>
    <div className="gi-profile-grid">{fields.map(field => <section key={field.id} className={`gi-profile-field gi-profile-${field.id}`} data-profile-field={field.id} aria-labelledby={`profile-heading-${field.id}`}><h4 id={`profile-heading-${field.id}`}>{field.title}</h4>{field.content}</section>)}</div>
  </div>;
}
