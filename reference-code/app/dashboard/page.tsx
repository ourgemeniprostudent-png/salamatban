import Link from 'next/link';
import { ensureMvpSchema, getD1 } from '../../db';
import { requireAuthenticatedUser } from '../chatgpt-auth';
import { getJourneyState } from '../../lib/journey';
import MemberShell from '../components/member-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser('/dashboard');
  await ensureMvpSchema();
  const db = getD1();
  const member = await db.prepare('SELECT id,first_name,last_name,city FROM members WHERE auth_user_id=? LIMIT 1').bind(user.userId).first<{ id: string; first_name: string; last_name: string; city: string }>();
  if (!member) return <main className="empty-state"><h1>حساب شما آماده تکمیل است</h1><p>اطلاعات پایه را ثبت کنید تا پنل شخصی ساخته شود.</p><Link className="primary-button" href="/start">تکمیل حساب</Link></main>;
  const journey = await getJourneyState(member.id);
  const state = await db.prepare(`SELECT
    (SELECT COUNT(*) FROM roadmap_actions ra JOIN roadmaps r ON r.id=ra.roadmap_id WHERE r.member_id=? AND r.status='active') action_count,
    (SELECT COUNT(*) FROM roadmap_actions ra JOIN roadmaps r ON r.id=ra.roadmap_id WHERE r.member_id=? AND r.status='active' AND ra.status='completed') completed_count,
    (SELECT COUNT(*) FROM medical_documents WHERE member_id=?) document_count,
    (SELECT COUNT(*) FROM appointments WHERE member_id=?) appointment_count,
    (SELECT duration_months FROM subscriptions WHERE member_id=? AND status='active_test' ORDER BY created_at DESC LIMIT 1) duration_months`).bind(member.id, member.id, member.id, member.id, member.id).first<Record<string, number>>();
  const complete = journey.completedThrough >= 10;

  return <MemberShell name={`${member.first_name} ${member.last_name}`} active="/dashboard">
    <section className="health-home-hero"><div><p>خانه سلامت من</p><h1>سلام {member.first_name}، خوش آمدید.</h1></div><div className="home-progress"><b>{Math.min(journey.completedThrough, 11).toLocaleString('fa-IR')}</b><span>از ۱۱ بخش</span></div></section>
    {!complete && <section className="next-journey-card"><span>پیشنهاد امروز</span><h2>{journey.nextLabel}</h2><p>این بخش برای ادامه برنامه سلامت شما آماده است.</p><Link className="primary-button" href={journey.nextHref}>مشاهده و ادامه</Link></section>}
    <section className="home-metrics">
      <article><span>اقدام‌های انجام‌شده</span><b>{Number(state?.completed_count ?? 0).toLocaleString('fa-IR')} / {Number(state?.action_count ?? 0).toLocaleString('fa-IR')}</b><Link href="/roadmap">مشاهده برنامه</Link></article>
      <article><span>نوبت‌های ثبت‌شده</span><b>{Number(state?.appointment_count ?? 0).toLocaleString('fa-IR')}</b><Link href="/appointments">مدیریت نوبت‌ها</Link></article>
      <article><span>مدارک و نتایج</span><b>{Number(state?.document_count ?? 0).toLocaleString('fa-IR')}</b><Link href="/documents">مشاهده مدارک</Link></article>
      <article><span>شیوه اجرا</span><b>{journey.executionMode === 'active' ? `${Number(state?.duration_months ?? 0).toLocaleString('fa-IR')} ماه همراهی` : journey.executionMode === 'self' ? 'اجرای مستقل' : 'انتخاب نشده'}</b><Link href="/execution">مدیریت خدمات</Link></article>
    </section>
    <div className="home-actions"><Link href="/appointments">رزرو خدمت جدید</Link><Link href="/documents">افزودن نتیجه</Link><Link href="/record">مشاهده پرونده کامل</Link></div>
  </MemberShell>;
}
