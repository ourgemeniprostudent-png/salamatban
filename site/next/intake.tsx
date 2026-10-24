import {useEffect,useRef,useState} from 'react';
import {CityInput} from '../app/pilot/city-input';
import {questions,type Answers,type CareCase} from './model';
import {Button,Icon,fa} from './ui';
import {ConsentChoices,normalizeNumber,type MemberProps} from './member';

export const intakeGroups=[[0],[1,2],[3,4,5],[6,7],[8,9,10],[11]];
export function Wizard({record,busy,send,onPause,onFinish}:{record:CareCase;busy:boolean;send:MemberProps['send'];onPause:()=>void;onFinish:()=>void}){
 const [group,G]=useState(()=>Math.max(0,intakeGroups.findIndex(g=>g.includes(Math.min(record.step,questions.length-1))))),[answers,A]=useState<Answers>(record.answers),[error,E]=useState(''),[agree,AG]=useState(record.consent),[contact,CT]=useState(record.contactConsent);
 const version=useRef(record.version),heading=useRef<HTMLHeadingElement>(null),indices=intakeGroups[group],first=questions[indices[0]],single=indices.length===1&&!first.type;
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[group]);
 function set(id:string,value:string){A(a=>({...a,[id]:value}));E('');}
 function toggle(id:string,v:string){A(a=>{const current=Array.isArray(a[id])?a[id] as string[]:[];return {...a,[id]:['none','unknown'].includes(v)?[v]:current.includes(v)?current.filter(x=>x!==v):[...current.filter(x=>!['none','unknown'].includes(x)),v]};});E('');}
 function prepared(required:boolean,source=answers):Answers|null{
  const next={...source};
  for(const index of indices){const q=questions[index],value=next[q.id];
   if(q.type==='number'){
    const n=normalizeNumber(String(value||''));
    if(n&&n!=='skip'&&(!Number.isFinite(Number(n))||Number(n)<q.min!||Number(n)>q.max!)){E(`${q.title} عددی بین ${fa(q.min!)} و ${fa(q.max!)} وارد کنید یا خالی بگذارید.`);return null;}
    if(n)next[q.id]=n;else if(required)next[q.id]='skip';
   }else if(required&&(!value||Array.isArray(value)&&!value.length||q.type==='city'&&String(value).trim().length<2)){E(`پاسخ «${q.title}» را مشخص کنید.`);return null;}
   if(q.type==='city'&&value)next[q.id]=String(value).trim();
  }
  for(const [key,value] of Object.entries(next))if(Array.isArray(value)&&!value.length)delete next[key];
  return next;
 }
 async function save(nextGroup:number,pause=false,source=answers){if(busy)return;const next=prepared(!pause&&nextGroup>group,source);if(!next)return;E('');const step=nextGroup>=intakeGroups.length?questions.length:intakeGroups[nextGroup][0];if(await send({kind:'save',answers:next,step,consent:agree,contactConsent:contact},version.current)){version.current++;A(next);if(pause)onPause();else if(nextGroup>=intakeGroups.length)onFinish();else G(nextGroup);}}
 return <section className={`n-flow ${indices.length>1?'n-flow-grouped':''}`} aria-label="آشنایی اولیه"><header className="n-flow-head"><span>آشنایی با شما</span><button className="n-link" disabled={busy} onClick={()=>void save(group,true)}>ذخیره و ادامه بعداً</button></header><div className="n-progress"><span style={{width:`${group/intakeGroups.length*100}%`}}/></div><div className="n-flow-caption"><span>بخش {fa(group+1)} از {fa(intakeGroups.length)}</span><span>{indices.length>1?`${fa(indices.length)} پرسش مرتبط، یک‌جا`:'از چیزی شروع کنیم که برایتان مهم است'}</span></div><div className="n-question"><span className="n-question-icon"><Icon name={first.icon} size={27}/></span><h1 tabIndex={-1} ref={heading}>{first.title}</h1><p>{indices.length>1?'پاسخ‌های این بخش را کنار هم کامل کنید؛ سپس یک بار ادامه را بزنید.':first.help}</p><div className="n-question-grid">{indices.map((index,pos)=>{const q=questions[index];return <fieldset key={q.id} className="n-question-field" aria-label={q.title}><legend>{indices.length>1&&pos>0?q.title:<span className="sr-only">{q.title}</span>}</legend>{indices.length>1&&<p>{q.help}</p>}<div className={`n-answers ${q.type==='multi'?'is-multi':''}`}>{q.options?.map(o=>{const selected=q.type==='multi'?(answers[q.id] as string[]||[]).includes(o.value):answers[q.id]===o.value;return <button key={o.value} type="button" className="n-option" disabled={busy} aria-pressed={selected} onClick={()=>{if(q.type==='multi')toggle(q.id,o.value);else if(single)void save(group+1,false,{...answers,[q.id]:o.value});else set(q.id,o.value);}}><span><strong>{o.label}</strong>{o.hint&&<small>{o.hint}</small>}</span><span className="n-choice-mark"><Icon name={selected?'check':single?'chevron':'plus'} size={17}/></span></button>;})}{q.type==='city'&&<CityInput value={String(answers[q.id]||'')} onChange={v=>set(q.id,v)} label="شهر محل زندگی"/>}{q.type==='number'&&<div className="n-measure"><label><span className="sr-only">{q.title}</span><input value={answers[q.id]==='skip'?'':String(answers[q.id]||'')} onChange={e=>set(q.id,e.target.value)} inputMode="decimal" autoComplete="off" placeholder="اختیاری"/><span>{q.unit}</span></label><small>مقدار تقریبی کافی است؛ می‌توانید خالی بگذارید.</small></div>}</div></fieldset>;})}</div><p className="n-field-error" role={error?'alert':undefined}>{error}</p></div>{group===0&&<ConsentChoices agree={agree} contact={contact} busy={busy} onAgree={AG} onContact={CT}/>}<footer className="n-flow-actions">{group>0&&<button className="n-back" disabled={busy} onClick={()=>void save(group-1)}><Icon name="chevron-right" size={17}/> قبلی</button>}{single?<small>با انتخاب پاسخ، ادامه می‌دهید.</small>:<Button disabled={busy} onClick={()=>void save(group+1)}>ادامه <Icon name="arrow" size={18}/></Button>}</footer></section>;
}
