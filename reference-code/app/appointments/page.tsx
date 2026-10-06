import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../db';
import { getMemberByAuthUser } from '../../lib/member';
import MemberShell from '../components/member-shell';
import AppointmentForm from './appointment-form';
import { isOpenTestMode } from '../../lib/test-mode';

export const dynamic = 'force-dynamic';
type Provider = { id: string; name: string; city: string; adapter: string };
type Action = { id: string; title: string };
type Appointment = { id: string; scheduled_for: string; status: string; external_reference: string; provider_name: string; action_title: string | null };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const user = await requireAuthenticatedUser('/appointments');
  await ensureMvpSchema();
  const member = await getMemberByAuthUser(user.userId);
  if (!member) redirect('/start');
  const db = getD1();
  const params = await searchParams;
  const order = await db.prepare("SELECT id FROM checkup_orders WHERE member_id=? AND status='paid_test' LIMIT 1").bind(member.id).first();
  const [providers, actions, appointments, profile] = await Promise.all([
    db.prepare('SELECT id,name,city,adapter FROM providers WHERE is_active=1 ORDER BY city').all<Provider>(),
    db.prepare(`SELECT ra.id,ra.title FROM roadmap_actions ra JOIN roadmaps r ON r.id=ra.roadmap_id WHERE r.member_id=? AND r.status='active' ORDER BY ra.due_date`).bind(member.id).all<Action>(),
    db.prepare(`SELECT a.id,a.scheduled_for,a.status,a.external_reference,p.name provider_name,ra.title action_title FROM appointments a JOIN providers p ON p.id=a.provider_id LEFT JOIN roadmap_actions ra ON ra.id=a.roadmap_action_id WHERE a.member_id=? ORDER BY a.scheduled_for DESC`).bind(member.id).all<Appointment>(),
    db.prepare('SELECT insurance_status FROM member_journey_profiles WHERE member_id=? LIMIT 1').bind(member.id).first<{ insurance_status: string }>(),
  ]);
  return <MemberShell name={`${member.first_name} ${member.last_name}`} active="/appointments">
    <div className="page-heading"><p>مرحله ۴ · رزرو خدمات</p><h1>مرکز و زمان مناسب را انتخاب کنید</h1><span>در اتصال بیرونی، رزرو و پرداخت نزد ارائه‌دهنده نهایی می‌شود و همیار سلامت فقط وضعیت معتبر را ثبت می‌کند.</span></div>
    <section className="booking-route" aria-label="مراحل رزرو خدمت">
      <div><b>۱</b><span>اقدام سلامت<small>از بسته یا مسیر همراهی</small></span></div>
      <div><b>۲</b><span>کنترل بیمه<small>{profile?.insurance_status === 'basic_plus' ? 'پایه و تکمیلی ثبت شده' : profile?.insurance_status === 'basic' ? 'بیمه پایه ثبت شده' : 'قیمت آزاد یا استعلام دستی'}</small></span></div>
      <div><b>۳</b><span>سایت نوبت‌دهی<small>مرکز، زمان، قیمت و وضعیت</small></span></div>
      <div><b>۴</b><span>پرداخت مستقیم<small>نزد ارائه‌دهنده خدمت</small></span></div>
      <div><b>۵</b><span>وضعیت نهایی<small>تأیید، خطا یا هماهنگی دستی</small></span></div>
    </section>
    {!order && !isOpenTestMode ? <div className="page-empty compact"><h2>ابتدا بسته ارزیابی را فعال کنید</h2><p>رزرو خدمت به سفارش بسته ارزیابی متصل می‌شود.</p><Link className="primary-button" href="/checkup">مشاهده بسته</Link></div> : <>
      <div className="content-grid"><AppointmentForm providers={providers.results} actions={actions.results} initialAction={params.action ?? ''} /><section className="record-list"><h2>درخواست‌ها و نوبت‌ها</h2>{appointments.results.length === 0 ? <div className="soft-empty">هنوز درخواستی ثبت نشده است.</div> : appointments.results.map((item) => <article key={item.id}><div><b>{item.provider_name}</b><span>{new Date(item.scheduled_for).toLocaleString('fa-IR')}</span><small>{item.action_title ?? 'ارزیابی و چکاپ'} · {item.external_reference}</small></div><div className={item.status === 'confirmed_test' ? 'status-badge approved' : 'status-badge'}>{item.status === 'confirmed_test' ? 'تأییدشده' : item.status === 'manual_pending_test' ? 'در صف هماهنگی' : 'در انتظار پرداخت ارائه‌دهنده'}</div></article>)}</section></div>
      {appointments.results.length > 0 && <div className="next-step-panel"><b>رزرو ثبت شده است</b><span>پس از انجام خدمت، نتیجه را ثبت کنید.</span><Link className="primary-button" href="/documents">ثبت نتیجه</Link></div>}
    </>}
  </MemberShell>;
}
