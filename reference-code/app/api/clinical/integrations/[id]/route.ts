import { NextResponse } from 'next/server';
import { ensureMvpSchema, getD1 } from '../../../../../db';
import { getClinicalReviewer } from '../../../../../lib/clinical-access';
import { cleanText } from '../../../../../lib/member';

function safeUrl(value: unknown) {
  const text = cleanText(value, 500);
  if (!text) return '';
  try { const url = new URL(text); return ['https:', 'http:'].includes(url.protocol) ? url.toString() : ''; }
  catch { return ''; }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const reviewer = await getClinicalReviewer();
  if (!reviewer) return NextResponse.json({ error: 'CLINICAL_ACCESS_REQUIRED' }, { status: 403 });
  await ensureMvpSchema();
  const { id } = await context.params;
  let body: { apiBaseUrl?: unknown; bookingUrl?: unknown; credentialEnvKey?: unknown; mode?: unknown; status?: unknown; enabled?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  const apiBaseUrl = safeUrl(body.apiBaseUrl);
  const bookingUrl = safeUrl(body.bookingUrl);
  const credentialEnvKey = cleanText(body.credentialEnvKey, 100);
  const mode = cleanText(body.mode, 10);
  const status = cleanText(body.status, 10);
  const enabled = body.enabled === true;
  if (!['test', 'live'].includes(mode) || !['draft', 'blocked', 'ready'].includes(status) || (credentialEnvKey && !/^[A-Z][A-Z0-9_]*$/.test(credentialEnvKey))) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 422 });
  }
  if (mode === 'live' && status === 'ready' && (!apiBaseUrl || !bookingUrl || !credentialEnvKey)) {
    return NextResponse.json({ error: 'LIVE_REQUIRES_READY_CONFIG' }, { status: 422 });
  }
  if (enabled && status !== 'ready') return NextResponse.json({ error: 'INTEGRATION_NOT_READY' }, { status: 422 });

  const db = getD1();
  const integration = await db.prepare("SELECT provider_key FROM provider_integrations WHERE id=? AND provider_key!='local_test'").bind(id).first<{ provider_key: string }>();
  if (!integration) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  const now = Date.now();
  await db.batch([
    db.prepare(`UPDATE provider_integrations SET api_base_url=?,booking_url=?,credential_env_key=?,mode=?,status=?,is_enabled=?,updated_by=?,updated_at=? WHERE id=?`)
      .bind(apiBaseUrl || null, bookingUrl || null, credentialEnvKey || null, mode, status, enabled ? 1 : 0, reviewer.userId, now, id),
    db.prepare('UPDATE providers SET is_active=? WHERE adapter=?').bind(enabled ? 1 : 0, integration.provider_key),
    db.prepare("INSERT INTO audit_events (id,actor_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,'integration.updated','provider_integration',?,'operations',?,?)")
      .bind(crypto.randomUUID(), reviewer.userId, id, enabled ? 'enabled' : 'disabled', now),
  ]);
  return NextResponse.json({ ok: true, enabled });
}
