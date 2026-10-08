'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from './brand';
import type {DemoAccountStory} from '@/lib/pilot/demo-account-summary';
import './demo-account-peek.css';
export type DemoSample={phone:string;name:string;role:string;story?:DemoAccountStory};
let dismissActivePeek:(()=>void)|undefined;
const fa=(value:number)=>value.toLocaleString('fa-IR');
export function demoTenure(days:number){if(days===0)return 'امروز';if(days<30)return `${fa(days)} روز`;const years=Math.floor(days/365),rest=days%365,months=Math.floor(rest/30),remainder=rest%30;return [years&&`${fa(years)} سال`,months&&`${fa(months)} ماه`,remainder&&`${fa(remainder)} روز`].filter(Boolean).join(' و ');}
function StoryCard({sample,id,anchor,onEnter,onLeave}:{sample:DemoSample;id:string;anchor:HTMLElement;onEnter:()=>void;onLeave:()=>void}){
 const ref=useRef<HTMLDivElement>(null),[position,setPosition]=useState({left:12,top:12,ready:false});
 useLayoutEffect(()=>{const place=()=>{const rect=anchor.getBoundingClientRect(),card=ref.current;if(!card)return;const width=card.offsetWidth,height=card.offsetHeight,left=Math.max(12,Math.min(innerWidth-width-12,rect.left+rect.width/2-width/2));const above=rect.top-height-12,below=rect.bottom+12;setPosition({left,top:Math.max(12,Math.min(innerHeight-height-12,above>=12?above:below)),ready:true});};place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};},[anchor,sample]);
 const story=sample.story!;const progress=story.progressPercent;
 return createPortal(<div ref={ref} id={id} role="tooltip" className="account-peek" data-phone={sample.phone} data-kind={story.kind} style={{left:position.left,top:position.top,visibility:position.ready?'visible':'hidden'}} onMouseEnter={onEnter} onMouseLeave={onLeave} dir="rtl">
  <header><span className="account-peek-avatar"><Icon name={sample.role==='member'?'users':sample.role==='clinician'?'doctor':sample.role==='coordinator'?'calendar':'settings'} size={23}/></span><div><strong>{sample.name}</strong><small>{story.status}</small></div><span className="account-peek-demo">نمونه</span></header>
  <div className="account-peek-main"><div className="account-peek-ring" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" className="account-peek-track"/>{story.kind==='member'&&progress!==null&&progress!==undefined?<circle cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${progress} 100`} className="account-peek-progress"/>:null}</svg><span>{story.kind==='member'?progress===null?'—':`${fa(progress||0)}٪`:<Icon name={sample.role==='clinician'?'doctor':sample.role==='coordinator'?'calendar':'settings'} size={28}/>}</span></div><div><span className="account-peek-label">{story.kind==='member'?'پیشرفت برنامهٔ فعلی':'نقش در تیم'}</span><b>{story.kind==='member'?progress===null?'هنوز برنامه ندارد':progress===100?'تمام قدم‌ها ثبت شده':`${fa(progress||0)}٪ اقدام‌ها انجام شده`:sample.role==='clinician'?'بررسی و برنامه‌ریزی':sample.role==='coordinator'?'هماهنگی و پیگیری':'مدیریت دسترسی‌ها'}</b><small><Icon name="clock" size={13}/>{story.kind==='member'?'همراهی':'حضور در سناریو'}: {demoTenure(story.days)}</small></div></div>
  {story.recordPercent!==undefined&&<div className="account-peek-registration"><div><span>تکمیل ثبت پرونده</span><b>{fa(story.recordPercent)}٪</b></div><span className="account-peek-bar"><i style={{width:`${story.recordPercent}%`}}/></span></div>}
  <div className="account-peek-metrics">{story.metrics.map(metric=><div key={metric.label}><strong>{fa(metric.value)}</strong><span>{metric.label}</span></div>)}</div>
  <p>{story.description}</p>
 </div>,document.body);
}
/** Hover/focus is transient; the separate info control works with touch without changing login selection. */
export function DemoAccountPeek({sample,className='',children}:{sample?:DemoSample;className?:string;children:(descriptionId?:string)=>ReactNode}){
 const id=useId(),root=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),hovered=useRef(false),[open,setOpen]=useState(false),[anchor,setAnchor]=useState<HTMLElement|null>(null);
 function cancel(){if(timer.current)clearTimeout(timer.current);timer.current=null;}
 function show(){cancel();if(sample?.story){setAnchor(root.current);setOpen(true);}}
 function hideSoon(){cancel();timer.current=setTimeout(()=>{if(!hovered.current&&!root.current?.contains(document.activeElement))setOpen(false);},160);}
 useEffect(()=>{if(!open)return;dismissActivePeek?.();const dismiss=()=>setOpen(false);dismissActivePeek=dismiss;return()=>{if(dismissActivePeek===dismiss)dismissActivePeek=undefined;};},[open]);
 useEffect(()=>{if(!open)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);cancel();}};const outside=(event:PointerEvent)=>{const target=event.target as Node;if(!root.current?.contains(target)&&!document.getElementById(id)?.contains(target)){setOpen(false);cancel();}};document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);};},[open,id]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 return <div ref={root} className={`account-peek-anchor ${className}`} onPointerEnter={event=>{if(event.pointerType==='mouse'){hovered.current=true;show();}}} onPointerLeave={event=>{if(event.pointerType==='mouse'){hovered.current=false;hideSoon();}}} onClickCapture={event=>{if(!(event.target as HTMLElement).closest('.account-peek-info')){cancel();hovered.current=false;setOpen(false);}}} onFocusCapture={event=>{if((event.target as HTMLElement).matches(':focus-visible'))show();}} onBlurCapture={hideSoon}>
  {children(open?id:undefined)}
  {sample?.story&&<button type="button" className="account-peek-info" aria-label={`دربارهٔ ${sample.name}`} aria-expanded={open} aria-controls={open?id:undefined} aria-describedby={open?id:undefined} onClick={()=>{cancel();setAnchor(root.current);setOpen(value=>!value);}}><Icon name="help" size={17}/></button>}
  {open&&sample?.story&&anchor&&<StoryCard sample={sample} id={id} anchor={anchor} onEnter={()=>{hovered.current=true;cancel();}} onLeave={()=>{hovered.current=false;hideSoon();}}/>}
 </div>;
}
