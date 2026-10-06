import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ensureMvpSchema, getD1 } from '../../../../db';
import { getClinicalReviewer } from '../../../../lib/clinical-access';
import AdminShell from '../../../components/admin-shell';
import PublishForm from './publish-form';

export const dynamic = 'force-dynamic';

export default async function HealthPictureDetail({ params }: { params: Promise<{ id: string }> }) {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) redirect('/signin-with-chatgpt?return_to=%2Fclinical%2Fhealth-pictures');
  const { id } = await params;
  await ensureMvpSchema();
  const picture = await getD1().prepare(`SELECT hp.id,hp.summary,hp.recommendations,hp.medication_plan,hp.follow_up_plan,hp.version,hp.status,m.first_name,m.last_name FROM health_pictures hp JOIN members m ON m.id=hp.member_id WHERE hp.id=? LIMIT 1`).bind(id).first<{ id: string; summary: string; recommendations: string | null; medication_plan: string | null; follow_up_plan: string | null; version: number; status: string; first_name: string; last_name: string }>();
  if (!picture) notFound();

  return <AdminShell active="/clinical/health-pictures"><main className="picture-editor embedded-admin">
    <header><Link href="/clinical/health-pictures">← بازگشت به پیش‌نویس‌ها</Link><span className="priority">نسخه {picture.version.toLocaleString('fa-IR')} · {picture.status === 'draft' ? 'پیش‌نویس' : 'منتشرشده'}</span></header>
    <section><p>تصویر سلامت {picture.first_name} {picture.last_name}</p><h1>جمع‌بندی انسانی و برنامه سلامت</h1></section>
    <section className="clinical-plan-preview"><article><span>توصیه‌های پزشک</span><p>{picture.recommendations || 'ثبت نشده'}</p></article><article><span>داروها و تغییرات</span><p>{picture.medication_plan || 'بدون تغییر دارویی ثبت‌شده'}</p></article><article><span>برنامه پیگیری</span><p>{picture.follow_up_plan || 'ثبت نشده'}</p></article></section>
    {picture.status === 'draft' ? <PublishForm pictureId={picture.id} initialSummary={picture.summary} /> : <div className="admin-empty-state"><b>این نسخه منتشر شده است</b><span>برای اصلاح بالینی، نسخه جدید ایجاد کنید.</span></div>}
  </main></AdminShell>;
}
