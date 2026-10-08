'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './brand';
import './demo-login.css';

type Sample = { phone:string; name:string; role:string };
const roleNames:Record<string,string>={member:'عضو',clinician:'پزشک',coordinator:'کارشناس',admin:'مدیر'};
const roleIcons:Record<string,string>={member:'users',clinician:'doctor',coordinator:'calendar',admin:'settings'};

export function DemoAccounts({samples,phone,busy,onChoose}:{samples:Sample[];phone:string;busy:boolean;onChoose:(phone:string)=>void}){
 const id=useId();
 const roles=['member','clinician','coordinator','admin'];
 return <aside className="p-card p-demo-accounts" aria-labelledby={`${id}-title`}>
  <header className="p-demo-accounts-heading"><div><h2 id={`${id}-title`}>حساب‌های نمونه</h2><p id={`${id}-help`}>یک نام را انتخاب کنید؛ شمارهٔ آن در فرم بالا قرار می‌گیرد.</p></div><span className="p-demo-account-note"><Icon name="shield" size={15}/>اطلاعات ساختگی، برای تجربهٔ نقش‌ها</span></header>
  <div className="p-demo-role-groups">{roles.filter(role=>samples.some(sample=>sample.role===role)).map(role=><section className={`p-demo-role-group p-demo-role-${role}`} key={role} aria-labelledby={`${id}-${role}`}>
   <h3 id={`${id}-${role}`}><Icon name={roleIcons[role]} size={16}/>{role==='member'?'اعضا':roleNames[role]}<span>{samples.filter(sample=>sample.role===role).length.toLocaleString('fa-IR')}</span></h3>
   <div className="p-demo-account-list">{samples.filter(sample=>sample.role===role).map(sample=><button type="button" key={sample.phone} className="p-demo-account" aria-pressed={phone===sample.phone} aria-describedby={`${id}-help`} disabled={busy} onClick={()=>onChoose(sample.phone)}>
    <span className="p-demo-account-icon" aria-hidden="true">{sample.name.replace(/^(دکتر|کارشناس|مدیر)\s+/,'').slice(0,1)}</span>
    <span className="p-demo-account-copy"><strong>{sample.name}</strong><bdi>{sample.phone}</bdi></span>
    <span className="p-demo-account-check" aria-hidden="true" style={{visibility:phone===sample.phone?'visible':'hidden'}}><Icon name="check" size={16}/></span>
   </button>)}</div>
  </section>)}</div>
 </aside>;
}

function legacyCopy(value:string){
 const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const field=document.createElement('textarea');field.value=value;field.readOnly=true;
 field.style.cssText='position:fixed;top:0;left:-9999px;opacity:0';document.body.appendChild(field);
 try{field.select();field.setSelectionRange(0,value.length);return document.execCommand('copy');}
 finally{field.remove();previous?.focus({preventScroll:true});}
}

export function DemoCode({value}:{value:string}){
 const [state,setState]=useState<'idle'|'copying'|'copied'|'failed'>('idle');
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),mounted=useRef(true),copying=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 async function copy(){
  if(copying.current)return;copying.current=true;if(timer.current)clearTimeout(timer.current);setState('copying');
  let copied=false;
  try{await navigator.clipboard.writeText(value);copied=true;}
  catch{try{copied=legacyCopy(value);}catch{copied=false;}}
  copying.current=false;if(!mounted.current)return;setState(copied?'copied':'failed');
  if(copied)timer.current=setTimeout(()=>setState('idle'),2400);
 }
 return <div className="p-sample-code p-copyable-code">
  <span>کد نمایشی این ورود</span>
  <div className={`p-code-copy-actions ${state==='copied'?'is-copied':state==='failed'?'is-failed':''}`}>
   <button type="button" className="p-code-value" onClick={copy} aria-label={`کپی کد ${value}`} aria-disabled={state==='copying'}><b dir="ltr">{value}</b></button>
   <button type="button" className="p-code-icon" onClick={copy} aria-label="کپی کد نمایشی" aria-disabled={state==='copying'}><Icon name={state==='copied'?'check':'copy'} size={19}/></button>
   <span className={`p-copy-tooltip ${state==='failed'?'p-copy-error':''}`} role={state==='failed'?'alert':'status'} aria-live={state==='failed'?'assertive':'polite'}>{state==='failed'?'کپی خودکار ممکن نشد؛ کد را دستی وارد کنید.':state==='copied'?'کپی شد':state==='copying'?'در حال کپی…':'کپی کد'}</span>
  </div>
 </div>;
}
