import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ensureMvpSchema, getD1 } from '../../../db';
import { getClinicalReviewer } from '../../../lib/clinical-access';
import AdminShell from '../../components/admin-shell';

export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) redirect('/signin-with-chatgpt?return_to=%2Fclinical%2Foperations');
  await ensureMvpSchema();
  const db = getD1();
  const stats = await db.prepare(`SELECT
    (SELECT COUNT(*) FROM members) members,
    (SELECT COUNT(*) FROM clinical_reviews WHERE status='pending') pending_reviews,
    (SELECT COUNT(*) FROM medical_documents WHERE status='quarantined') quarantined_docs,
    (SELECT COUNT(*) FROM appointments WHERE status IN ('confirmed_test','handoff_test','manual_pending_test')) appointments,
    (SELECT COUNT(*) FROM subscriptions WHERE status='active_test') active_subscriptions,
    (SELECT COUNT(*) FROM care_tasks WHERE status='open') open_tasks`).first<Record<string, number>>();
  const events = await db.prepare('SELECT action,resource_type,outcome,created_at FROM audit_events ORDER BY created_at DESC LIMIT 12').all<{ action: string; resource_type: string; outcome: string; created_at: number }>();

  const metrics = [
    ['اعضای ثبت‌شده', stats?.members, 'همه پرونده‌ها'],
    ['بررسی‌های منتظر', stats?.pending_reviews, 'صف تیم بالینی'],
    ['مدارک ورودی', stats?.quarantined_docs, 'نیازمند بررسی'],
    ['درخواست‌های نوبت', stats?.appointments, 'همه کانال‌ها'],
    ['همراهی فعال', stats?.active_subscriptions, 'اشتراک جاری'],
    ['کارهای باز', stats?.open_tasks, 'پیگیری عملیات'],
  ];

  return <AdminShell active="/clinical/operations">
    <div className="admin-page-head"><div><p>نمای امروز</p><h1>داشبورد عملیات</h1></div><time>{new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}</time></div>
    <section className="admin-metrics">{metrics.map(([label, value, hint]) => <article key={String(label)}><span>{String(label)}</span><b>{Number(value ?? 0).toLocaleString('fa-IR')}</b><small>{String(hint)}</small></article>)}</section>
    <section className="admin-work-grid">
      <div className="admin-panel"><div className="panel-head"><div><p>کارهای نیازمند اقدام</p><h2>صف‌های کاری</h2></div></div><div className="queue-actions">
        <Link href="/clinical/reviews"><span><b>بررسی پرونده‌های سلامت</b><small>اولویت‌بندی فوری و عادی</small></span><em>{Number(stats?.pending_reviews ?? 0).toLocaleString('fa-IR')}</em></Link>
        <Link href="/clinical/documents"><span><b>تأیید مدارک ورودی</b><small>کنترل فایل و وضعیت نتیجه</small></span><em>{Number(stats?.quarantined_docs ?? 0).toLocaleString('fa-IR')}</em></Link>
        <Link href="/clinical/health-pictures"><span><b>انتشار تصویر سلامت</b><small>جمع‌بندی و برنامه شخصی</small></span><em>←</em></Link>
        <Link href="/clinical/integrations"><span><b>مدیریت ارائه‌دهندگان</b><small>رزرو، پرداخت و اتصال API</small></span><em>←</em></Link>
      </div></div>
      <div className="admin-panel"><div className="panel-head"><div><p>ثبت سیستم</p><h2>آخرین فعالیت‌ها</h2></div></div><div className="admin-activity">{events.results.length === 0 ? <p className="admin-empty">هنوز فعالیتی ثبت نشده است.</p> : events.results.map((event, index) => <div key={`${event.created_at}-${index}`}><i /><span><b>{event.action}</b><small>{event.resource_type} · {event.outcome}</small></span><time>{new Date(event.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</time></div>)}</div></div>
    </section>
  </AdminShell>;
}
