import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../db';
import { getMemberByAuthUser } from '../../lib/member';
import { isOpenTestMode } from '../../lib/test-mode';
import MemberShell from '../components/member-shell';
import CheckupForm from './checkup-form';

export const dynamic = 'force-dynamic';

export default async function CheckupPage() {
  const user = await requireAuthenticatedUser('/checkup');
  await ensureMvpSchema();
  const member = await getMemberByAuthUser(user.userId);
  if (!member) redirect('/start');
  const db = getD1();
  const [assessment, order, profile] = await Promise.all([
    db.prepare('SELECT id FROM questionnaire_responses WHERE member_id=? LIMIT 1').bind(member.id).first(),
    db.prepare("SELECT test_reference FROM checkup_orders WHERE member_id=? AND status='paid_test' ORDER BY created_at DESC LIMIT 1").bind(member.id).first<{ test_reference: string }>(),
    db.prepare('SELECT primary_goal,insurance_status FROM member_journey_profiles WHERE member_id=? LIMIT 1').bind(member.id).first<{ primary_goal: string; insurance_status: string }>(),
  ]);

  return <MemberShell name={`${member.first_name} ${member.last_name}`} active="/checkup">
    <div className="page-heading"><p>مرحله ۳ · بسته ارزیابی</p><h1>{order ? 'بسته ارزیابی فعال است' : 'نقطه شروع شما را مشخص کنیم'}</h1><span>محدوده نهایی فقط پس از دریافت نتایج و مرور انسانی منتشر می‌شود.</span></div>
    {!assessment && !isOpenTestMode
      ? <div className="page-empty compact"><h2>ابتدا ارزیابی پایه را کامل کنید</h2><p>پرسش‌های ایمنی و سابقه، ورودی انتخاب بسته هستند.</p><a className="primary-button" href="/assessment">شروع ارزیابی پایه</a></div>
      : order
        ? <section className="success-panel"><b>بسته ارزیابی فعال است</b><span>{order.test_reference}</span><p>گام بعد، انتخاب مرکز و زمان مراجعه است.</p><a className="primary-button" href="/appointments">انتخاب مرکز</a></section>
        : <CheckupForm initialGoal={profile?.primary_goal} initialInsurance={profile?.insurance_status} />}
  </MemberShell>;
}
