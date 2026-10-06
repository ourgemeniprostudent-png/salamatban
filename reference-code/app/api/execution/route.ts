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

  let body: { mode?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const mode = cleanText(body.mode, 20);
  if (!['self', 'active'].includes(mode)) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 422 });

  if (!isOpenTestMode) {
    const roadmap = await getD1().prepare("SELECT id FROM roadmaps WHERE member_id=? AND status='active' LIMIT 1").bind(member.id).first();
    if (!roadmap) return NextResponse.json({ error: 'ROADMAP_REQUIRED' }, { status: 409 });
  }

  const now = Date.now();
  await getD1().batch([
    getD1().prepare(`INSERT INTO execution_preferences (id,member_id,mode,updated_at) VALUES (?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET mode=excluded.mode,updated_at=excluded.updated_at`).bind(crypto.randomUUID(), member.id, mode, now),
    getD1().prepare("INSERT INTO audit_events (id,actor_id,subject_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,?,'execution.mode_selected','execution_preference',?,'care_planning',?,?)").bind(crypto.randomUUID(), user.userId, member.id, member.id, mode, now),
  ]);
  return NextResponse.json({ ok: true, mode, next: mode === 'active' ? '/assistance' : '/dashboard' });
}
