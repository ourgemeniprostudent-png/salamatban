'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './brand';
import { emptyJourney, visitReasons, type Journey } from '@/lib/pilot/journey';
import './grouped-intake.css';

export function JourneyDiscovery({ value, goal, busy, onChange, onGoal, onFinish }: { value?: Journey; goal: string; busy: boolean; onChange: (value: Journey) => void; onGoal: (goal: string) => void; onFinish: () => void }) {
  const journey = value || emptyJourney(), region = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const selectedReasons = visitReasons.filter(r => journey.reasons.includes(r.id));
  const chosen = [...selectedReasons].sort((a, b) => a.id === journey.primary ? -1 : b.id === journey.primary ? 1 : 0);
  const questions = chosen.flatMap(r => r.questions.map(q => ({ id: q[0], label: q[1], reason: r.title })));
  // Keep the persisted cursor compatible with earlier drafts: it still names a question,
  // while the UI shows the containing group of up to four questions together.
  const last = questions.length + 1, cursor = Math.min(journey.cursor, last);
  const contextPage = Math.max(0, Math.floor((cursor - 1) / 4));
  const contextPages = Math.ceil(questions.length / 4);
  const onContext = cursor > 0 && cursor < last;
  const visibleQuestions = questions.slice(contextPage * 4, contextPage * 4 + 4);
  const position = cursor === 0 ? 0 : cursor === last ? contextPages + 1 : contextPage + 1;
  const primary = visitReasons.find(r => r.id === journey.primary) || chosen[0];
  function move(next: number) { setError(''); onChange({ ...journey, cursor: next }); }
  useEffect(() => { region.current?.focus({ preventScroll: true }); region.current?.scrollIntoView({ block: 'start', behavior: 'auto' }); }, [position]);
  function next() {
    if (cursor === 0 && !chosen.length) { setError('یک مورد انتخاب کنید؛ «هنوز دقیق نمی‌دانم» هم یک انتخاب است.'); return; }
    if (cursor === last) {
      if (!goal.trim()) { setError('یک پیشنهاد انتخاب کنید یا خواسته‌تان را بنویسید.'); return; }
      onFinish();
    } else move(cursor === 0 ? 1 : Math.min(last, (contextPage + 1) * 4 + 1));
  }
  function previous() {
    move(cursor === last ? Math.max(1, (contextPages - 1) * 4 + 1) : contextPage > 0 ? (contextPage - 1) * 4 + 1 : 0);
  }
  return <section className="p-card j-discovery gi-discovery" aria-label="آشنایی با نیاز شما">
    <div className="j-conversation-heading"><span className="j-guide-mark"><Icon name="heart" /></span><span>از خودِ شما شروع می‌کنیم<small>پاسخ درست یا غلطی وجود ندارد.</small></span></div>
    <ol className="gi-discovery-stages" aria-label="مراحل آشنایی">{['دلیل مراجعه', 'توضیحات شما', 'هدف شما'].map((label, i) => <li key={label} aria-current={(cursor === 0 ? 0 : cursor === last ? 2 : 1) === i ? 'step' : undefined}><span>{(i + 1).toLocaleString('fa-IR')}</span>{label}</li>)}</ol>
    <div className="j-progress"><span style={{ width: `${(position + 1) / (contextPages + 2) * 100}%` }} /></div>
    <div key={position} className="j-scene gi-discovery-content" tabIndex={-1} ref={region}>
      {cursor === 0 ? <><h1>برای چه چیزی کمک می‌خواهید؟</h1><p className="p-muted">می‌توانید چند مورد را انتخاب کنید؛ سپس بگویید کدام برایتان مهم‌تر است.</p><div className="j-reasons">{visitReasons.map(reason => {
        const selected = journey.reasons.includes(reason.id); return <button type="button" key={reason.id} className={`j-reason ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => { setError(''); const reasons = selected ? journey.reasons.filter(r => r !== reason.id) : [...journey.reasons, reason.id]; onChange({ ...journey, reasons, primary: reasons.includes(journey.primary as typeof reason.id) ? journey.primary : reasons[0] || '', context: journey.context }); }}><span className="j-reason-icon"><Icon name={reason.icon} /></span><span><strong>{reason.title}</strong><small>{reason.description}</small></span><span className="j-selection" aria-hidden="true">{selected ? '✓' : '+'}</span></button>;
      })}</div>{chosen.length > 1 && <fieldset className="j-primary"><legend>اول از کدام شروع کنیم؟</legend>{selectedReasons.map(r => <label className="p-choice" key={r.id}><input type="radio" name="primary-reason" checked={journey.primary === r.id} onChange={() => onChange({ ...journey, primary: r.id })} />{r.title}</label>)}</fieldset>}</> : onContext ? <>
        <div className="gi-section-heading"><div><span className="gi-kicker">توضیحات شما{contextPages > 1 && ` · بخش ${(contextPage + 1).toLocaleString('fa-IR')} از ${contextPages.toLocaleString('fa-IR')}`}</span><h1>کمی بیشتر از شرایطتان بگویید.</h1><p className="p-muted">پاسخ‌ها اختیاری‌اند. هر موردی را که مطمئن نیستید خالی بگذارید تا با پزشک مطرح کنید.</p></div></div>
        <div className="gi-context-grid">{visibleQuestions.map(question => <label className="gi-context-field" key={question.id}><small>{question.reason}</small><span>{question.label}</span><textarea aria-label={question.label} value={journey.context[question.id] || ''} maxLength={1000} rows={4} placeholder="هر چیزی که فکر می‌کنید کمک می‌کند…" onChange={e => onChange({ ...journey, context: { ...journey.context, [question.id]: e.target.value } })} /></label>)}</div>
      </> : <><span className="p-eyebrow">چیزی که برای شما ارزش دارد</span><h1>دوست دارید این همراهی چه تغییری ایجاد کند؟</h1><p className="p-muted">این‌ها پیشنهادهایی برای گفت‌وگو هستند. هدف شما را پزشک می‌بیند؛ برنامهٔ مراقبت پس از بررسی او مشخص می‌شود.</p><div className="gi-goal-layout"><div className="j-goals">{[...(primary?.goals || []), 'برای انتخاب هدف از پزشک کمک می‌خواهم'].map(item => <button key={item} aria-pressed={goal === item} className={`j-goal ${goal === item ? 'selected' : ''}`} onClick={() => { setError(''); onGoal(item); }}><Icon name={goal === item ? 'check' : 'plus'} size={19} />{item}</button>)}</div><label className="p-field gi-custom-goal"><span>یا به زبان خودتان بنویسید</span><textarea aria-label="هدف به زبان خودتان" maxLength={400} value={goal} onChange={e => { setError(''); onGoal(e.target.value); }} /><small>از یک خواستهٔ روشن و قابل پیگیری شروع می‌کنیم.</small></label></div></>}
    </div><div className="gi-discovery-feedback"><p className="gi-feedback-size" aria-hidden="true" data-reserve="یک مورد انتخاب کنید؛ «هنوز دقیق نمی‌دانم» هم یک انتخاب است."/><p className="gi-feedback-error" role="alert">{error}</p></div>
    <div className="j-controls gi-action-bar"><div>{cursor > 0 && <button className="p-secondary" disabled={busy} onClick={previous}>قبلی</button>}</div><button className="p-primary" disabled={busy} onClick={next}>{cursor === last ? 'ادامه به مشخصات من' : cursor === 0 ? 'ادامه ←' : contextPage < contextPages - 1 ? 'ادامه توضیحات ←' : 'ادامه به انتخاب هدف ←'}</button></div>
  </section>;
}
export function JourneySummary({value,goal}:{value?:Journey;goal?:string}){
  if(!value?.reasons.length)return null;
  return <div className="j-summary"><h3>آنچه برای شما مهم است</h3><p>{visitReasons.filter(r=>value.reasons.includes(r.id)).map(r=>r.title+(r.id===value.primary?' (اولویت اول)':'')).join(' · ')}</p>{goal&&<p><strong>خواستهٔ شما: </strong>{goal}</p>}<details><summary>مشاهده توضیحات دلیل مراجعه</summary>{visitReasons.filter(r=>value.reasons.includes(r.id)).flatMap(r=>r.questions.map(q=>({key:q[0],label:q[1]}))).map(({key,label})=><div key={key}><b>{label}</b><p>{value.context[key]||'فعلاً پاسخی ثبت نشده؛ قابل گفت‌وگو با پزشک'}</p></div>)}</details><small>این توضیحات، گزارش و ترجیح کاربر است؛ تشخیص پزشکی نیست.</small></div>;
}
