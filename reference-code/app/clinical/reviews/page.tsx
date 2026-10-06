import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ensureMvpSchema, getD1 } from '../../../db';
import { getClinicalReviewer } from '../../../lib/clinical-access';
import AdminShell from '../../components/admin-shell';

export const dynamic = 'force-dynamic';
type ReviewRow = { id: string; priority: string; created_at: number; first_name: string; last_name: string; city: string; response_status: string; red_flag_count: number };

export default async function ClinicalReviewsPage() {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) redirect('/signin-with-chatgpt?return_to=%2Fclinical%2Freviews');
  await ensureMvpSchema();
  const rows = await getD1().prepare(`SELECT cr.id,cr.priority,cr.created_at,m.first_name,m.last_name,m.city,qr.status AS response_status,qr.red_flag_count FROM clinical_reviews cr JOIN members m ON m.id=cr.member_id JOIN questionnaire_responses qr ON qr.id=cr.response_id WHERE cr.status='pending' ORDER BY CASE cr.priority WHEN 'urgent' THEN 0 ELSE 1 END,cr.created_at ASC LIMIT 50`).all<ReviewRow>();
  const urgent = rows.results.filter((row) => row.priority === 'urgent').length;

  return <AdminShell active="/clinical/reviews">
    <div className="admin-page-head"><div><p>تیم بالینی</p><h1>صف بررسی پرونده‌ها</h1></div><div className="head-summary"><b>{rows.results.length.toLocaleString('fa-IR')}</b><span>در انتظار</span>{urgent > 0 && <em>{urgent.toLocaleString('fa-IR')} فوری</em>}</div></div>
    <section className="admin-table-card">
      <div className="admin-table-head"><span>عضو</span><span>اولویت</span><span>شهر</span><span>زمان ورود</span><span /></div>
      {rows.results.length === 0 ? <div className="admin-empty-state"><b>صف بررسی خالی است</b><span>پرونده جدید پس از ارسال عضو اینجا قرار می‌گیرد.</span></div> : rows.results.map((row) => <Link href={`/clinical/reviews/${row.id}`} className="admin-table-row" key={row.id}>
        <span className="member-cell"><i>{row.first_name[0]}{row.last_name[0]}</i><b>{row.first_name} {row.last_name}</b></span>
        <span><em className={row.priority === 'urgent' ? 'priority urgent' : 'priority'}>{row.priority === 'urgent' ? 'فوری' : 'عادی'}</em></span>
        <span>{row.city}</span><span>{new Date(row.created_at).toLocaleString('fa-IR')}</span><b className="row-action">مشاهده پرونده ←</b>
      </Link>)}
    </section>
  </AdminShell>;
}
