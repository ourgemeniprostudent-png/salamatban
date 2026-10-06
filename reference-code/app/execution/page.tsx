import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../db';
import { getMemberByAuthUser } from '../../lib/member';
import { isOpenTestMode } from '../../lib/test-mode';
import MemberShell from '../components/member-shell';
import ExecutionForm from './execution-form';

export const dynamic = 'force-dynamic';

export default async function ExecutionPage() {
  const user = await requireAuthenticatedUser('/execution');
  await ensureMvpSchema();
  const member = await getMemberByAuthUser(user.userId);
  if (!member) redirect('/start');
  const roadmap = await getD1().prepare("SELECT id FROM roadmaps WHERE member_id=? AND status='active' LIMIT 1").bind(member.id).first();
  const pref = await getD1().prepare('SELECT mode FROM execution_preferences WHERE member_id=? LIMIT 1').bind(member.id).first<{ mode: string }>();

  return <MemberShell name={`${member.first_name} ${member.last_name}`} active="/execution">
    <div className="page-heading"><p>مرحله ۹ · انتخاب همراهی</p><h1>می‌خواهید مسیر را چگونه اجرا کنید؟</h1><span>مسیر همراهی در هر دو حالت برای شما باقی می‌ماند.</span></div>
    {roadmap || isOpenTestMode
      ? <ExecutionForm initial={pref?.mode ?? null} />
      : <div className="page-empty compact"><h2>مسیر همراهی هنوز آماده نیست</h2><p>این انتخاب پس از انتشار برنامه ۱۲ماهه فعال می‌شود.</p><a className="primary-button" href="/roadmap">مشاهده وضعیت مسیر همراهی</a></div>}
  </MemberShell>;
}
