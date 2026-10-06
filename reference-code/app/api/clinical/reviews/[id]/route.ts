import { NextResponse } from 'next/server';
import { ensureMvpSchema, getD1 } from '../../../../../db';
import { getClinicalReviewer } from '../../../../../lib/clinical-access';

type ReviewAction = 'approve_draft' | 'request_information' | 'acknowledge_urgent';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) return NextResponse.json({ error: 'CLINICAL_ACCESS_REQUIRED' }, { status: 403 });
  const { id } = await context.params;
  let payload: { action?: ReviewAction; notes?: string; recommendations?: string; medicationPlan?: string; followUpPlan?: string; medicationConfirmed?: boolean };
  try { payload = await request.json() as typeof payload; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const notes = typeof payload.notes === 'string' ? payload.notes.trim().slice(0, 2000) : '';
  const recommendations = typeof payload.recommendations === 'string' ? payload.recommendations.trim().slice(0, 2000) : '';
  const medicationPlan = typeof payload.medicationPlan === 'string' ? payload.medicationPlan.trim().slice(0, 1500) : '';
  const followUpPlan = typeof payload.followUpPlan === 'string' ? payload.followUpPlan.trim().slice(0, 1500) : '';
  if (!payload.action || !['approve_draft','request_information','acknowledge_urgent'].includes(payload.action) || notes.length < 5 || recommendations.length < 5 || followUpPlan.length < 5 || (medicationPlan.length > 0 && !payload.medicationConfirmed)) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 422 });
  }

  await ensureMvpSchema();
  const db = getD1();
  const review = await db.prepare(`SELECT cr.id, cr.member_id, cr.response_id, cr.status, qr.status AS response_status
    FROM clinical_reviews cr JOIN questionnaire_responses qr ON qr.id=cr.response_id WHERE cr.id=? LIMIT 1`).bind(id).first<{id:string;member_id:string;response_id:string;status:string;response_status:string}>();
  if (!review) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (review.status !== 'pending') return NextResponse.json({ error: 'ALREADY_REVIEWED' }, { status: 409 });
  if (payload.action === 'approve_draft' && review.response_status === 'urgent_escalation') {
    return NextResponse.json({ error: 'URGENT_REVIEW_REQUIRES_ACKNOWLEDGEMENT' }, { status: 409 });
  }

  const now = Date.now();
  const decision = payload.action === 'approve_draft' ? 'approved_for_draft' : payload.action === 'request_information' ? 'information_requested' : 'urgent_acknowledged';
  const responseStatus = payload.action === 'approve_draft' ? 'clinically_reviewed' : payload.action === 'request_information' ? 'information_requested' : 'urgent_acknowledged';
  const statements = [
    db.prepare(`UPDATE clinical_reviews SET status='completed', decision=?, notes=?, recommendations=?, medication_plan=?, follow_up_plan=?, assigned_to=?, reviewed_at=? WHERE id=? AND status='pending'`)
      .bind(decision, notes, recommendations, medicationPlan || null, followUpPlan, reviewer.userId, now, review.id),
    db.prepare('UPDATE questionnaire_responses SET status=?, updated_at=? WHERE id=?').bind(responseStatus, now, review.response_id),
    db.prepare(`INSERT INTO audit_events (id, actor_id, subject_id, action, resource_type, resource_id, purpose, outcome, created_at)
      VALUES (?, ?, ?, 'clinical_review.completed', 'clinical_review', ?, 'clinical_review', ?, ?)`)
      .bind(crypto.randomUUID(), reviewer.userId, review.member_id, review.id, decision, now),
  ];

  if (payload.action === 'approve_draft') {
    const latest = await db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM health_pictures WHERE member_id=?').bind(review.member_id).first<{version:number}>();
    statements.push(
      db.prepare(`INSERT INTO health_pictures (id, member_id, review_id, version, status, summary, recommendations, medication_plan, follow_up_plan, approved_by, approved_at, created_at)
        VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), review.member_id, review.id, (latest?.version ?? 0) + 1, notes, recommendations, medicationPlan || null, followUpPlan, reviewer.userId, now, now),
      db.prepare("UPDATE care_tasks SET status='completed' WHERE response_id=? AND task_type='clinical_review' AND status='open'").bind(review.response_id),
    );
  } else if (payload.action === 'request_information') {
    statements.push(
      db.prepare("UPDATE care_tasks SET status='completed' WHERE response_id=? AND task_type='clinical_review' AND status='open'").bind(review.response_id),
      db.prepare(`INSERT INTO care_tasks (id, member_id, response_id, task_type, priority, status, title, due_at, created_at)
        VALUES (?, ?, ?, 'member_followup', 'normal', 'open', 'تکمیل اطلاعات درخواستی پزشک', ?, ?)`)
        .bind(crypto.randomUUID(), review.member_id, review.response_id, now + 48 * 60 * 60 * 1000, now),
    );
  }
  await db.batch(statements);
  return NextResponse.json({ ok:true, decision, responseStatus });
}
