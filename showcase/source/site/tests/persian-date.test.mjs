import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('.test-build', { recursive: true });
await build({ entryPoints: ['lib/persian-date.ts'], outfile: '.test-build/persian-date.mjs', bundle: true, platform: 'node', format: 'esm' });
const { isoToPersian, persianToIso, parsePersianInput, toPersianInput, formatPersianDate, persianMonthLength, persianWeekdayOffset, shiftIsoDay } = await import('../.test-build/persian-date.mjs');

test('Nowruz and leap Esfand convert without a day shift', () => {
  for (const [jalali, iso] of [
    ['1399/01/01', '2020-03-20'], ['1399/12/30', '2021-03-20'],
    ['1400/01/01', '2021-03-21'], ['1403/12/30', '2025-03-20'],
    ['1404/01/01', '2025-03-21'], ['1405/01/01', '2026-03-21'],
    ['1370/01/01', '1991-03-21'], ['1405/07/14', '2026-10-06'],
  ]) assert.equal(parsePersianInput(jalali), iso, jalali);
  assert.equal(persianMonthLength(1399, 12), 30);
  assert.equal(persianMonthLength(1400, 12), 29);
  assert.equal(persianMonthLength(1405, 6), 31);
  assert.equal(persianMonthLength(1405, 7), 30);
});

test('Manual input accepts Persian, Arabic and Latin digits and normalizes output', () => {
  for (const input of ['۱۳۷۰/۰۱/۰۱', '١٣٧٠/٠١/٠١', '1370/01/01', ' ۱۳۷۰/۱/۱ ']) assert.equal(parsePersianInput(input), '1991-03-21');
  assert.equal(toPersianInput('1991-03-21'), '۱۳۷۰/۰۱/۰۱');
  assert.equal(formatPersianDate('1991-03-21'), '۱ فروردین ۱۳۷۰');
});

test('Invalid dates are rejected instead of rolling into another month', () => {
  for (const input of ['', '1400/12/30', '1403/12/31', '1405/07/31', '1405/00/10', '1405/13/01', '1405/01/00', '1405/01/32', '1405-01-01', '2026-10-06', '14/1/1', '0000/01/01', '3178/01/01', '1405/1/1 extra']) assert.equal(parsePersianInput(input), null, input);
  for (const iso of ['2026-02-29', '2024-02-30', '2026-13-01', '2026-00-01', '2026-01-00', '2026-01-32', '2026-1-1', 'invalid']) {
    assert.equal(isoToPersian(iso), null, iso);
    assert.equal(toPersianInput(iso), '');
  }
  assert.equal(persianToIso({ year: 1405, month: 1.5, day: 1 }), null);
  assert.equal(persianToIso({ year: Number.NaN, month: 1, day: 1 }), null);
});

test('Every day in the supported UI range round-trips, including Gregorian leap years', () => {
  for (let iso = '1900-01-01'; iso <= '2100-12-31'; iso = shiftIsoDay(iso, 1)) {
    assert.equal(persianToIso(isoToPersian(iso)), iso, iso);
    assert.equal(parsePersianInput(toPersianInput(iso)), iso, iso);
  }
});

test('Week columns start on Saturday and date arithmetic crosses month/year boundaries', () => {
  assert.equal(persianWeekdayOffset('2026-10-03'), 0);
  assert.equal(persianWeekdayOffset('2026-10-09'), 6);
  assert.equal(shiftIsoDay('2026-03-20', 1), '2026-03-21');
  assert.equal(shiftIsoDay('2024-03-01', -1), '2024-02-29');
  assert.equal(shiftIsoDay('2025-12-31', 1), '2026-01-01');
});
