'use client';
import { useState } from 'react';

export default function ExecutionForm({ initial }: { initial: string | null }) {
  const [choice, setChoice] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!choice) return;
    setBusy(true);
    const response = await fetch('/api/execution', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: choice }) });
    const data = await response.json() as { next?: string };
    if (response.ok && data.next) location.href = data.next;
    else setBusy(false);
  }
  return <div><div className="execution-grid"><button className={choice === 'self' ? 'selected' : ''} onClick={() => setChoice('self')}><span>اجرای مستقل</span><h2>خودم اجرا می‌کنم</h2><p>برنامه سلامت، ثبت پیشرفت و رزرو خدمات در دسترس است.</p><b>بدون اشتراک همراهی</b></button><button className={choice === 'active' ? 'selected' : ''} onClick={() => setChoice('active')}><span>همراهی فعال</span><h2>همیار کنارم باشد</h2><p>یادآوری، هماهنگی نوبت و پیگیری اقدام‌ها توسط تیم همیار.</p><b>انتخاب دوره در گام بعد</b></button></div><button className="primary-button execution-next" disabled={!choice || busy} onClick={save}>{busy ? 'در حال ثبت…' : 'ادامه مسیر'}</button></div>;
}
