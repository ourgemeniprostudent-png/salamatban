import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../../db';

type OnboardingBody = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  city?: string;
  goal?: string;
  insuranceStatus?: string;
  serviceConsent?: boolean;
  privacyConsent?: boolean;
  clinicalConsent?: boolean;
  bookingConsent?: boolean;
};

const clean = (value: unknown, max = 100) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function isAdult(dateValue: string): boolean {
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  const month = today.getUTCMonth() - date.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < date.getUTCDate())) age -= 1;
  return age >= 18 && age < 120;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  await ensureMvpSchema();
  const member = await getD1().prepare('SELECT id, first_name, last_name, phone, birth_date, city, onboarding_status FROM members WHERE auth_user_id = ? LIMIT 1').bind(user.userId).first();
  return NextResponse.json({ member });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });

  let body: OnboardingBody;
  try { body = await request.json() as OnboardingBody; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  const firstName = clean(body.firstName, 60);
  const lastName = clean(body.lastName, 80);
  const phone = clean(body.phone, 20).replace(/[\s-]/g, '');
  const birthDate = clean(body.birthDate, 10);
  const city = clean(body.city, 80);
  const goal = clean(body.goal, 40);
  const insuranceStatus = clean(body.insuranceStatus, 40);
  if (!firstName || !lastName || !/^\+?\d{10,15}$/.test(phone) || !isAdult(birthDate) || !city || !['general','prevention','concern','lifestyle'].includes(goal) || !['none','basic','basic_plus'].includes(insuranceStatus)) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 422 });
  }
  if (!body.serviceConsent || !body.privacyConsent || !body.clinicalConsent || !body.bookingConsent) {
    return NextResponse.json({ error: 'CONSENT_REQUIRED' }, { status: 422 });
  }

  await ensureMvpSchema();
  const db = getD1();
  const now = Date.now();
  const existing = await db.prepare('SELECT id FROM members WHERE auth_user_id = ? LIMIT 1').bind(user.userId).first<{ id: string }>();
  const memberId = existing?.id ?? crypto.randomUUID();
  const serviceDefinitionId = 'service-pilot-v1.0';
  const privacyDefinitionId = 'privacy-pilot-v1.0';
  const clinicalDefinitionId = 'clinical-review-pilot-v1.0';
  const bookingDefinitionId = 'booking-coordination-pilot-v1.0';

  await db.batch([
    db.prepare(`INSERT INTO members (id, auth_user_id, email, phone, first_name, last_name, birth_date, city, onboarding_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'profile_complete', ?, ?)
      ON CONFLICT(auth_user_id) DO UPDATE SET email=excluded.email, phone=excluded.phone, first_name=excluded.first_name, last_name=excluded.last_name, birth_date=excluded.birth_date, city=excluded.city, onboarding_status='profile_complete', updated_at=excluded.updated_at`)
      .bind(memberId, user.userId, user.email, phone, firstName, lastName, birthDate, city, now, now),
    db.prepare(`INSERT OR IGNORE INTO consent_definitions (id, consent_type, version, title, body_hash, is_active, created_at) VALUES (?, 'service', 'pilot-v1.0', 'شرایط استفاده پایلوت', 'PILOT_V1_SERVICE_APPROVED', 1, ?)`)
      .bind(serviceDefinitionId, now),
    db.prepare(`INSERT OR IGNORE INTO consent_definitions (id, consent_type, version, title, body_hash, is_active, created_at) VALUES (?, 'privacy', 'pilot-v1.0', 'رضایت حریم خصوصی پایلوت', 'PILOT_V1_PRIVACY_APPROVED', 1, ?)`)
      .bind(privacyDefinitionId, now),
    db.prepare(`INSERT OR IGNORE INTO consent_definitions (id, consent_type, version, title, body_hash, is_active, created_at) VALUES (?, 'clinical_review', 'pilot-v1.0', 'مرور انسانی اطلاعات سلامت', 'PILOT_V1_CLINICAL_APPROVED', 1, ?)`)
      .bind(clinicalDefinitionId, now),
    db.prepare(`INSERT OR IGNORE INTO consent_definitions (id, consent_type, version, title, body_hash, is_active, created_at) VALUES (?, 'booking_coordination', 'pilot-v1.0', 'هماهنگی با ارائه‌دهنده خدمت', 'PILOT_V1_BOOKING_APPROVED', 1, ?)`)
      .bind(bookingDefinitionId, now),
    db.prepare(`INSERT INTO user_consents (id, member_id, definition_id, granted_at, source)
      SELECT ?, ?, ?, ?, 'member_web' WHERE NOT EXISTS (SELECT 1 FROM user_consents WHERE member_id=? AND definition_id=? AND revoked_at IS NULL)`)
      .bind(crypto.randomUUID(), memberId, serviceDefinitionId, now, memberId, serviceDefinitionId),
    db.prepare(`INSERT INTO user_consents (id, member_id, definition_id, granted_at, source)
      SELECT ?, ?, ?, ?, 'member_web' WHERE NOT EXISTS (SELECT 1 FROM user_consents WHERE member_id=? AND definition_id=? AND revoked_at IS NULL)`)
      .bind(crypto.randomUUID(), memberId, privacyDefinitionId, now, memberId, privacyDefinitionId),
    db.prepare(`INSERT INTO user_consents (id, member_id, definition_id, granted_at, source)
      SELECT ?, ?, ?, ?, 'member_web' WHERE NOT EXISTS (SELECT 1 FROM user_consents WHERE member_id=? AND definition_id=? AND revoked_at IS NULL)`)
      .bind(crypto.randomUUID(), memberId, clinicalDefinitionId, now, memberId, clinicalDefinitionId),
    db.prepare(`INSERT INTO user_consents (id, member_id, definition_id, granted_at, source)
      SELECT ?, ?, ?, ?, 'member_web' WHERE NOT EXISTS (SELECT 1 FROM user_consents WHERE member_id=? AND definition_id=? AND revoked_at IS NULL)`)
      .bind(crypto.randomUUID(), memberId, bookingDefinitionId, now, memberId, bookingDefinitionId),
    db.prepare(`INSERT INTO member_journey_profiles (id,member_id,primary_goal,insurance_status,booking_consent,updated_at)
      VALUES (?,?,?,?,1,?) ON CONFLICT(member_id) DO UPDATE SET primary_goal=excluded.primary_goal,insurance_status=excluded.insurance_status,booking_consent=1,updated_at=excluded.updated_at`)
      .bind(crypto.randomUUID(), memberId, goal, insuranceStatus, now),
    db.prepare(`INSERT INTO audit_events (id, actor_id, subject_id, action, resource_type, resource_id, purpose, outcome, created_at) VALUES (?, ?, ?, 'onboarding.profile_saved', 'member', ?, 'service_delivery', 'success', ?)`)
      .bind(crypto.randomUUID(), user.userId, memberId, memberId, now),
  ]);

  return NextResponse.json({ ok: true, memberId, next: '/dashboard' });
}
