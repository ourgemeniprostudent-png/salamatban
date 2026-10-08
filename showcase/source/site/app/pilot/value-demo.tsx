'use client';
import {Icon} from './brand';
import {useId,useState} from 'react';
import './value-demo.css';
import './value-visual.css';
import {ServiceGlyph} from './value-art';

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

/** Live, compact workspace: actual outputs first, with details one click away. */
export function PaidExperienceOverview({data,profile,onNavigate,readOnly=false}:{data:Obj;profile:Obj;onNavigate:(section:string)=>void;readOnly?:boolean}){
 const [paused,setPaused]=useState(false);
 const plans:Obj[]=data.plans||[],plan=plans[0];
 if(!plan)return null;
 const actions:Obj[]=plan.actions.map((a:Obj)=>({...a,done:!!data.updates.filter((u:Obj)=>u.plan_id===plan.id&&u.action_id===a.id).at(-1)?.done}));
 const done=actions.filter(a=>a.done).length,percent=actions.length?Math.round(done/actions.length*100):0;
 const next=actions.find(a=>!a.done);
 const tasks:Obj[]=data.tasks||[],active=tasks.filter(t=>!['completed','cancelled'].includes(t.status));
 const files:Obj[]=data.files||[];
 return <div className={`cv-overview care-published pd-dashboard ${paused?'cv-paused':''}`}>
  <header className="pd-heading"><div><span className="cv-eyebrow"><Icon name="shield" size={15}/>{[profile.firstName,profile.lastName].filter(Boolean).join(' ')}</span><h1>پروندهٔ سلامت من</h1></div><div className="pd-heading-end"><span className="pd-status"><Icon name="check" size={15}/> برنامهٔ پزشک منتشر شده</span><button className="cv-motion" aria-pressed={paused} onClick={()=>setPaused(!paused)}><Icon name={paused?'play':'pause'} size={14}/>{paused?'ادامهٔ حرکت':'توقف حرکت'}</button></div></header>
  <section className="pd-tiles" aria-label="بخش‌های پرونده">
   {([{kind:'doctor',title:'برنامهٔ پیگیری',count:fa(actions.length)+' اقدام',meta:fa(done)+' انجام‌شده',destination:'plan'},
   {kind:'file',title:'مدارک پزشکی',count:fa(files.length)+' مدرک',meta:'مشاهده و دریافت',destination:'documents'},
   {kind:'calendar',title:'نوبت‌ها و هماهنگی',count:fa(active.length)+' پیگیری باز',meta:fa(tasks.length)+' درخواست ثبت‌شده',destination:'appointments'}] as const).map(item=><button className="pd-tile" key={item.kind} onClick={()=>onNavigate(item.destination)}><ServiceGlyph kind={item.kind}/><span><strong>{item.title}</strong><b>{item.count}</b><small>{item.meta}</small></span><Icon name="arrow" size={18}/></button>)}
  </section>
  <div className="pd-workspace"><section className="pd-panel pd-program"><div className="pd-panel-head"><span className="cv-icon-disc"><Icon name="route" size={22}/></span><div><h2>برنامهٔ جاری</h2><small>نسخه {fa(plan.version)} · {plan.reviewer}</small></div><button className="p-link" onClick={()=>onNavigate('plan')}>برنامهٔ کامل<Icon name="arrow" size={16}/></button></div><div className="pd-program-focus"><div><span className="pd-caption">{next?'قدم بعدی':'دورهٔ کامل‌شده'}</span><h3>{next?.title||'همهٔ اقدام‌های این دوره ثبت شده‌اند.'}</h3><p>{next?.reason||profile.goal}</p>{next&&<span className="pd-due"><Icon name="calendar" size={15}/>{new Date(next.due+'T12:00:00Z').toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran'})} · {next.owner==='team'?'تیم هماهنگی':'اقدام شما'}</span>}</div><div className="cv-completion-ring"><svg viewBox="0 0 120 120" role="img" aria-label={`${fa(percent)} درصد از اقدام‌های برنامهٔ جاری انجام شده`}><circle cx="60" cy="60" r="50" fill="none" stroke="#e7f0ff" strokeWidth="9"/><circle cx="60" cy="60" r="50" fill="none" stroke="#3475df" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${percent*3.14159} 314.159`} transform="rotate(-90 60 60)"/></svg><span><b>{fa(percent)}٪</b><small>{fa(done)} از {fa(actions.length)} اقدام</small></span></div></div><ol className="pd-action-preview">{actions.slice(0,2).map(a=><li key={a.id}><span className={`pd-action-node ${a.done?'is-done':''}`}><Icon name={a.done?'check':'clock'} size={16}/></span><strong>{a.title}</strong><small>{a.done?'انجام شده':a.owner==='team'?'با تیم هماهنگی':'در برنامهٔ شما'}</small></li>)}</ol><small className="pd-measure-note">درصد، میزان انجام اقدام‌هاست؛ امتیاز سلامت نیست.</small></section>
   <section className="pd-panel pd-records"><div className="pd-panel-head"><span className="cv-icon-disc"><Icon name="file" size={22}/></span><div><h2>مدارک پرونده</h2><small>{fa(files.length)} مدرک ثبت‌شده</small></div></div><div className="pd-record-stack"><ServiceGlyph kind="file"/><span>آزمایش‌ها و گزارش‌های شما</span></div><ul className="pd-file-preview">{files.slice(0,2).map(f=><li key={f.id}><Icon name="file" size={17}/><span>{f.name}</span><small>{/\.pdf$/i.test(f.name)?'PDF':'تصویر'}</small></li>)}</ul><button className="p-secondary pd-open-records" onClick={()=>onNavigate('documents')}>مشاهده و دریافت مدارک<Icon name="arrow" size={17}/></button></section>
  </div>
  <section className="pd-panel pd-coordination"><div className="pd-panel-head"><span className="cv-icon-disc"><Icon name="calendar" size={22}/></span><div><h2>نوبت‌ها و پیگیری‌ها</h2><small>{fa(active.length)} پیگیری باز · {fa(tasks.filter(t=>t.status==='completed').length)} انجام‌شده</small></div><button className="p-link" onClick={()=>onNavigate('appointments')}>همهٔ جزئیات<Icon name="arrow" size={16}/></button></div><div className="pd-task-preview">{(active.length?active:tasks).slice(0,2).map(t=><button key={t.id} onClick={()=>onNavigate('appointments')}><span className="pd-task-symbol"><Icon name="calendar" size={22}/></span><span><strong>{t.title}</strong><small>{t.provider||'مرکز هنوز تعیین نشده'}</small>{t.scheduled_at&&<small>{t.scheduled_at}</small>}</span><span className="pd-status">{appointmentStatus[t.status]||'در حال بررسی'}</span><Icon name="chevron" size={16}/></button>)}{!tasks.length&&<div className="pd-task-empty"><Icon name="calendar" size={26}/><p>هنوز درخواست هماهنگی ثبت نشده است.</p><button className="p-link" onClick={()=>onNavigate('appointments')}>{readOnly?'مشاهدهٔ بخش نوبت‌ها':'ثبت درخواست هماهنگی'}</button></div>}</div></section>
  <footer className="pd-history-link"><span><Icon name="clock" size={18}/>{fa(plans.length)} نسخهٔ برنامه · همراهی از {date(data.memberSince)}</span><button className="p-link" onClick={()=>onNavigate('plan')}>سابقهٔ برنامه‌ها<Icon name="arrow" size={16}/></button>{!readOnly&&<button className="p-link" onClick={()=>onNavigate('support')}>کمک می‌خواهم</button>}</footer>
 </div>;
}
const appointmentStatus:Record<string,string>={requested:'درخواست ثبت شده',contacted:'در حال هماهنگی',confirmed:'نوبت تأیید شده',completed:'انجام شده',cancelled:'لغو شده'};
export function AppointmentCards({tasks}:{tasks:Obj[]}){
 const steps=['requested','contacted','confirmed','completed'];
 return <section className="pd-appointments-list" aria-label="درخواست‌های هماهنگی">{tasks.map(t=>{
 const current=steps.indexOf(t.status);
 return <article className="p-task pd-appointment" key={t.id}><header><span className="pd-task-symbol"><Icon name="calendar" size={25}/></span><div><h3>{t.title}</h3><small>{t.plan_id?'ارجاع پزشک به تیم هماهنگی':'درخواست شما'}</small></div><span className={`p-tag ${t.status}`}>{appointmentStatus[t.status]||'در حال بررسی'}</span></header>{current>=0&&<ol className="pd-booking-steps" aria-label="مراحل هماهنگی">{steps.map((step,i)=><li key={step} className={i<=current?'is-reached':''} aria-current={i===current?'step':undefined}><span>{i<current?<Icon name="check" size={13}/>:fa(i+1)}</span>{['ثبت درخواست','هماهنگی مرکز','تأیید نوبت','انجام مراجعه'][i]}</li>)}</ol>}<dl className="pd-booking-info"><div><dt><Icon name="home" size={15}/> مرکز</dt><dd>{t.provider||'پس از هماهنگی مشخص می‌شود'}</dd></div><div><dt><Icon name="calendar" size={15}/> زمان نوبت</dt><dd>{t.scheduled_at||'هنوز تعیین نشده'}</dd></div>{t.reference&&<div><dt><Icon name="check" size={15}/> کد تأیید</dt><dd><bdi>{t.reference}</bdi></dd></div>}</dl>{t.note&&<p className="pd-booking-note">{t.note}</p>}{t.address&&<p>آدرس تأییدشده: {t.address} · {t.unit} · {t.entrance}{t.latitude&&<bdi> ({t.latitude}, {t.longitude})</bdi>}</p>}</article>;
 })}{!tasks.length&&<div className="pd-task-empty"><ServiceGlyph kind="calendar"/><h3>هنوز نوبتی در این پرونده نیست.</h3><p>درخواست شما پس از هماهنگی با مرکز و ثبت تأیید، به نوبت تبدیل می‌شود.</p></div>}</section>;
}
