import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../../db';
import { cleanText, getMemberByAuthUser } from '../../../lib/member';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  await ensureMvpSchema();
  const member = await getMemberByAuthUser(user.userId);
  if (!member) return NextResponse.json({ error: 'ONBOARDING_REQUIRED' }, { status: 409 });
  let body: { providerId?: unknown; actionId?: unknown; scheduledFor?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  const providerId = cleanText(body.providerId, 80);
  const actionId = cleanText(body.actionId, 80);
  const date = new Date(cleanText(body.scheduledFor, 30));
  if (!providerId || Number.isNaN(date.getTime()) || date.getTime() < Date.now()) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 422 });

  const db = getD1();
  const provider = await db.prepare('SELECT id,adapter FROM providers WHERE id=? AND is_active=1 LIMIT 1').bind(providerId).first<{ id: string; adapter: string }>();
  if (!provider) return NextResponse.json({ error: 'PROVIDER_NOT_FOUND' }, { status: 404 });
  if (actionId) {
    const owned = await db.prepare('SELECT ra.id FROM roadmap_actions ra JOIN roadmaps r ON r.id=ra.roadmap_id WHERE ra.id=? AND r.member_id=?').bind(actionId, member.id).first();
    if (!owned) return NextResponse.json({ error: 'ACTION_NOT_FOUND' }, { status: 404 });
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  if (provider.adapter === 'manual_crm') {
    const reference = `CRM-TEST-${id.slice(0, 8)}`;
    await db.batch([
      db.prepare("INSERT INTO appointments (id,member_id,roadmap_action_id,provider_id,scheduled_for,status,external_reference,adapter_response,created_at,updated_at) VALUES (?,?,?,?,?,'manual_pending_test',?,'crm_fallback_queued',?,?)")
        .bind(id, member.id, actionId || null, providerId, date.toISOString(), reference, now, now),
      db.prepare("INSERT INTO care_tasks (id,member_id,task_type,priority,status,title,due_at,created_at) VALUES (?,?,'booking_fallback','normal','open','هماهنگی دستی نوبت آزمایشی',?,?)")
        .bind(crypto.randomUUID(), member.id, now + 24 * 60 * 60 * 1000, now),
      db.prepare("INSERT INTO audit_events (id,actor_id,subject_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,?,'booking.fallback_queued','appointment',?,'care_coordination_test','manual_pending',?)")
        .bind(crypto.randomUUID(), user.userId, member.id, id, now),
    ]);
    return NextResponse.json({ ok: true, id, status: 'manual_pending_test', reference });
  }
  if (provider.adapter !== 'local_test') {
    const connector = await db.prepare(`SELECT booking_url,mode,status,is_enabled FROM provider_integrations WHERE provider_key=? LIMIT 1`)
      .bind(provider.adapter).first<{ booking_url: string | null; mode: string; status: string; is_enabled: number }>();
    if (!connector || !connector.is_enabled || connector.status !== 'ready') return NextResponse.json({ error: 'PROVIDER_CONNECTION_NOT_READY' }, { status: 409 });
    if (connector.mode === 'live' && !connector.booking_url) return NextResponse.json({ error: 'PROVIDER_CONNECTION_NOT_READY' }, { status: 409 });
    if (connector.mode === 'live') return NextResponse.json({ error: 'PARTNER_CONTRACT_REQUIRED' }, { status: 501 });
    const reference = `HANDOFF-TEST-${id.slice(0, 8)}`;
    const checkout = connector.booking_url ? new URL(connector.booking_url) : null;
    checkout?.searchParams.set('source', 'hamyar-salamat');
    checkout?.searchParams.set('reference', reference);
    await db.batch([
      db.prepare("INSERT INTO appointments (id,member_id,roadmap_action_id,provider_id,scheduled_for,status,external_reference,adapter_response,created_at,updated_at) VALUES (?,?,?,?,?,'handoff_test',?,'external_provider_payment_pending',?,?)")
        .bind(id, member.id, actionId || null, providerId, date.toISOString(), reference, now, now),
      db.prepare("INSERT INTO audit_events (id,actor_id,subject_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,?,'appointment.handoff_test','appointment',?,'care_coordination_test','provider_payment_pending',?)")
        .bind(crypto.randomUUID(), user.userId, member.id, id, now),
    ]);
    return NextResponse.json({ ok: true, id, status: 'handoff_test', reference, simulated: !checkout, checkoutUrl: checkout?.toString() });
  }

  const reference = `LOCAL-${id.slice(0, 8)}`;
  await db.batch([
    db.prepare("INSERT INTO appointments (id,member_id,roadmap_action_id,provider_id,scheduled_for,status,external_reference,adapter_response,created_at,updated_at) VALUES (?,?,?,?,?,'confirmed_test',?,'local_test_provider_confirmed',?,?)")
      .bind(id, member.id, actionId || null, providerId, date.toISOString(), reference, now, now),
    db.prepare("INSERT INTO audit_events (id,actor_id,subject_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,?,'appointment.confirmed_test','appointment',?,'care_coordination_test','provider_confirmed',?)")
      .bind(crypto.randomUUID(), user.userId, member.id, id, now),
  ]);
  return NextResponse.json({ ok: true, id, status: 'confirmed_test', reference });
}
