import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../db';
import { getMemberByAuthUser } from '../../lib/member';
import { isOpenTestMode } from '../../lib/test-mode';
import MemberShell from '../components/member-shell';
import AssistanceForm from './assistance-form';

export const dynamic = 'force-dynamic';
type Plan = { id: string; title: string; duration_months: number };
type Sub = { duration_months: number; status: string; starts_on: string; ends_on: string };

export default async function AssistancePage() {
  const user = await requireAuthenticatedUser('/assistance');
  await ensureMvpSchema();
  const member = await getMemberByAuthUser(user.userId);
  if (!member) redirect('/start');
  const db = getD1();
  const pref = await db.prepare('SELECT mode FROM execution_preferences WHERE member_id=? LIMIT 1').bind(member.id).first<{ mode: string }>();
  const plans = await db.prepare('SELECT id,title,duration_months FROM assistance_plans WHERE is_active=1 ORDER BY duration_months').all<Plan>();
  const subscription = await db.prepare("SELECT duration_months,status,starts_on,ends_on FROM subscriptions WHERE member_id=? AND status='active_test' ORDER BY created_at DESC LIMIT 1").bind(member.id).first<Sub>();

  return <MemberShell name={`${member.first_name} ${member.last_name}`} active="/assistance">
    <div className="page-heading"><p>خدمات همراهی</p><h1>{subscription ? 'همراهی شما فعال است' : pref?.mode === 'self' ? 'اجرای مستقل انتخاب شده است' : 'مدت همراهی را انتخاب کنید'}</h1></div>
    {!pref && !isOpenTestMode
      ? <div className="page-empty compact"><h2>ابتدا شیوه اجرای مسیر را انتخاب کنید</h2><Link className="primary-button" href="/execution">انتخاب شیوه اجرا</Link></div>
      : pref?.mode === 'self'
        ? <section className="active-sub"><b>بدون اشتراک همراهی</b><span>مسیر همراهی و ابزارهای پایه برای شما فعال است.</span><p>می‌توانید هر زمان شیوه اجرا را تغییر دهید.</p><Link className="primary-button" href="/dashboard">ورود به خانه سلامت</Link></section>
        : subscription
          ? <section className="active-sub"><b>{subscription.duration_months} ماه همراهی فعال</b><span>{subscription.starts_on} تا {subscription.ends_on}</span><p>پیگیری نوبت‌ها و اقدام‌های برنامه در پنل شما انجام می‌شود.</p><Link className="primary-button" href="/dashboard">ورود به خانه سلامت</Link></section>
          : <AssistanceForm plans={plans.results} />}
  </MemberShell>;
}
