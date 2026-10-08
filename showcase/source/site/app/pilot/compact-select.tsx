'use client';

import { Children, isValidElement, useId, useRef, useState, type ReactNode, type OptionHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import './compact-select.css';

type Props = {
  value: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
};
const normalize = (text: string) => text.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase();

/** A bounded, searchable selection dialog shared by forms, filters and calendar years. */
export function CompactSelect({ value, onValueChange, children, disabled, 'aria-label': label }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState(label || 'انتخاب گزینه');
  const options = Children.toArray(children).flatMap(child => {
    if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child)) return [];
    return [{ value: String(child.props.value ?? ''), label: String(child.props.children ?? ''), disabled: !!child.props.disabled }];
  });
  const selected = options.find(option => option.value === String(value));
  const visible = options.filter(option => normalize(option.label + ' ' + option.value).includes(normalize(query)));
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus(); }
  function show() {
    setTitle(label || trigger.current?.labels?.[0]?.querySelector('span')?.textContent || 'انتخاب گزینه');
    setQuery('');
    setOpen(true);
  }
  function mount(node: HTMLDialogElement | null) {
    dialog.current = node;
    if (node && !node.open) {
      node.showModal();
      if (options.length > 8) search.current?.focus();
      else (node.querySelector('[aria-selected="true"]:not(:disabled)') || node.querySelector('[role="option"]:not(:disabled)'))?.scrollIntoView({ block: 'nearest' });
    }
  }
  return <span className="cs-control">
    <button ref={trigger} type="button" role="combobox" className="cs-trigger" disabled={disabled} aria-label={label}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-dialog` : undefined}
      onClick={show} onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); show(); } }}>
      <span>{selected?.label || 'انتخاب کنید'}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    {open && createPortal(<dialog ref={mount} id={`${id}-dialog`} className="cs-dialog" data-searchable={options.length > 8 ? 'true' : undefined} dir="rtl" aria-labelledby={`${id}-title`}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
      onClick={event => { if (event.target !== event.currentTarget) return; const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); }}>
      <header><h2 id={`${id}-title`}>{title}</h2><button type="button" className="cs-close" aria-label="بستن گزینه‌ها" onClick={close}>×</button></header>
      {options.length > 8 && <input ref={search} type="search" autoComplete="off" aria-label={`جست‌وجو در ${title}`} placeholder="جست‌وجو…" value={query} onChange={event => setQuery(event.target.value)}
        onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); dialog.current?.querySelector<HTMLButtonElement>('[role="option"]:not(:disabled)')?.focus(); } }}/>}
      <div className="cs-options" role="listbox" aria-label={title} onKeyDown={event => {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)'));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        let next = index;
        if (event.key === 'ArrowDown') next = Math.min(index + 1, buttons.length - 1);
        else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault(); buttons[next]?.focus();
      }}>
        {visible.map(option => <button type="button" role="option" key={option.value} data-value={option.value} aria-selected={option.value === String(value)} disabled={option.disabled}
          onClick={() => { onValueChange(option.value); close(); }}><span>{option.label}</span>{option.value === String(value) && <span aria-hidden="true">✓</span>}</button>)}
        {!visible.length && <p role="status">گزینه‌ای پیدا نشد؛ عبارت دیگری وارد کنید.</p>}
      </div>
    </dialog>, document.body)}
  </span>;
}
