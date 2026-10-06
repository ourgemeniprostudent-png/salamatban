import { redirect } from 'next/navigation';
import { ensureMvpSchema, getD1 } from '../../../db';
import { getClinicalReviewer } from '../../../lib/clinical-access';
import IntegrationForm from './integration-form';
import AdminShell from '../../components/admin-shell';

export const dynamic = 'force-dynamic';

export type Integration = {
  id: string;
  provider_key: string;
  display_name: string;
  api_base_url: string | null;
  booking_url: string | null;
  credential_env_key: string | null;
  mode: 'test' | 'live';
  status: 'draft' | 'blocked' | 'ready';
  payment_owner: 'provider';
  is_enabled: number;
  updated_at: number;
};

export default async function IntegrationsPage() {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) redirect('/signin-with-chatgpt?return_to=%2Fclinical%2Fintegrations');
  await ensureMvpSchema();
  const integrations = await getD1().prepare(`SELECT id,provider_key,display_name,api_base_url,booking_url,
    credential_env_key,mode,status,payment_owner,is_enabled,updated_at
    FROM provider_integrations ORDER BY display_name`).all<Integration>();

  return <AdminShell active="/clinical/integrations">
    <div className="admin-page-head"><div><p>تنظیمات عملیاتی</p><h1>اتصال ارائه‌دهندگان</h1></div><div className="head-summary"><b>{integrations.results.length.toLocaleString('fa-IR')}</b><span>اتصال تعریف‌شده</span></div></div>
    <section className="integration-intro">
      <div><span>BookingPlatformAdapter</span><h2>هر شریک از یک مرز استاندارد عبور می‌کند</h2><p>فعال‌سازی زنده به قرارداد API، محیط Sandbox، امضای Webhook، جلوگیری از تکرار، تطبیق وضعیت و مسیر جایگزین CRM نیاز دارد.</p></div>
      <b>رزرو و پرداخت نزد ارائه‌دهنده</b>
    </section>
    <section className="integration-pipeline" aria-label="چرخه اتصال ارائه‌دهنده"><span>درخواست خدمت</span><b>←</b><span>تطبیق مدل شریک</span><b>←</b><span>رزرو و پرداخت بیرونی</span><b>←</b><span>Webhook امن</span><b>←</b><span>تطبیق یا CRM</span></section>
    <section className="integration-list">
      {integrations.results.map((item) => <IntegrationForm key={item.id} integration={item} />)}
    </section>
  </AdminShell>;
}
