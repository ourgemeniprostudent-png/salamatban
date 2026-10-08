'use client';
import {useRef,useState,useId,type CSSProperties} from 'react';
import {Icon} from './brand';

const primary=['home','plan','documents','appointments'];
export function MemberNavigation({sections,tab,onNavigate}:{sections:string[][];tab:string;onNavigate:(key:string)=>void}){
 const titleId=useId();
 const dialog=useRef<HTMLDialogElement>(null);
 const [open,setOpen]=useState(false);
 const secondary=sections.filter(([key])=>!primary.includes(key));
 const moreCurrent=secondary.some(([key])=>key===tab);
 const select=(key:string)=>{dialog.current?.close();setOpen(false);onNavigate(key);};
 const button=([key,label,icon]:string[],extra=false)=><button key={key} data-primary={primary.includes(key)||undefined} aria-label={label} aria-current={tab===key?'page':undefined} onClick={()=>extra?select(key):onNavigate(key)}><Icon name={icon} size={20}/><span className="nav-full-label">{label}</span><span className="nav-short-label">{({home:'خانه',plan:'برنامه',documents:'مدارک',appointments:'نوبت‌ها'} as Record<string,string>)[key]||label}</span></button>;
 return <><nav className="j-member-nav" style={{'--nav-count':sections.filter(([key])=>primary.includes(key)).length+Number(secondary.length>0)} as CSSProperties} aria-label="بخش‌های پرونده">{sections.map(section=>button(section))}{secondary.length>0&&<button className="mobile-more" aria-label="بخش‌های بیشتر" aria-haspopup="dialog" aria-expanded={open} aria-current={moreCurrent?'page':undefined} onClick={()=>{setOpen(true);dialog.current?.showModal();}}><Icon name="menu" size={20}/><span>بیشتر</span></button>}</nav><dialog ref={dialog} className="member-more-sheet" aria-labelledby={titleId} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)e.currentTarget.close();}}}><header><h2 id={titleId}>بخش‌های پرونده</h2><button aria-label="بستن بخش‌های بیشتر" onClick={()=>dialog.current?.close()}><Icon name="close" size={20}/></button></header>{open&&<div className="member-more-items">{secondary.map(section=>button(section,true))}</div>}</dialog></>;
}
