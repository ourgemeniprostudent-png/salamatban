'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
export function ProfileConversation({fields,validationAttempt}:{validationAttempt:number;fields:{id:string;title:string;content:ReactNode;valid:boolean}[]}){
  const [state,setState]=useState({index:0,attempt:validationAttempt}),[error,setError]=useState(false);
  if(state.attempt!==validationAttempt)setState({index:Math.max(0,fields.findIndex(f=>!f.valid)),attempt:validationAttempt});
  const index=state.index;const setIndex=(index:number)=>setState({index,attempt:validationAttempt});
  const ref=useRef<HTMLDivElement>(null),field=fields[index];
  useEffect(()=>{ref.current?.focus({preventScroll:true});},[index]);
  return <div className="j-profile" ref={ref} tabIndex={-1}><div className="j-profile-dots" aria-label={`مشخصات، سؤال ${index+1} از ${fields.length}`}>{fields.map((f,i)=><button key={f.id} aria-label={f.title} aria-current={i===index?'step':undefined} onClick={()=>{setError(false);setIndex(i);}} className={i===index?'current':f.valid?'complete':''}>{(i+1).toLocaleString('fa-IR')}</button>)}</div><div key={field.id} className="j-scene"><h3>{field.title}</h3>{field.content}{error&&<p className="ux-error" role="alert">این بخش را کامل کنید تا ادامه دهیم.</p>}</div><div className="j-controls">{index>0?<button className="p-secondary" onClick={()=>{setError(false);setIndex(index-1);}}>مشخصهٔ قبلی</button>:<span/>}{index<fields.length-1?<button className="p-primary" onClick={()=>{if(!field.valid){setError(true);return;}setError(false);setIndex(index+1);}}>مشخصهٔ بعدی</button>:<p className="j-note">مشخصات آماده است؛ با دکمهٔ زیر به مرحلهٔ بعد بروید.</p>}</div></div>;
}
