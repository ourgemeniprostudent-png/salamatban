'use client';
import {Icon} from './brand';
import {useId,useState} from 'react';
import './value-demo.css';

export function PaidDemoInvitation({onOpen,busy=false}:{onOpen:()=>void;busy?:boolean}){
 return <section className="value-demo-invite" aria-labelledby="paid-demo-title"><div><span className="value-demo-caption"><Icon name="users" size={17}/> تجربهٔ یک عضو فرضی</span><h2 id="paid-demo-title">بعد از پرداخت، چه چیزی در اختیارم قرار می‌گیرد؟</h2><p>وارد نمونهٔ کامل شوید: جمع‌بندی پزشک، اقدام‌ها و موعدها، مدارک، هماهنگی نوبت و سابقهٔ یک سال همراهی را ببینید.</p><div className="value-demo-pills"><span><Icon name="doctor" size={16}/> برنامهٔ منتشرشده</span><span><Icon name="calendar" size={16}/> پیگیری تیم</span><span><Icon name="file" size={16}/> مدارک قابل دریافت</span></div></div><div className="value-demo-action"><button type="button" className="p-primary" disabled={busy} onClick={onOpen}><Icon name="arrow" size={20}/> مشاهدهٔ نمونهٔ کامل بعد از خرید</button><small>پرونده ساختگی است؛ بازدید رایگان، بدون پرداخت یا تغییر پرونده شما.</small></div></section>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj=Record<string,any>;
const date=(value:number)=>new Date(value).toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran',year:'numeric',month:'long',day:'numeric'});
const fa=(value:number)=>value.toLocaleString('fa-IR');
export function CareHistory({data}:{data:Obj}){
 const [selected,S]=useState<string|null>(null);
 const titleId=useId();
 const plans:Obj[]=data.plans||[];
 if(!plans.length)return null;
 const total=plans.reduce((n,p)=>n+p.actions.length,0);
 const done=plans.reduce((n,p)=>n+p.actions.filter((a:Obj)=>{const u=data.updates.filter((u:Obj)=>u.plan_id===p.id&&u.action_id===a.id).at(-1);return !!u?.done;}).length,0);
 return <section className="care-history" aria-labelledby={titleId}><div className="care-history-head"><div><span className="value-demo-caption"><Icon name="clock" size={16}/> هر قدم در پرونده می‌ماند</span><h2 id={titleId}>سابقهٔ همراهی شما</h2><p>عضویت از {date(data.memberSince)} · درصدها میزان انجام اقدام‌ها هستند، نه امتیاز سلامت.</p></div><div className="care-history-numbers"><span><b>{fa(plans.length)}</b> نسخهٔ برنامه</span><span><b>{fa(done)} / {fa(total)}</b> اقدام ثبت‌شده</span><span><b>{fa(data.files.length)}</b> مدرک</span></div></div><ol className="care-history-list">{plans.map(plan=>{
 const actions=plan.actions.map((action:Obj)=>({...action,update:data.updates.filter((u:Obj)=>u.plan_id===plan.id&&u.action_id===action.id).at(-1)}));
 const completed=actions.filter((a:Obj)=>a.update?.done).length;
 const open=selected===plan.id;
 return <li key={plan.id}><button className="care-history-period" type="button" aria-expanded={open} onClick={()=>S(open?null:plan.id)}><span className="care-history-node"><Icon name={completed===actions.length?'check':'route'} size={19}/></span><span><strong>برنامهٔ نسخه {fa(plan.version)}{plan.id===plans[0].id?' · آخرین نسخه':''}</strong><small>{date(plan.published_at)} · {plan.reviewer}</small></span><span className="care-history-progress"><b>{fa(Math.round(completed/actions.length*100))}٪</b><small>{fa(completed)} از {fa(actions.length)} اقدام</small></span><Icon name="chevron" size={18}/></button>{open&&<div className="care-history-details"><p className="p-pre">{plan.summary}</p><ul>{actions.map((action:Obj)=><li key={action.id}><Icon name={action.update?.done?'check':'clock'} size={16}/><div><strong>{action.title}</strong><p>{action.reason}</p><small>مسئول: {action.owner==='team'?'تیم هماهنگی':'عضو'} · موعد: {new Date(action.due+'T12:00:00Z').toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran'})}{action.update?.done&&` · ثبت انجام: ${date(action.update.created_at)}`}</small>{action.update?.evidence&&<p>{action.update.evidence}</p>}</div></li>)}</ul></div>}</li>;
 })}</ol></section>;
}
