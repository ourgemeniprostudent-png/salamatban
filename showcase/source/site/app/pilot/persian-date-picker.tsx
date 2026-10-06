'use client';

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from './brand';
import { CompactSelect } from './compact-select';
import {
  PERSIAN_MONTHS, formatPersianDate, isoToPersian, parsePersianInput,
  persianDigits, persianMonthLength, persianToIso, persianWeekdayOffset,
  shiftIsoDay, todayIso, toPersianInput,
} from '../../lib/persian-date';
import './persian-date-picker.css';

type Props = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
};

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const WEEKDAY_INITIALS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function PersianDatePicker({ label, value, onChange, min = '1900-01-01', max = '2100-12-31', disabled = false }: Props) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const days = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  // The emitted ISO value identifies the draft, so parent onChange('') does
  // not erase incomplete or invalid manual input before it can be corrected.
  const [draft, setDraft] = useState<{ value: string; text: string } | null>(null);
  const lower = isoToPersian(min) ? min : '1900-01-01';
  const upper = isoToPersian(max) && max >= lower ? max : '2100-12-31';
  const clamp = (iso: string) => iso < lower ? lower : iso > upper ? upper : iso;
  const inRange = (iso: string) => iso >= lower && iso <= upper;
  const today = todayIso();
  const initial = clamp(isoToPersian(value) ? value : today);
  const [focusDate, setFocusDate] = useState(initial);
  const [view, setView] = useState(() => isoToPersian(initial)!);
  const text = draft?.value === value ? draft.text : toPersianInput(value);
  const parsed = parsePersianInput(text);
  const error = text.trim() && !parsed
    ? 'تاریخ شمسی معتبر وارد کنید؛ مانند ۱۳۷۰/۰۱/۰۱.'
    : parsed && !inRange(parsed)
      ? `تاریخ باید از ${formatPersianDate(lower)} تا ${formatPersianDate(upper)} باشد.`
      : '';
  const first = persianToIso({ ...view, day: 1 })!;
  const monthLength = persianMonthLength(view.year, view.month);
  const last = persianToIso({ ...view, day: monthLength })!;
  const offset = persianWeekdayOffset(first);
  const startYear = isoToPersian(lower)!.year;
  const endYear = isoToPersian(upper)!.year;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);

  // Moving across a month changes the button represented by each table cell.
  // Focus after the DOM commit, before the next keyboard event can reach a
  // reused cell. Waiting for animation frames lets a quick Enter select the
  // wrong day. Selector changes deliberately leave pendingFocus empty.
  useLayoutEffect(() => {
    const next = pendingFocus.current;
    pendingFocus.current = null;
    if (next && open && dialog.current?.open) days.current.get(next)?.focus();
  }, [view, focusDate, open]);

  function close() {
    dialog.current?.close();
  }

  function showCalendar() {
    const next = clamp(parsed && inRange(parsed) ? parsed : isoToPersian(value) ? value : today);
    pendingFocus.current = next;
    setView(isoToPersian(next)!);
    setFocusDate(next);
    setOpen(true);
    dialog.current?.showModal();
  }

  function select(iso: string) {
    setDraft(null);
    onChange(iso);
    close();
  }

  function updateText(next: string) {
    const result = parsePersianInput(next);
    const iso = result && inRange(result) ? result : '';
    setDraft({ value: iso, text: next });
    onChange(iso);
  }

  function move(iso: string, focus = true) {
    const next = clamp(iso);
    pendingFocus.current = focus ? next : null;
    setFocusDate(next);
    setView(isoToPersian(next)!);
  }

  function changeMonth(year: number, month: number, focus = false) {
    const yearShift = Math.floor((month - 1) / 12);
    const nextYear = year + yearShift;
    const nextMonth = ((month - 1) % 12 + 12) % 12 + 1;
    const date = isoToPersian(focusDate)!;
    const next = persianToIso({ year: nextYear, month: nextMonth, day: Math.min(date.day, persianMonthLength(nextYear, nextMonth)) });
    if (next) move(next, focus);
  }

  function onDayKey(event: KeyboardEvent<HTMLButtonElement>, iso: string) {
    const delta: Record<string, number> = { ArrowRight: -1, ArrowLeft: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in delta) {
      event.preventDefault();
      move(shiftIsoDay(iso, delta[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const column = persianWeekdayOffset(iso);
      move(shiftIsoDay(iso, event.key === 'Home' ? -column : 6 - column));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      changeMonth(view.year, view.month + (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1), true);
    }
  }

  return <div className="p-field p-date-field">
    <label htmlFor={`${id}-input`}>{label}</label>
    <div className="p-date-control">
      <input id={`${id}-input`} type="text" inputMode="text" dir="ltr" autoComplete="off"
        value={text} disabled={disabled} placeholder="۱۳۷۰/۰۱/۰۱"
        aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        onChange={event => updateText(event.currentTarget.value)}
        onBlur={() => { if (parsed && inRange(parsed)) setDraft({ value: parsed, text: toPersianInput(parsed) }); }} />
      <button ref={opener} type="button" className="p-date-open" disabled={disabled}
        aria-label={`باز کردن تقویم ${label}`} aria-haspopup="dialog" aria-expanded={open}
        aria-controls={`${id}-dialog`} onClick={showCalendar}><Icon name="calendar" size={20} /></button>
    </div>
    <small id={`${id}-hint`} className="p-date-hint">شمسی؛ سال/ماه/روز — می‌توانید از تقویم انتخاب کنید.</small>
    {error && <small id={`${id}-error`} className="p-date-error" role="status">{error}</small>}
    <dialog ref={dialog} id={`${id}-dialog`} className="p-date-dialog" dir="rtl"
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-keyboard`}
      onClose={() => { setOpen(false); opener.current?.focus(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      }}>
      <div className="p-date-heading">
        <div><small>انتخاب تاریخ شمسی</small><h2 id={`${id}-title`}>تقویم {label}</h2></div>
        <button type="button" className="p-date-close" aria-label="بستن تقویم" onClick={close}><Icon name="close" size={19} /></button>
      </div>
      <div className="p-date-navigation">
        <button type="button" className="p-date-arrow" aria-label="ماه قبل" disabled={first <= lower}
          onClick={() => changeMonth(view.year, view.month - 1)}><Icon name="chevron-right" size={21} /></button>
        <CompactSelect aria-label="ماه" value={view.month} onValueChange={value => changeMonth(view.year, Number(value))}>
          {PERSIAN_MONTHS.map((name, index) => {
            const monthStart = persianToIso({ year: view.year, month: index + 1, day: 1 })!;
            const monthEnd = persianToIso({ year: view.year, month: index + 1, day: persianMonthLength(view.year, index + 1) })!;
            return <option key={name} value={index + 1} disabled={monthEnd < lower || monthStart > upper}>{name}</option>;
          })}
        </CompactSelect>
        <CompactSelect aria-label="سال" value={view.year} onValueChange={value => changeMonth(Number(value), view.month)}>
          {years.map(year => <option key={year} value={year}>{persianDigits(year)}</option>)}
        </CompactSelect>
        <button type="button" className="p-date-arrow" aria-label="ماه بعد" disabled={last >= upper}
          onClick={() => changeMonth(view.year, view.month + 1)}><Icon name="chevron" size={21} /></button>
      </div>
      <p className="p-date-month" aria-live="polite">{PERSIAN_MONTHS[view.month - 1]} {persianDigits(view.year)}</p>
      <table className="p-date-grid" role="grid" aria-label={`${PERSIAN_MONTHS[view.month - 1]} ${persianDigits(view.year)}`}>
        <thead><tr>{WEEKDAYS.map((day, index) => <th key={day} scope="col" aria-label={day}>{WEEKDAY_INITIALS[index]}</th>)}</tr></thead>
        <tbody>{Array.from({ length: Math.ceil((offset + monthLength) / 7) }, (_, row) => <tr key={row}>
          {Array.from({ length: 7 }, (_, column) => {
            const day = row * 7 + column - offset + 1;
            if (day < 1 || day > monthLength) return <td key={column} />;
            const iso = persianToIso({ ...view, day })!;
            return <td key={column}><button type="button" ref={element => { if (element) days.current.set(iso, element); else days.current.delete(iso); }}
              aria-label={formatPersianDate(iso)} aria-pressed={value === iso} aria-current={today === iso ? 'date' : undefined}
              tabIndex={focusDate === iso ? 0 : -1} disabled={!inRange(iso)}
              className={value === iso ? 'is-selected' : ''}
              onFocus={() => setFocusDate(iso)} onKeyDown={event => onDayKey(event, iso)} onClick={() => select(iso)}>{persianDigits(day)}</button></td>;
          })}
        </tr>)}</tbody>
      </table>
      <p id={`${id}-keyboard`} className="p-date-keyboard">با کلیدهای جهت‌نما بین روزها حرکت کنید؛ انتخاب با Enter.</p>
      <div className="p-date-footer">
        <button type="button" className="p-date-today" disabled={!inRange(today)} onClick={() => select(today)}>امروز</button>
        <button type="button" className="p-date-clear" disabled={!text} onClick={() => select('')}>پاک کردن تاریخ</button>
      </div>
    </dialog>
  </div>;
}
