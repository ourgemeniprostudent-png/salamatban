import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../db';
import { getMemberByAuthUser } from '../../lib/member';
import MemberShell from '../components/member-shell';

export const dynamic = 'force-dynamic';

export default async function RecordPage() {
  const user = await requireAuthenticatedUser('/record');
  await ensureMvpSchema();
  const member = await getMemberByAuthUser(user.userId);
  if (!member) redirect('/start');
  const db = getD1();
  const [picture, docs, appointments, sub] = await Promise.all([
    db.prepare("SELECT summary,version FROM health_pictures WHERE member_id=? AND status='published' ORDER BY version DESC LIMIT 1").bind(member.id).first<{ summary: string; version: number }>(),
    db.prepare('SELECT original_name,status,created_at FROM medical_documents WHERE member_id=? ORDER BY created_at DESC LIMIT 5').bind(member.id).all<{ original_name: string; status: string; created_at: number }>(),
    db.prepare('SELECT a.scheduled_for,a.status,p.name FROM appointments a JOIN providers p ON p.id=a.provider_id WHERE a.member_id=? ORDER BY a.scheduled_for DESC LIMIT 5').bind(member.id).all<{ scheduled_for: string; status: string; name: string }>(),
    db.prepare("SELECT duration_months,status,starts_on,ends_on FROM subscriptions WHERE member_id=? ORDER BY created_at DESC LIMIT 1").bind(member.id).first<{ duration_months: number; status: string; starts_on: string; ends_on: string }>(),
  ]);

  return <MemberShell name={`${member.first_name} ${member.last_name}`} active="/record">
    <div className="page-heading record-head"><div><p>پرونده پزشکی من</p><h1>سوابق و خروجی‌های سلامت</h1></div></div>
    <section className="record-summary"><article><span>صاحب پرونده</span><b>{member.first_name} {member.last_name}</b><small>{member.city}</small></article><article><span>تصویر سلامت</span><b>{picture ? `نسخه ${picture.version.toLocaleString('fa-IR')}` : 'منتشر نشده'}</b><small>آخرین جمع‌بندی موجود</small></article><article><span>خدمات همراهی</span><b>{sub ? `${sub.duration_months.toLocaleString('fa-IR')} ماه فعال` : 'اجرای مستقل'}</b><small>{sub ? `${sub.starts_on} تا ${sub.ends_on}` : 'بدون اشتراک فعال'}</small></article></section>
    {picture && <section className="record-block"><h2>آخرین جمع‌بندی سلامت</h2><p>{picture.summary}</p></section>}
    <div className="record-columns"><section className="record-block"><h2>آخرین مدارک</h2>{docs.results.length ? docs.results.map((doc, index) => <div key={index}><b>{doc.original_name}</b><span>{doc.status === 'approved' ? 'تأییدشده' : doc.status === 'rejected' ? 'ردشده' : 'در حال بررسی'}</span></div>) : <p>مدرکی ثبت نشده است.</p>}</section><section className="record-block"><h2>آخرین نوبت‌ها</h2>{appointments.results.length ? appointments.results.map((item, index) => <div key={index}><b>{item.name}</b><span>{new Date(item.scheduled_for).toLocaleString('fa-IR')}</span></div>) : <p>نوبتی ثبت نشده است.</p>}</section></div>
  </MemberShell>;
}
