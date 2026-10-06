'use client';
import { useState } from 'react';

export default function UploadForm() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/documents', { method: 'POST', body: new FormData(event.currentTarget) });
    const data = await response.json() as { error?: string };
    if (response.ok) { setMessage('فایل ثبت شد و برای بررسی ارسال شد.'); event.currentTarget.reset(); setTimeout(() => location.reload(), 700); }
    else setMessage(data.error === 'INVALID_FILE' ? 'فقط PDF، JPG یا PNG تا ۹۰۰ کیلوبایت پذیرفته می‌شود.' : 'ثبت فایل انجام نشد.');
    setBusy(false);
  }
  return <form className="compact-form" onSubmit={submit}><label><span>انتخاب مدرک</span><input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required /></label><button className="primary-button" disabled={busy}>{busy ? 'در حال ثبت…' : 'بارگذاری امن'}</button>{message && <p className="inline-message">{message}</p>}</form>;
}
