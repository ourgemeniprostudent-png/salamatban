import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../../db';
import { cleanText, getMemberByAuthUser } from '../../../lib/member';
import { isOpenTestMode } from '../../../lib/test-mode';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  await ensureMvpSchema();
  const member = await getMemberByAuthUser(user.userId);
  if (!member) return NextResponse.json({ error: 'ONBOARDING_REQUIRED' }, { status: 409 });

  if (!isOpenTestMode) {
    const assessment = await getD1().prepare('SELECT id FROM questionnaire_responses WHERE member_id=? LIMIT 1').bind(member.id).first();
    if (!assessment) return NextResponse.json({ error: 'ASSESSMENT_REQUIRED' }, { status: 409 });
  }

  let body: { goal?: unknown; insuranceStatus?: unknown; bookingConsent?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  const goal = cleanText(body.goal, 80);
  const insurance = cleanText(body.insuranceStatus, 40);
  if (!['general', 'prevention', 'concern', 'lifestyle'].includes(goal)
    || !['none', 'basic', 'basic_plus'].includes(insurance)
    || body.bookingConsent !== true) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 422 });
  }

  const db = getD1();
  const existing = await db.prepare("SELECT id FROM checkup_orders WHERE member_id=? AND status='paid_test' LIMIT 1").bind(member.id).first<{ id: string }>();
  if (existing) return NextResponse.json({ ok: true, orderId: existing.id, replayed: true, next: '/appointments' });

  const now = Date.now();
  const orderId = crypto.randomUUID();
  const reference = `CHECKUP-TEST-${orderId.slice(0, 8)}`;
  await db.batch([
    db.prepare(`INSERT INTO member_journey_profiles (id,member_id,primary_goal,insurance_status,booking_consent,updated_at) VALUES (?,?,?,?,1,?) ON CONFLICT(member_id) DO UPDATE SET primary_goal=excluded.primary_goal,insurance_status=excluded.insurance_status,booking_consent=1,updated_at=excluded.updated_at`).bind(crypto.randomUUID(), member.id, goal, insurance, now),
    db.prepare("INSERT INTO checkup_orders (id,member_id,package_version,status,amount_rial,test_reference,created_at) VALUES (?,?,'adult-baseline-2026.1-test','paid_test',0,?,?)").bind(orderId, member.id, reference, now),
    db.prepare("INSERT INTO audit_events (id,actor_id,subject_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,?,'checkup.activated_test','checkup_order',?,'commerce_test','success',?)").bind(crypto.randomUUID(), user.userId, member.id, orderId, now),
  ]);
  return NextResponse.json({ ok: true, orderId, reference, next: '/appointments' });
}
