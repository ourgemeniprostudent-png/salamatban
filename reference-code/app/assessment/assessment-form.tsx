'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { assessmentDefinition, type AssessmentQuestion } from '../../lib/assessment-definition';

const sections = [
  { id:'safety', title:'بررسی فوری ایمنی', note:'این بخش تعیین می‌کند آیا باید از مسیر غربالگری خارج و فوراً ارزیابی شوید.' },
  { id:'context', title:'شرایط فعلی', note:'برای انتخاب مسیر مناسب، وضعیت بارداری یا قصد بارداری مهم است.' },
  { id:'history', title:'سابقه سلامت', note:'موارد شناخته‌شده را ثبت کنید؛ پاسخ شما تشخیص جدید ایجاد نمی‌کند.' },
  { id:'lifestyle', title:'سبک زندگی', note:'این اطلاعات تنها پس از بازبینی انسانی در مسیر همراهی سلامت استفاده می‌شود.' },
] as const;

type AnswerValue = string | string[];

export default function AssessmentForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [result, setResult] = useState<{ urgent:boolean; message:string } | null>(null);
  const [status, setStatus] = useState<'idle'|'saving'|'error'>('idle');
  const section = sections[step];
  const questions = useMemo(() => assessmentDefinition.questions.filter((question) => question.section === section.id), [section.id]);

  function fillDemo() {
    setAnswers({
      urgent_chest_pain: 'no', urgent_dyspnea: 'no', urgent_syncope: 'no', urgent_neuro: 'no', urgent_bleeding: 'no', urgent_infection: 'no', urgent_self_harm: 'no',
      pregnancy_status: 'not_applicable', known_conditions: ['diabetes'], medications: 'متفورمین طبق نسخه پزشک', allergies: 'حساسیت شناخته‌شده ندارد', family_history: ['diabetes'], tobacco: 'never', activity: 'some', sleep: 'mixed',
    });
    setStatus('idle');
  }

  function setSingle(id: string, value: string) { setAnswers((current) => ({ ...current, [id]: value })); }
  function toggleMulti(question: AssessmentQuestion, value: string) {
    setAnswers((current) => {
      const existing = Array.isArray(current[question.id]) ? current[question.id] as string[] : [];
      if (value === 'none') return { ...current, [question.id]: existing.includes('none') ? [] : ['none'] };
      const withoutNone = existing.filter((item) => item !== 'none');
      return { ...current, [question.id]: withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value] };
    });
  }
  function sectionComplete() {
    return questions.every((question) => !question.required || (Array.isArray(answers[question.id]) ? (answers[question.id] as string[]).length > 0 : Boolean(answers[question.id])));
  }
  function next() { if (sectionComplete()) setStep((current) => Math.min(current + 1, sections.length - 1)); else setStatus('error'); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!sectionComplete()) { setStatus('error'); return; }
    setStatus('saving');
    const response = await fetch('/api/assessment', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ answers }) });
    if (!response.ok) { setStatus('error'); return; }
    const payload = await response.json() as { urgent:boolean; message:string };
    setResult(payload);
    setStatus('idle');
  }

  if (result) return (
    <section className={result.urgent ? 'assessment-result urgent' : 'assessment-result'} role="status">
      <span>{result.urgent ? 'نیازمند اقدام فوری' : 'ارزیابی ثبت شد'}</span>
      <h1>{result.urgent ? 'منتظر پاسخ آنلاین نمانید.' : 'نقطه شروع شما آماده است.'}</h1>
      <p>{result.message}</p>
      {result.urgent && <p className="urgent-boundary">همیار سلامت خدمات اورژانس نیست و این پیام تشخیص پزشکی محسوب نمی‌شود.</p>}
      <Link className="result-link" href={result.urgent?'/dashboard':'/checkup'}>{result.urgent?'بازگشت به داشبورد':'مشاهده بسته ارزیابی'}</Link>
    </section>
  );

  return (
    <form className="assessment-form" onSubmit={submit}>
      <div className="assessment-progress"><span style={{width:`${((step + 1) / sections.length) * 100}%`}} /></div>
      <button type="button" className="demo-fill-button" onClick={fillDemo}><b>⚡ تکمیل پاسخ‌های نمونه</b><span>پاسخ‌های غیر اورژانسی بیمار دیابتی در همه بخش‌ها پر می‌شود؛ مراحل همچنان قابل مرورند.</span></button>
      <div className="assessment-step-head"><p>بخش {step + 1} از {sections.length}</p><h1>{section.title}</h1><span>{section.note}</span></div>
      <div className="question-list">
        {questions.map((question) => (
          <fieldset key={question.id}>
            <legend>{question.label}{question.required && <b> *</b>}</legend>
            {question.help && <p>{question.help}</p>}
            {question.type === 'yes_no' && <div className="choice-row">
              {[{value:'no',label:'خیر'},{value:'yes',label:'بله'}].map((option) => <label key={option.value} className={answers[question.id] === option.value ? 'selected' : ''}><input type="radio" name={question.id} checked={answers[question.id] === option.value} onChange={() => setSingle(question.id, option.value)} /><span>{option.label}</span></label>)}
            </div>}
            {question.type === 'single' && <div className="choice-grid">
              {question.options?.map((option) => <label key={option.value} className={answers[question.id] === option.value ? 'selected' : ''}><input type="radio" name={question.id} checked={answers[question.id] === option.value} onChange={() => setSingle(question.id, option.value)} /><span>{option.label}</span></label>)}
            </div>}
            {question.type === 'multi' && <div className="choice-grid">
              {question.options?.map((option) => { const values = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : []; return <label key={option.value} className={values.includes(option.value) ? 'selected' : ''}><input type="checkbox" checked={values.includes(option.value)} onChange={() => toggleMulti(question, option.value)} /><span>{option.label}</span></label>; })}
            </div>}
            {question.type === 'text' && <textarea value={typeof answers[question.id] === 'string' ? answers[question.id] as string : ''} onChange={(event) => setSingle(question.id, event.target.value)} maxLength={1000} rows={3} />}
          </fieldset>
        ))}
      </div>
      {status === 'error' && <p className="form-error" role="alert">لطفاً به همه پرسش‌های الزامی این بخش پاسخ دهید.</p>}
      <div className="assessment-actions">
        {step > 0 && <button type="button" className="secondary-button" onClick={() => { setStep((current) => current - 1); setStatus('idle'); }}>مرحله قبل</button>}
        {step < sections.length - 1
          ? <button type="button" className="submit-button" onClick={next}>ادامه</button>
          : <button type="submit" className="submit-button" disabled={status === 'saving'}>{status === 'saving' ? 'در حال ثبت…' : 'ثبت ارزیابی پایه'}</button>}
      </div>
      <small className="definition-note">نسخه پرسش‌نامه {assessmentDefinition.version} · تأییدشده برای محیط آزمایشی توسط {assessmentDefinition.approvedBy}</small>
    </form>
  );
}
