'use client';

import { useState } from 'react';
import type { Integration } from './page';

export default function IntegrationForm({ integration }: { integration: Integration }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/clinical/integrations/${integration.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        apiBaseUrl: data.get('apiBaseUrl'),
        bookingUrl: data.get('bookingUrl'),
        credentialEnvKey: data.get('credentialEnvKey'),
        mode: data.get('mode'),
        status: data.get('status'),
        enabled: data.get('enabled') === 'on',
      }),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? 'تنظیمات اتصال ذخیره شد.' : result.error === 'LIVE_REQUIRES_READY_CONFIG' ? 'برای حالت زنده، آدرس API، آدرس رزرو و نام کلید امن الزامی است.' : 'ذخیره انجام نشد.');
    setBusy(false);
    if (response.ok) setTimeout(() => location.reload(), 500);
  }

  const protectedLocal = integration.provider_key === 'local_test';
  return <form className="integration-card" onSubmit={submit}>
    <header>
      <div><span>{integration.provider_key}</span><h2>{integration.display_name}</h2></div>
      <i className={`connection-state ${integration.status}`}>{integration.status === 'ready' ? 'آماده' : integration.status === 'blocked' ? 'منتظر قرارداد' : 'پیش‌نویس'}</i>
    </header>
    <div className="integration-fields">
      <label><span>آدرس پایه API</span><input name="apiBaseUrl" type="url" defaultValue={integration.api_base_url ?? ''} placeholder="https://partner.example/api" disabled={protectedLocal} /></label>
      <label><span>آدرس رزرو و پرداخت</span><input name="bookingUrl" type="url" defaultValue={integration.booking_url ?? ''} placeholder="https://partner.example/book" disabled={protectedLocal} /></label>
      <label><span>نام کلید در محیط امن</span><input name="credentialEnvKey" defaultValue={integration.credential_env_key ?? ''} placeholder="PROVIDER_API_TOKEN" pattern="[A-Z][A-Z0-9_]*" disabled={protectedLocal} /></label>
      <label><span>حالت</span><select name="mode" defaultValue={integration.mode} disabled={protectedLocal}><option value="test">آزمایشی</option><option value="live">زنده</option></select></label>
      <label><span>وضعیت آمادگی</span><select name="status" defaultValue={integration.status} disabled={protectedLocal}><option value="draft">پیش‌نویس</option><option value="blocked">منتظر قرارداد</option><option value="ready">آماده اتصال</option></select></label>
    </div>
    <div className="integration-footer">
      <label className="integration-toggle"><input name="enabled" type="checkbox" defaultChecked={Boolean(integration.is_enabled)} disabled={protectedLocal} /><span>نمایش در مسیر رزرو</span></label>
      <span className="payment-owner">مالک پرداخت: ارائه‌دهنده</span>
      <button className="primary-button" disabled={busy || protectedLocal}>{busy ? 'در حال ذخیره…' : protectedLocal ? 'اتصال داخلی ثابت' : 'ذخیره اتصال'}</button>
    </div>
    {message && <p className="inline-message">{message}</p>}
  </form>;
}
