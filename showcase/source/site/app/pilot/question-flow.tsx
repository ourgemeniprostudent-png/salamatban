'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AssessmentQuestion } from '../../lib/assessment-definition';
import type { Answer } from '../../lib/pilot/domain';
const fa = (n: number) => n.toLocaleString('fa-IR');
const answered = (value: Answer | undefined) => Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;

export function QuestionFlow({ questions, answers, render, busy, onComplete, onBack, returning }: {
  questions: AssessmentQuestion[]; answers: Record<string, Answer>; render: (q: AssessmentQuestion) => ReactNode;
  busy: boolean; onComplete: () => void; onBack: () => void; returning: boolean;
}) {
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex(q => q.required && !answered(answers[q.id]))));
  const [invalid, setInvalid] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const current = questions[index];
  const required = questions.filter(q => q.required);
  const completed = required.filter(q => answered(answers[q.id])).length;
  useEffect(() => {
    const element = region.current;
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [index]);
  function go(next: number) { setInvalid(false); setIndex(next); }
  function next() {
    if (current.required && !answered(answers[current.id])) {
      setInvalid(true);
      region.current?.querySelector<HTMLInputElement>('input,textarea')?.focus();
      return;
    }
    if (index < questions.length - 1) go(index + 1);
    else finish();
  }
  function finish() {
      const missing = questions.findIndex(q => q.required && !answered(answers[q.id]));
      if (missing >= 0) { go(missing); setInvalid(true); }
      else onComplete();
  }
  return <div className="ux-question-flow" ref={region} tabIndex={-1} aria-label="پرسش‌های این بخش">
    <div className="ux-question-progress"><strong aria-live="polite">پرسش {fa(index + 1)} از {fa(questions.length)}</strong><span>{fa(completed)} از {fa(required.length)} پاسخ الزامی</span></div>
    <progress aria-label="پیشرفت پاسخ‌های الزامی" value={completed} max={required.length}/>
    <details className="ux-question-jump"><summary>رفتن به پرسش دیگر</summary><nav aria-label="انتخاب پرسش">{questions.map((q, i) => <button type="button" className={i === index ? 'is-current' : ''} aria-current={i === index ? 'step' : undefined} aria-label={`پرسش ${fa(i + 1)}: ${q.label}${answered(answers[q.id]) ? '؛ پاسخ داده شده' : ''}`} onClick={() => go(i)} key={q.id}>{fa(i + 1)}{answered(answers[q.id]) && ' ✓'}</button>)}</nav></details>
    <div className="ux-current-question" key={current.id}>{!current.required && <span className="p-muted">اختیاری؛ می‌توانید بدون پاسخ ادامه دهید.</span>}{current.type === 'multi' && <p className="p-muted">می‌توانید چند گزینه انتخاب کنید.</p>}{render(current)}{invalid && !answered(answers[current.id]) && <p className="ux-error" role="alert">برای ادامه، پاسخ این پرسش را انتخاب کنید.</p>}</div>
    {returning && index < questions.length - 1 && <button type="button" className="p-link" disabled={busy} onClick={finish}>ذخیره و بازگشت به مرور نهایی</button>}
    <div className="ux-question-actions"><button type="button" className="p-secondary" disabled={busy} onClick={() => index > 0 ? go(index - 1) : onBack()}>قبلی</button><button type="button" className="p-primary" disabled={busy} onClick={next}>{index === questions.length - 1 ? returning ? 'ذخیره و بازگشت به مرور نهایی' : 'ذخیره و مرحله بعد ←' : !current.required && !answered(answers[current.id]) ? 'ادامه بدون پاسخ' : 'پرسش بعدی ←'}</button></div>
  </div>;
}
