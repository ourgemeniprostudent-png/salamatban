import { isValidJalaaliDate, jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js';

/** Dates are Gregorian ISO strings at the API boundary; only the UI uses Jalali. */
export type PersianDate = { year: number; month: number; day: number };

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
] as const;

export function persianDigits(value: string | number): string {
  return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function latinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  });
}

export function isoToPersian(iso: string): PersianDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  try {
    const { jy, jm, jd } = toJalaali(year, month, day);
    return { year: jy, month: jm, day: jd };
  } catch {
    return null;
  }
}

export function persianToIso({ year, month, day }: PersianDate): string | null {
  if (![year, month, day].every(Number.isInteger) || year < 1 || year > 3177 || !isValidJalaaliDate(year, month, day)) return null;
  const { gy, gm, gd } = toGregorian(year, month, day);
  return `${String(gy).padStart(4, '0')}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

export function persianMonthLength(year: number, month: number): number {
  return jalaaliMonthLength(year, month);
}

export function toPersianInput(iso: string): string {
  const date = isoToPersian(iso);
  if (!date) return '';
  return persianDigits(`${String(date.year).padStart(4, '0')}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`);
}

export function formatPersianDate(iso: string): string {
  const date = isoToPersian(iso);
  if (!date) return '';
  return `${persianDigits(date.day)} ${PERSIAN_MONTHS[date.month - 1]} ${persianDigits(date.year)}`;
}

export function parsePersianInput(input: string): string | null {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(latinDigits(input.trim()));
  if (!match) return null;
  return persianToIso({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) });
}

/** Saturday is the first column (0); UTC avoids browser timezone shifts. */
export function persianWeekdayOffset(iso: string): number {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 1) % 7;
}

export function shiftIsoDay(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  // This UTC day deliberately matches the server's date validation rules.
  return new Date().toISOString().slice(0, 10);
}
