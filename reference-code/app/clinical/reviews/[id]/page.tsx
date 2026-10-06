import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ensureMvpSchema, getD1 } from '../../../../db';
import { getClinicalReviewer } from '../../../../lib/clinical-access';
import { assessmentDefinition } from '../../../../lib/assessment-definition';
import AdminShell from '../../../components/admin-shell';
import ReviewForm from './review-form';

export const dynamic = 'force-dynamic';
type Detail = { id: string; priority: string; status: string; member_id: string; response_id: string; first_name: string; last_name: string; birth_date: string; city: string; red_flag_count: number; response_status: string };

function displayAnswer(questionId: string, value: string) {
  let parsed: string | string[];
  try { parsed = JSON.parse(value) as string | string[]; } catch { parsed = value; }
  const question = assessmentDefinition.questions.find((item) => item.id === questionId);
  if (!question) return String(parsed);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  if (question.type === 'yes_no') return values[0] === 'yes' ? 'بله' : 'خیر';
  if (question.type === 'text') return values[0] || 'ثبت نشده';
  return values.map((item) => question.options?.find((option) => option.value === item)?.label ?? item).join('، ');
}

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) redirect('/signin-with-chatgpt?return_to=%2Fclinical%2Freviews');
  const { id } = await params;
  await ensureMvpSchema();
  const db = getD1();
  const detail = await db.prepare(`SELECT cr.id,cr.priority,cr.status,cr.member_id,cr.response_id,m.first_name,m.last_name,m.birth_date,m.city,qr.red_flag_count,qr.status AS response_status FROM clinical_reviews cr JOIN members m ON m.id=cr.member_id JOIN questionnaire_responses qr ON qr.id=cr.response_id WHERE cr.id=? LIMIT 1`).bind(id).first<Detail>();
  if (!detail) notFound();
  const answers = await db.prepare('SELECT question_id,answer_value FROM questionnaire_answers WHERE response_id=?').bind(detail.response_id).all<{ question_id: string; answer_value: string }>();

  return <AdminShell active="/clinical/reviews"><main className="review-detail embedded-admin">
    <header><Link href="/clinical/reviews">← بازگشت به صف</Link><span className={detail.priority === 'urgent' ? 'priority urgent' : 'priority'}>{detail.priority === 'urgent' ? 'پرونده فوری' : 'بررسی عادی'}</span></header>
    <section className="review-member"><p>پرونده عضو</p><h1>{detail.first_name} {detail.last_name}</h1><span>{detail.city} · تاریخ تولد {detail.birth_date}</span></section>
    {detail.red_flag_count > 0 && <div className="urgent-review-banner">این پرونده دارای {detail.red_flag_count.toLocaleString('fa-IR')} پاسخ هشدار است.</div>}
    <section className="answer-review">{assessmentDefinition.questions.map((question) => { const answer = answers.results.find((item) => item.question_id === question.id); return <article key={question.id}><span>{question.label}</span><strong>{answer ? displayAnswer(question.id, answer.answer_value) : 'بدون پاسخ'}</strong></article>; })}</section>
    <ReviewForm reviewId={detail.id} urgent={detail.response_status === 'urgent_escalation'} />
  </main></AdminShell>;
}
