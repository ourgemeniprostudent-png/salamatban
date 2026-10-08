'use client';
import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './brand';

export type FeedbackMessage = {
  kind: 'save' | 'failed' | 'conflict' | 'error' | 'notice' | 'auth';
  text: string;
  state?: string;
  detail?: string;
  content?: ReactNode;
  action?: { label: string; shortLabel: string; run: () => void };
};

/** Notifications replace one reserved row; their details never resize the form. */
export function FeedbackRegion({ message, busy }: { message?: FeedbackMessage; busy: boolean }) {
  const [openedMessage, setOpenedMessage] = useState<FeedbackMessage | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const id = useId();
  const failed = message && ['failed', 'conflict', 'error', 'auth'].includes(message.kind);
  // The preview is bounded at every viewport; complete text is always reachable.
  const hasDetails = !!message;
  function close() { dialog.current?.close(); setOpenedMessage(null); opener.current?.focus({ preventScroll: true }); }
  const className = message?.kind === 'error' ? 'p-alert danger' : message?.kind === 'notice' ? 'p-alert success' : `ux-save-status ${message?.state || message?.kind || ''}`;
  return <div className="feedback-slot" aria-label="وضعیت انجام کار">
    <div className={`feedback-row ${className}`} data-empty={!message || undefined}>
      <p className="feedback-message" role={failed ? 'alert' : 'status'}>{message?.text}</p>
      <div className="feedback-commands">
        {message?.action && <button type="button" className="p-link" disabled={busy} aria-label={message.action.label} onClick={message.action.run}>{message.action.shortLabel}</button>}
        {hasDetails && <button type="button" className="feedback-details" aria-label="مشاهده متن کامل پیام" title="متن کامل پیام" aria-haspopup="dialog" onClick={() => { opener.current = document.activeElement as HTMLElement; setOpenedMessage(message); }}><Icon name="help" size={19}/></button>}
      </div>
    </div>
    {openedMessage && createPortal(<dialog className="feedback-dialog" dir="rtl" aria-labelledby={`${id}-heading`} ref={node => { dialog.current = node; if (node && !node.open) node.showModal(); }} onCancel={event => { event.preventDefault(); close(); }}>
      <header><h2 id={`${id}-heading`}>جزئیات پیام</h2><button type="button" autoFocus aria-label="بستن جزئیات پیام" onClick={close}><Icon name="close"/></button></header>
      <div className="feedback-dialog-body">{openedMessage.content || <p>{openedMessage.detail || openedMessage.text}</p>}</div>
      <footer>{openedMessage.action && <button type="button" disabled={busy} onClick={() => { close(); openedMessage.action?.run(); }}>{openedMessage.action.label}</button>}<button type="button" onClick={close}>بازگشت به کار من</button></footer>
    </dialog>, document.body)}
  </div>;
}
