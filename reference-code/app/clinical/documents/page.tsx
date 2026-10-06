import { redirect } from 'next/navigation';
import { ensureMvpSchema, getD1 } from '../../../db';
import { getClinicalReviewer } from '../../../lib/clinical-access';
import AdminShell from '../../components/admin-shell';
import ReviewDocumentForm from './review-document-form';

export const dynamic = 'force-dynamic';
type Doc = { id: string; original_name: string; content_type: string; byte_size: number; created_at: number; first_name: string; last_name: string };

export default async function ClinicalDocumentsPage() {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) redirect('/signin-with-chatgpt?return_to=%2Fclinical%2Fdocuments');
  await ensureMvpSchema();
  const docs = await getD1().prepare(`SELECT d.id,d.original_name,d.content_type,d.byte_size,d.created_at,m.first_name,m.last_name FROM medical_documents d JOIN members m ON m.id=d.member_id WHERE d.status='quarantined' ORDER BY d.created_at ASC`).all<Doc>();

  return <AdminShell active="/clinical/documents">
    <div className="admin-page-head"><div><p>مدیریت مدارک</p><h1>مدارک ورودی</h1></div><div className="head-summary"><b>{docs.results.length.toLocaleString('fa-IR')}</b><span>نیازمند بررسی</span></div></div>
    <section className="document-review-list admin-document-list">{docs.results.length === 0 ? <div className="admin-empty-state"><b>مدرکی برای بررسی نیست</b><span>فایل‌های جدید اعضا در این بخش نمایش داده می‌شوند.</span></div> : docs.results.map((doc) => <article key={doc.id}><div className="document-owner"><i>PDF</i><span><small>{doc.first_name} {doc.last_name}</small><b>{doc.original_name}</b><em>{Math.ceil(doc.byte_size / 1024).toLocaleString('fa-IR')} کیلوبایت · {new Date(doc.created_at).toLocaleDateString('fa-IR')}</em></span></div><ReviewDocumentForm id={doc.id} /></article>)}</section>
  </AdminShell>;
}
