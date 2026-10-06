import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ensureMvpSchema, getD1 } from '../../../db';
import { getClinicalReviewer } from '../../../lib/clinical-access';
import AdminShell from '../../components/admin-shell';

export const dynamic = 'force-dynamic';
type Picture = { id: string; version: number; status: string; created_at: number; first_name: string; last_name: string; city: string };

export default async function HealthPicturesPage() {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) redirect('/signin-with-chatgpt?return_to=%2Fclinical%2Fhealth-pictures');
  await ensureMvpSchema();
  const rows = await getD1().prepare(`SELECT hp.id,hp.version,hp.status,hp.created_at,m.first_name,m.last_name,m.city FROM health_pictures hp JOIN members m ON m.id=hp.member_id WHERE hp.status='draft' ORDER BY hp.created_at ASC LIMIT 50`).all<Picture>();

  return <AdminShell active="/clinical/health-pictures">
    <div className="admin-page-head"><div><p>خروجی بالینی</p><h1>تصویرهای سلامت آماده انتشار</h1></div><div className="head-summary"><b>{rows.results.length.toLocaleString('fa-IR')}</b><span>پیش‌نویس</span></div></div>
    <section className="admin-table-card">
      <div className="admin-table-head pictures"><span>عضو</span><span>نسخه</span><span>شهر</span><span>تاریخ ایجاد</span><span /></div>
      {rows.results.length === 0 ? <div className="admin-empty-state"><b>پیش‌نویسی آماده نیست</b><span>پس از تأیید بررسی بالینی، خروجی اینجا قرار می‌گیرد.</span></div> : rows.results.map((row) => <Link href={`/clinical/health-pictures/${row.id}`} className="admin-table-row pictures" key={row.id}><span className="member-cell"><i>{row.first_name[0]}{row.last_name[0]}</i><b>{row.first_name} {row.last_name}</b></span><span>نسخه {row.version.toLocaleString('fa-IR')}</span><span>{row.city}</span><span>{new Date(row.created_at).toLocaleDateString('fa-IR')}</span><b className="row-action">ویرایش و انتشار ←</b></Link>)}
    </section>
  </AdminShell>;
}
