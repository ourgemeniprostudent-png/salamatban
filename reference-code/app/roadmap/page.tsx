import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../db';
import MemberShell from '../components/member-shell';
import ActionUpdateForm from './action-update-form';

export const dynamic = 'force-dynamic';
type Roadmap = { id: string; version: number; start_date: string };
type Action = { id: string; title: string; rationale: string; due_date: string; priority: string; owner_type: string; status: string; completion_rule: string };

export default async function RoadmapPage() {
  const user = await requireAuthenticatedUser('/roadmap');
  await ensureMvpSchema();
  const db = getD1();
  const member = await db.prepare('SELECT id,first_name,last_name FROM members WHERE auth_user_id=? LIMIT 1').bind(user.userId).first<{ id: string; first_name: string; last_name: string }>();
  if (!member) redirect('/start');
  const roadmap = await db.prepare("SELECT id,version,start_date FROM roadmaps WHERE member_id=? AND status='active' ORDER BY version DESC LIMIT 1").bind(member.id).first<Roadmap>();
  const actions = roadmap ? await db.prepare('SELECT id,title,rationale,due_date,priority,owner_type,status,completion_rule FROM roadmap_actions WHERE roadmap_id=? ORDER BY due_date ASC').bind(roadmap.id).all<Action>() : { results: [] };

  return <MemberShell name={`${member.first_name} ${member.last_name}`} active="/roadmap">
    <div className="page-heading"><p>برنامه شخصی من</p><h1>برنامه سلامت ۱۲ ماهه</h1></div>
    {!roadmap ? <div className="page-empty compact"><h2>برنامه شما هنوز منتشر نشده است</h2><p>پس از آماده‌شدن جمع‌بندی سلامت، برنامه شخصی اینجا نمایش داده می‌شود.</p><Link className="primary-button" href="/health-picture">مشاهده تصویر سلامت</Link></div> : <>
      <section className="roadmap-section aligned"><div><p>نسخه {roadmap.version.toLocaleString('fa-IR')} · شروع {roadmap.start_date}</p><h2>{actions.results.length.toLocaleString('fa-IR')} اقدام برنامه‌ریزی‌شده</h2></div><div className="member-action-list">{actions.results.map((action, index) => <article key={action.id}><b>{String(index + 1).padStart(2, '0')}</b><div><span>{action.priority === 'high' ? 'اولویت بالا' : action.priority === 'low' ? 'اولویت کم' : 'اولویت معمول'} · مسئول: {action.owner_type === 'member' ? 'شما' : 'تیم همیار'}</span><h3>{action.title}</h3><p>{action.rationale}</p><small>موعد: {action.due_date} · معیار تکمیل: {action.completion_rule}</small></div><div className="action-state"><em>{action.status === 'pending' ? 'در انتظار' : 'انجام‌شده'}</em><ActionUpdateForm id={action.id} status={action.status} /><Link href={`/appointments?action=${action.id}`}>رزرو خدمت</Link></div></article>)}</div></section>
      <div className="next-step-panel"><b>شیوه اجرای برنامه</b><span>مستقل ادامه دهید یا خدمات همراهی را فعال کنید.</span><Link className="primary-button" href="/execution">انتخاب شیوه اجرا</Link></div>
    </>}
  </MemberShell>;
}
