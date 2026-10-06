'use client';
import { useState } from 'react';

export default function ReminderForm({ initial }: { initial: { inApp: boolean; sms: boolean; roadmap: boolean; appointments: boolean } }) {
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/reminders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ inApp: data.has('inApp'), sms: data.has('sms'), roadmap: data.has('roadmap'), appointments: data.has('appointments') }) });
    setMessage(response.ok ? 'تنظیمات یادآوری ذخیره شد.' : 'ذخیره انجام نشد.');
  }
  const options: [string, string, boolean][] = [['inApp', 'اعلان داخل سامانه', initial.inApp], ['sms', 'پیامک', initial.sms], ['roadmap', 'یادآوری اقدام‌های برنامه سلامت', initial.roadmap], ['appointments', 'یادآوری نوبت‌ها', initial.appointments]];
  return <form className="preference-form" onSubmit={submit}>{options.map(([name, label, checked]) => <label key={name}><input name={name} type="checkbox" defaultChecked={checked} /><span>{label}</span></label>)}<button className="primary-button">ذخیره تنظیمات</button>{message && <p className="inline-message">{message}</p>}</form>;
}
