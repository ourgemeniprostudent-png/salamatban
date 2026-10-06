import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../../db';
import { assessmentDefinition, redFlagQuestionIds, type AssessmentQuestion } from '../../../lib/assessment-definition';

type AnswerMap = Record<string, string | string[]>;

function normalizeAnswers(value: unknown): AnswerMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result: AnswerMap = {};
  for (const question of assessmentDefinition.questions as readonly AssessmentQuestion[]) {
    const answer = input[question.id];
    if (question.type === 'multi') {
      if (!Array.isArray(answer) || answer.some((item) => typeof item !== 'string')) {
        if (question.required) return null;
        result[question.id] = [];
      } else {
        const allowed = new Set(question.options?.map((option) => option.value));
        const values = answer.filter((item): item is string => typeof item === 'string' && allowed.has(item)).slice(0, 12);
        if (question.required && values.length === 0) return null;
        result[question.id] = values;
      }
    } else if (question.type === 'text') {
      if (answer == null || answer === '') result[question.id] = '';
      else if (typeof answer === 'string') result[question.id] = answer.trim().slice(0, 1000);
      else return null;
    } else {
      if (typeof answer !== 'string') return null;
      const allowed = question.type === 'yes_no' ? new Set(['yes', 'no']) : new Set(question.options?.map((option) => option.value));
      if (!allowed.has(answer)) return null;
      result[question.id] = answer;
    }
  }
  return result;
}

async function getMember(authUserId: string) {
  return getD1().prepare('SELECT id FROM members WHERE auth_user_id=? LIMIT 1').bind(authUserId).first<{ id: string }>();
}

async function ensureDefinition() {
  await getD1().prepare(`INSERT OR IGNORE INTO questionnaire_definitions
    (id, version, title, source, approved_by, approved_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`)
    .bind(assessmentDefinition.id, assessmentDefinition.version, assessmentDefinition.title, assessmentDefinition.source, assessmentDefinition.approvedBy, assessmentDefinition.approvedAt).run();
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  await ensureMvpSchema();
  await ensureDefinition();
  const member = await getMember(user.userId);
  if (!member) return NextResponse.json({ error: 'ONBOARDING_REQUIRED' }, { status: 409 });
  const response = await getD1().prepare(`SELECT id, status, red_flag_count, submitted_at, updated_at
    FROM questionnaire_responses WHERE member_id=? AND definition_id=? LIMIT 1`).bind(member.id, assessmentDefinition.id).first();
  const workflow = response && typeof response.id === 'string'
    ? await getD1().prepare(`SELECT
        (SELECT status FROM clinical_reviews WHERE response_id=? ORDER BY created_at DESC LIMIT 1) AS review_status,
        (SELECT COUNT(*) FROM care_tasks WHERE response_id=? AND status='open') AS open_task_count`)
      .bind(response.id, response.id).first()
    : null;
  return NextResponse.json({ definition: assessmentDefinition, response, workflow });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  let payload: { answers?: unknown };
  try { payload = await request.json() as { answers?: unknown }; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const answers = normalizeAnswers(payload.answers);
  if (!answers) return NextResponse.json({ error: 'INVALID_OR_INCOMPLETE_ANSWERS' }, { status: 422 });

  await ensureMvpSchema();
  await ensureDefinition();
  const member = await getMember(user.userId);
  if (!member) return NextResponse.json({ error: 'ONBOARDING_REQUIRED' }, { status: 409 });

  const db = getD1();
  const now = Date.now();
  const existing = await db.prepare('SELECT id FROM questionnaire_responses WHERE member_id=? AND definition_id=? LIMIT 1').bind(member.id, assessmentDefinition.id).first<{ id: string }>();
  const responseId = existing?.id ?? crypto.randomUUID();
  const redFlagCount = [...redFlagQuestionIds].filter((id) => answers[id] === 'yes').length;
  const status = redFlagCount > 0 ? 'urgent_escalation' : 'intake_complete';

  const statements = [
    db.prepare(`INSERT INTO questionnaire_responses (id, member_id, definition_id, status, red_flag_count, submitted_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id, definition_id) DO UPDATE SET status=excluded.status, red_flag_count=excluded.red_flag_count, submitted_at=excluded.submitted_at, updated_at=excluded.updated_at`)
      .bind(responseId, member.id, assessmentDefinition.id, status, redFlagCount, now, now, now),
    db.prepare('DELETE FROM questionnaire_answers WHERE response_id=?').bind(responseId),
    db.prepare("DELETE FROM care_tasks WHERE response_id=? AND status='open'").bind(responseId),
    db.prepare("DELETE FROM clinical_reviews WHERE response_id=? AND status='pending'").bind(responseId),
  ];

  for (const question of assessmentDefinition.questions as readonly AssessmentQuestion[]) {
    statements.push(db.prepare(`INSERT INTO questionnaire_answers (id, response_id, question_id, answer_value, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), responseId, question.id, JSON.stringify(answers[question.id]), now));
  }
  if (redFlagCount > 0) statements.push(
    db.prepare(`INSERT INTO clinical_reviews (id, member_id,response_id,status,priority,created_at) VALUES (?,?,?,'pending','urgent',?)`).bind(crypto.randomUUID(),member.id,responseId,now),
    db.prepare(`INSERT INTO care_tasks (id,member_id,response_id,task_type,priority,status,title,due_at,created_at) VALUES (?,?,?,'urgent_contact','urgent','open','تماس فوری و بستن حلقه ارجاع',?,?)`).bind(crypto.randomUUID(),member.id,responseId,now,now)
  );
  statements.push(
    db.prepare(`INSERT INTO audit_events (id, actor_id, subject_id, action, resource_type, resource_id, purpose, outcome, created_at)
      VALUES (?, ?, ?, 'assessment.submitted', 'questionnaire_response', ?, 'clinical_intake', ?, ?)`)
      .bind(crypto.randomUUID(), user.userId, member.id, responseId, status, now),
  );
  await db.batch(statements);

  return NextResponse.json({
    ok: true,
    responseId,
    status,
    urgent: redFlagCount > 0,
    message: redFlagCount > 0
      ? 'این پاسخ‌ها نیازمند ارزیابی فوری هستند. منتظر نتیجه آنلاین نمانید و اکنون با خدمات اورژانس محلی یا نزدیک‌ترین مرکز اورژانس تماس بگیرید.'
      : 'ارزیابی پایه ثبت شد. پس از انتخاب بسته، رزرو خدمت و ثبت نتیجه، پرونده برای بررسی انسانی ارسال می‌شود.',
  });
}
