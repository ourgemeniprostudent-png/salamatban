'use client';
import {Icon} from './brand';
import {useId,useState} from 'react';
import './value-demo.css';
import './value-visual.css';
import {CareJourneyArt,ServiceGlyph} from './value-art';

export function PaidDemoInvitation({onOpen,busy=false}:{onOpen:()=>void;busy?:boolean}){
 return <section className="value-demo-invite" aria-labelledby="paid-demo-title"><div className="cv-invite-art" aria-hidden="true"><ServiceGlyph kind="doctor"/><span className="cv-invite-mini"><Icon name="check" size={23}/></span></div><div><span className="value-demo-caption"><Icon name="users" size={17}/> تجربهٔ یک عضو فرضی</span><h2 id="paid-demo-title">بعد از پرداخت، چه چیزی در اختیارم قرار می‌گیرد؟</h2><p>وارد نمونهٔ کامل شوید: جمع‌بندی پزشک، اقدام‌ها و موعدها، مدارک، هماهنگی نوبت و سابقهٔ یک سال همراهی را ببینید.</p><div className="value-demo-pills"><span><Icon name="doctor" size={16}/> برنامهٔ منتشرشده</span><span><Icon name="calendar" size={16}/> پیگیری تیم</span><span><Icon name="file" size={16}/> مدارک قابل دریافت</span></div></div><div className="value-demo-action"><button type="button" className="p-primary" disabled={busy} onClick={onOpen}><Icon name="arrow" size={20}/> مشاهدهٔ نمونهٔ کامل بعد از خرید</button><small>پرونده ساختگی است؛ بازدید رایگان، بدون پرداخت یا تغییر پرونده شما.</small></div></section>;
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

/** The output of the service, presented as a navigable care workspace. */
export function PaidExperienceOverview({data,profile,onNavigate,readOnly=false}:{data:Obj;profile:Obj;onNavigate:(section:string)=>void;readOnly?:boolean}){
 const [paused,setPaused]=useState(false);
 const id=useId();
 const plans:Obj[]=data.plans||[],plan=plans[0];
 if(!plan)return null;
 const progress=plans.slice().reverse().map(p=>{
  const done=p.actions.filter((a:Obj)=>data.updates.filter((u:Obj)=>u.plan_id===p.id&&u.action_id===a.id).at(-1)?.done).length;
  return {plan:p,done,total:p.actions.length,percent:Math.round(done/p.actions.length*100)};
 });
 const current=progress.at(-1)!,allDone=progress.reduce((sum,p)=>sum+p.done,0);
 const next=plan.actions.find((a:Obj)=>!data.updates.filter((u:Obj)=>u.plan_id===plan.id&&u.action_id===a.id).at(-1)?.done);
 const activeTask=data.tasks.find((t:Obj)=>!['completed','cancelled'].includes(t.status));
 const taskNames:Record<string,string>={requested:'درخواست ثبت شده',contacted:'در حال هماهنگی',confirmed:'نوبت تأیید شده',completed:'انجام شده',cancelled:'لغو شده'};
 return <div className={`cv-overview care-published ${paused?'cv-paused':''}`}>
  <section className="cv-hero"><div className="cv-hero-copy"><span className="cv-eyebrow"><Icon name="shield" size={16}/> از شناخت شما، تا همراهی در عمل</span><h1>{profile.firstName||'دوست عزیز'}،<br/>مسیرت <em>روشن‌تر شده.</em></h1><p>برنامهٔ پزشک، مدارک و پیگیری‌هایت، همه کنار هم. می‌دانی قدم بعد چیست، چه کسی همراه توست و تا اینجا چه کارهایی انجام داده‌ای.</p><div className="cv-personal-goal"><span><Icon name="heart" size={20}/></span><div><small>مسیری که برای خودت انتخاب کردی</small><strong>{profile.goal||'پیگیری آگاهانهٔ مراقبت‌هایم'}</strong></div></div><button className="p-primary cv-hero-cta" onClick={()=>onNavigate('plan')}>دیدن برنامه و قدم‌های من<Icon name="arrow" size={19}/></button><small className="cv-hero-meta"><Icon name="doctor" size={15}/>{plan.reviewer} · آخرین برنامه: {date(plan.published_at)}</small></div><div className="cv-hero-visual"><CareJourneyArt/><button className="cv-motion" aria-pressed={paused} onClick={()=>setPaused(!paused)}><Icon name={paused?'play':'pause'} size={14}/>{paused?'ادامهٔ حرکت':'توقف حرکت'}</button></div></section>
  <div className="cv-stat-strip" aria-label="آمار ثبت‌شدهٔ همین پرونده"><div><Icon name="route"/><b>{fa(plans.length)}</b><span>نسخهٔ برنامهٔ شخصی</span></div><div><Icon name="check"/><b>{fa(allDone)}</b><span>اقدام انجام‌شده</span></div><div><Icon name="file"/><b>{fa(data.files.length)}</b><span>مدرک در پرونده</span></div><div><Icon name="clock"/><span>آغاز همراهی<strong>{date(data.memberSince)}</strong></span></div></div>
  <section className="cv-services" aria-label="خروجی‌های همراهی سلامت‌بان">
   {([{kind:'doctor',title:'نظر پزشک، برای شرایط تو',text:'جمع‌بندی پرونده و دلیل هر قدم؛ با نام پزشک و تاریخ بررسی.',label:'جمع‌بندی و برنامه',destination:'plan'},
   {kind:'file',title:'پرونده‌ای که همیشه همراهته',text:'مدارک و گزارش‌ها کنار هم؛ قابل مشاهده و دریافت، هر وقت لازم داری.',label:'دیدن مدارک من',destination:'documents'},
   {kind:'calendar',title:'پیگیری با یک تیم همراه',text:'وضعیت درخواست، هماهنگی مرکز و زمان نوبت، در یک جای مشخص.',label:'دیدن هماهنگی‌ها',destination:'appointments'}] as const).map(service=><button className="cv-service" key={service.kind} onClick={()=>onNavigate(service.destination)}><ServiceGlyph kind={service.kind}/><span className="cv-service-copy"><strong>{service.title}</strong><span>{service.text}</span><em>{service.label}<Icon name="arrow" size={16}/></em></span></button>)}
  </section>
  <section className="cv-workbench" aria-label="قدم بعد و وضعیت انجام برنامه"><article className="cv-next"><div className="cv-card-heading"><span className="cv-icon-disc"><Icon name="route" size={22}/></span><span><small>هر بار بدانی از کجا ادامه بدهی</small><h2>{next?'قدم بعدی تو':activeTask?'قدم بعد با تیم هماهنگی':'این دوره را به پایان رساندی'}</h2></span><span className="cv-tiny-tag">{next?'برنامهٔ جاری':activeTask?'در حال پیگیری':'اقدام‌ها ثبت شده'}</span></div><h3>{next?.title||activeTask?.title||'گزارش اقدام‌هایت، آمادهٔ مرور است.'}</h3><p>{next?.reason||(activeTask?'وضعیت هماهنگی را ببین؛ نتیجه و زمان، پس از ثبت تیم مشخص می‌شود.':'گزارش انجام این دوره ثبت شده است؛ قدم بعدی مراقبت را مطابق برنامهٔ پزشک دنبال کن.')}</p><div className="cv-next-foot"><span><Icon name={next?.owner==='team'?'users':'user'} size={16}/>{next?`مسئول: ${next.owner==='team'?'تیم هماهنگی':'خودت'}`:activeTask?taskNames[activeTask.status]:'مرور با نظر پزشک'}</span>{next&&<span><Icon name="calendar" size={16}/>{new Date(next.due+'T12:00:00Z').toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran'})}</span>}<button className="p-link" onClick={()=>onNavigate(next?'plan':activeTask?'appointments':'plan')}>مشاهدهٔ جزئیات<Icon name="arrow" size={15}/></button></div></article>
   <article className="cv-progress-card"><div className="cv-card-heading"><span className="cv-icon-disc"><Icon name="chart" size={22}/></span><span><small>پیشرفت قابل مشاهده</small><h2>قدم‌هایت روی مسیر می‌مانند.</h2></span></div><div className="cv-progress-content"><div className="cv-completion-ring"><svg viewBox="0 0 120 120" role="img" aria-label={`${fa(current.percent)} درصد از اقدام‌های برنامهٔ جاری انجام شده`}><circle cx="60" cy="60" r="50" fill="none" stroke="#e7f0ff" strokeWidth="9"/><circle cx="60" cy="60" r="50" fill="none" stroke="#3475df" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${current.percent*3.14159} 314.159`} transform="rotate(-90 60 60)"/></svg><span><b>{fa(current.percent)}٪</b><small>دورهٔ جاری</small></span></div><div className="cv-period-chart"><strong>{fa(current.done)} از {fa(current.total)} اقدام انجام شده</strong><div className="cv-chart-bars" aria-label="میزان انجام اقدام‌ها در نسخه‌های برنامه">{progress.map(p=><div key={p.plan.id}><span className="cv-bar-track"><span style={{height:`${Math.max(p.percent,3)}%`}}/></span><small>نسخه {fa(p.plan.version)}</small></div>)}</div><p>این درصد، انجام اقدام‌هاست؛ امتیاز سلامت نیست.</p></div></div></article>
  </section>
  <section className="cv-review-strip" aria-labelledby={`cv-review-${id}`}><span className="cv-review-avatar"><Icon name="doctor" size={26}/></span><div><small>{plan.reviewer} · نسخه {fa(plan.version)}</small><h2 id={`cv-review-${id}`}>جمع‌بندی‌ای که به خودت مربوط است.</h2><p className="p-pre">{plan.summary}</p></div><button className="p-secondary" onClick={()=>onNavigate('plan')}>برنامهٔ کامل<Icon name="arrow" size={17}/></button></section>
  {!readOnly&&<div className="cv-help"><button className="p-link" onClick={()=>onNavigate('support')}><Icon name="help" size={17}/> برای ادامه، کمک می‌خواهم</button></div>}
 </div>;
}
