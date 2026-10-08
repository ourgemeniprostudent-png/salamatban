'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './brand';
import './demo-login.css';

type Sample = { phone:string; name:string; role:string };
const roleNames:Record<string,string>={member:'عضو',clinician:'پزشک',coordinator:'کارشناس',admin:'مدیر'};
const roleIcons:Record<string,string>={member:'users',clinician:'doctor',coordinator:'calendar',admin:'settings'};

export function DemoAccounts({samples,phone,busy,onChoose}:{samples:Sample[];phone:string;busy:boolean;onChoose:(phone:string)=>void}){
 return <aside className="p-card p-demo-accounts" aria-labelledby="demo-accounts-title">
  <span className="p-eyebrow">ورود سریع برای تجربهٔ نقش‌ها</span>
  <h2 id="demo-accounts-title">حساب‌های نمونه</h2>
  <p id="demo-accounts-help">یک حساب را انتخاب کنید تا شماره‌اش در فرم ورود قرار بگیرد.</p>
  <div className="p-demo-account-list">{samples.map(sample=><button type="button" key={sample.phone} className="p-demo-account" aria-pressed={phone===sample.phone} aria-describedby="demo-accounts-help" disabled={busy} onClick={()=>onChoose(sample.phone)}>
   <span className="p-demo-account-icon"><Icon name={roleIcons[sample.role]||'users'}/></span>
   <span className="p-demo-account-copy"><strong>{sample.name}</strong><bdi>{sample.phone}</bdi></span>
   <span className="p-demo-account-role"><span>{roleNames[sample.role]||sample.role}</span><span className="p-demo-account-check" aria-hidden="true" style={{visibility:phone===sample.phone?'visible':'hidden'}}><Icon name="check" size={16}/></span></span>
  </button>)}</div>
  <p className="p-demo-account-note"><Icon name="shield" size={15}/>فقط برای بررسی با اطلاعات ساختگی</p>
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
