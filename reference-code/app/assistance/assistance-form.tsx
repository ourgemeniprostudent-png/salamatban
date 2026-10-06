'use client';
import { useState } from 'react';

export default function AssistanceForm({ plans }: { plans: { id: string; title: string; duration_months: number }[] }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function activate(id: string) {
    setBusy(true);
    const response = await fetch('/api/assistance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ planId: id, idempotencyKey: crypto.randomUUID() }) });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? 'خدمات همراهی فعال شد.' : data.error ?? 'فعال‌سازی انجام نشد.');
    if (response.ok) setTimeout(() => location.reload(), 700);
    setBusy(false);
  }
  return <div className="plan-grid">{plans.map((plan) => <article key={plan.id}><span>{plan.duration_months} ماه</span><h3>{plan.title}</h3><p>پیگیری اقدام‌ها، هماهنگی نوبت و یادآوری برنامه سلامت.</p><b>۰ ریال</b><button disabled={busy} onClick={() => activate(plan.id)}>انتخاب این دوره</button></article>)}{message && <p className="inline-message full">{message}</p>}</div>;
}
