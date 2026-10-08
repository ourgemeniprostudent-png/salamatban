export type Role = 'member' | 'clinician' | 'coordinator' | 'admin';
export type PilotMode = 'demo' | 'live';
export type Profile = { firstName: string; lastName: string; birthDate: string; city: string; goal: string; insurance: string };
export type Answer = string | string[];
export type Action = { id: string; title: string; reason: string; due: string; owner: 'member' | 'team'; done: boolean; evidence?: string };
export type Plan = { summary: string; actions: Action[]; reviewer: string; publishedAt: number; version: number };

export const policyVersion = 'pilot-2026-10-05-draft';
export const policyText = 'در این پایلوت، مشخصات، سوابق و مدارک سلامت شما برای تشکیل پرونده، بررسی پزشک و تهیه برنامه پیگیری نگهداری می‌شود. پزشک مسئول به محتوای بالینی و کارشناس پیگیری فقط به اطلاعات لازم برای هماهنگی دسترسی دارند. استفاده از داده برای تبلیغات یا ارسال پرونده به مرکز بیرونی در این رضایت گنجانده نشده است. درخواست دریافت یا حذف اطلاعات از بخش پشتیبانی ثبت می‌شود و مطابق سیاست مصوب رسیدگی خواهد شد. این متن پیش‌نویس است و پیش از پذیرش اطلاعات واقعی باید نسخه نهایی، مسئول نگهداری و مدت نگهداری تعیین شود.';
export const clinicalConsentText = 'اجازه می‌دهم پزشک تعیین‌شدهٔ این پایلوت سوابق و مدارک من را بررسی کند و جمع‌بندی و برنامه پیگیری را در پرونده منتشر کند. سامانه خدمات اورژانس نیست و نتیجه خودکار تشخیصی صادر نمی‌کند.';
export const coordinationConsentText = 'با تماس کارشناس برای هماهنگی نوبت موافقم. ارسال اطلاعات به مرکز منتخب فقط پس از مشخص‌شدن مرکز و ثبت رضایت همان هماهنگی انجام می‌شود.';
export const sampleAccounts = [
  { phone: '09000000001', name: 'کاربر نمونه اول', role: 'member' as Role },
  { phone: '09000000002', name: 'کاربر نمونه دوم', role: 'member' as Role },
  { phone: '09000000011', name: 'پزشک نمونه', role: 'clinician' as Role },
  { phone: '09000000012', name: 'کارشناس نمونه', role: 'coordinator' as Role },
  { phone: '09000000014', name: 'پزشک نمونه دوم', role: 'clinician' as Role },
  { phone: '09000000015', name: 'کارشناس نمونه دوم', role: 'coordinator' as Role },
  { phone: '09000000013', name: 'مدیر نمونه', role: 'admin' as Role },
];

export class PilotError extends Error {
  constructor(public code: string, public status = 400, public details?: unknown) { super(code); }
}
export const text = (value: unknown, max = 1000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function asciiDigits(value: string) {
  return value.replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632));
}
export function phoneNumber(value: unknown) {
  let p = asciiDigits(text(value, 30)).replace(/[\s()-]/g, '');
  if (p.startsWith('+98')) p = '0' + p.slice(3);
  if (p.startsWith('0098')) p = '0' + p.slice(4);
  if (!/^09\d{9}$/.test(p)) throw new PilotError('INVALID_PHONE', 422);
  return p;
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function validateProfile(value: unknown): Profile {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const p: Profile = { firstName: text(v.firstName, 60), lastName: text(v.lastName, 80), birthDate: text(v.birthDate, 10), city: text(v.city, 80), goal: text(v.goal, 400), insurance: text(v.insurance, 30) };
  if (!p.firstName || !p.lastName || !p.city || !p.goal || !validDate(p.birthDate) || !['none','basic','basic_plus','unknown'].includes(p.insurance)) throw new PilotError('INVALID_PROFILE', 422);
  const now = new Date(); const d = new Date(p.birthDate + 'T00:00:00Z');
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age--;
  if (age < 18 || age > 119) throw new PilotError('ADULTS_ONLY', 422);
  return p;
}
export function money(value: unknown) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 10000 || n > 1_000_000_000) throw new PilotError('PRICE_NOT_CONFIGURED', 503);
  return n;
}
export function validateActions(value: unknown): Action[] {
  if (!Array.isArray(value) || !value.length || value.length > 12) throw new PilotError('INVALID_PLAN', 422);
  const today = new Date().toISOString().slice(0, 10);
  const latest = new Date(Date.now() + 366 * 86400000).toISOString().slice(0,10);
  return value.map(v => {
    const title = text(v?.title, 160), reason = text(v?.reason, 500), due = text(v?.due, 10);
    if (title.length < 3 || reason.length < 5 || !validDate(due) || due < today || due > latest || !['member','team'].includes(v?.owner)) throw new PilotError('INVALID_PLAN', 422);
    return { id: crypto.randomUUID(), title, reason, due, owner: v.owner, done: false };
  });
}
export function detectedType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return 'image/png';
  if (new TextDecoder().decode(bytes.slice(0,5)) === '%PDF-') return 'application/pdf';
  return null;
}
export function canReadClinical(role: Role, actorId: string, ownerId: string, assignedId: string | null) {
  return actorId === ownerId || (role === 'clinician' && assignedId === actorId);
}
export const labels: Record<string, string> = {
  draft:'در حال تکمیل', submitted:'در انتظار پزشک', needs_information:'نیاز به تکمیل', published:'برنامه آماده است',
  urgent:'نیازمند پیگیری فوری', pending:'در انتظار تأیید', paid:'پرداخت‌شده', failed:'ناموفق', cancelled:'لغوشده',
  reconciliation:'نیازمند بررسی پرداخت', requested:'درخواست ثبت شد', contacted:'در حال هماهنگی', confirmed:'نوبت تأیید شد', completed:'انجام‌شده',
  open:'باز', resolved:'رسیدگی‌شده', refund_requested:'درخواست بازپرداخت', refunded:'بازپرداخت‌شده',
};
