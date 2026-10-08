'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { AssessmentQuestion } from '../../lib/assessment-definition';
import type { Answer } from '../../lib/pilot/domain';
import './grouped-intake.css';

const fa = (n: number) => n.toLocaleString('fa-IR');
const answered = (value: Answer | undefined) => Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
const definitions = [
  { id: 'safety', title: 'وضعیت همین روزهای شما', description: 'برای هر مورد پاسخ جداگانه بدهید تا پزشک از وضعیت فعلی شما مطلع شود.', sections: ['safety'] },
  { id: 'history', title: 'سوابق و اطلاعات پزشکی', description: 'اطلاعات مرتبط را کنار هم کامل کنید. نام داروها و حساسیت‌ها اختیاری است.', sections: ['context', 'history'] },
  { id: 'lifestyle', title: 'عادت‌های روزانه', description: 'سه پاسخ کوتاه دربارهٔ دخانیات، فعالیت و خواب شما.', sections: ['lifestyle'] },
];

export function QuestionFlow({ questions, answers, render, busy, onComplete, onBack, onPause, returning }: {
  questions: AssessmentQuestion[]; answers: Record<string, Answer>; render: (q: AssessmentQuestion) => ReactNode;
  busy: boolean; onComplete: () => void; onBack: () => void; onPause?: () => void; returning: boolean;
}) {
  const groups = definitions.map(group => ({ ...group, questions: questions.filter(q => group.sections.includes(q.section)) })).filter(group => group.questions.length);
  const [index, setIndex] = useState(() => Math.max(0, groups.findIndex(group => group.questions.some(q => q.required && !answered(answers[q.id])))));
  const [invalid, setInvalid] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const feedbackId = useId();
  const current = groups[Math.min(index, groups.length - 1)];
  const required = questions.filter(q => q.required);
  const completed = required.filter(q => answered(answers[q.id])).length;
  const currentInvalid = invalid && current?.questions.some(q => q.required && !answered(answers[q.id]));
  const requiredMessage = 'برای ادامه، پاسخ این پرسش را انتخاب کنید.';
  useEffect(() => {
    region.current?.focus({ preventScroll: true });
    region.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [index]);

  function focusQuestion(id: string) {
    requestAnimationFrame(() => {
      const question = region.current?.querySelector<HTMLElement>(`[data-question="${id}"]`);
      const control = question?.querySelector<HTMLInputElement>('input,textarea');
      control?.focus({ preventScroll: true });
      const bounds = control?.getBoundingClientRect();
      const footerTop = region.current?.querySelector('.gi-action-bar')?.getBoundingClientRect().top ?? window.innerHeight;
      if (bounds && (bounds.top < 80 || bounds.bottom > footerTop - 16)) question?.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
  }
  function go(next: number) { setInvalid(false); setIndex(next); }
  function finish() {
    const missing = questions.find(q => q.required && !answered(answers[q.id]));
    if (missing) {
      setIndex(groups.findIndex(group => group.questions.some(q => q.id === missing.id)));
      setInvalid(true);
      focusQuestion(missing.id);
    } else onComplete();
  }
  function next() {
    const missing = current.questions.find(q => q.required && !answered(answers[q.id]));
    if (missing) { setInvalid(true); focusQuestion(missing.id); return; }
    if (index < groups.length - 1) go(index + 1);
    else finish();
  }
  if (!current) return null;

  return <div className="ux-question-flow gi-flow" ref={region} tabIndex={-1} aria-label="پرسش‌های این بخش">
    <header className="gi-section-heading"><div><span className="gi-kicker">{groups.length > 1 ? `بخش ${fa(index + 1)} از ${fa(groups.length)}` : 'پرسش‌های مرتبط، در یک صفحه'}</span><h3>{current.title}</h3><p className={`gi-feedback-copy ${currentInvalid ? 'has-feedback' : ''}`}><span className="gi-description-copy" aria-hidden={currentInvalid || undefined}>{current.description}</span><span className="gi-feedback-size" aria-hidden="true" data-reserve={requiredMessage}/><span className="gi-feedback-error" role="alert" id={feedbackId}>{currentInvalid ? requiredMessage : ''}</span></p></div><span className="gi-completion" aria-live="polite"><span className="gi-count">{fa(completed)}</span> از <span className="gi-count">{fa(required.length)}</span> پاسخ الزامی</span></header>
    <progress aria-label="پیشرفت پاسخ‌های الزامی" value={completed} max={required.length}/>
    {groups.length > 1 && <nav className="gi-group-nav" aria-label="بخش‌های پرسشنامه">{groups.map((group, i) => <button type="button" key={group.id} aria-current={i === index ? 'step' : undefined} onClick={() => go(i)} disabled={busy}><span>{fa(i + 1)}</span>{group.title}<b aria-label="کامل شده" aria-hidden={!group.questions.every(q => !q.required || answered(answers[q.id]))} className={group.questions.every(q => !q.required || answered(answers[q.id])) ? '' : 'gi-incomplete'}>✓</b></button>)}</nav>}
    <div className={`gi-question-grid gi-${current.id}`} key={current.id}>{current.questions.map(q => <div key={q.id} className={`gi-question ${invalid && q.required && !answered(answers[q.id]) ? 'gi-invalid' : ''}`} data-question={q.id} aria-invalid={invalid && q.required && !answered(answers[q.id]) || undefined} aria-describedby={invalid && q.required && !answered(answers[q.id]) ? feedbackId : undefined}>
      {!q.required && <small className="gi-optional">اختیاری؛ می‌توانید خالی بگذارید.</small>}
      {render(q)}
    </div>)}</div>
    <div className="gi-action-bar ux-question-actions"><div className="gi-action-secondary"><button type="button" className="p-secondary" disabled={busy} onClick={() => index > 0 ? go(index - 1) : onBack()}>قبلی</button>{onPause && <button type="button" className="p-link gi-save-later" disabled={busy} onClick={onPause}>ذخیره و ادامه در فرصتی دیگر</button>}</div><div className="gi-action-primary">{returning && index < groups.length - 1 && <button type="button" className="p-link" disabled={busy} onClick={finish}>ذخیره و بازگشت به مرور نهایی</button>}<button type="button" className="p-primary" disabled={busy} onClick={next}>{index === groups.length - 1 ? returning ? 'ذخیره و بازگشت به مرور نهایی' : 'ذخیره و مرحله بعد ←' : `ادامه به ${groups[index + 1].title} ←`}</button></div></div>
  </div>;
}
