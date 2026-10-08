'use client';
import { useEffect, useRef, useState } from 'react';
import { LivingScene } from './living-scene';
import { Icon } from './brand';
import './arrival.css';
export function Arrival({onStart}:{onStart:()=>void}){
 const [paused,P]=useState(false),[launching,L]=useState(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function start(){if(launching)return;if(paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches){onStart();return;}L(true);timer.current=setTimeout(onStart,650);}
 return <section className={`arrival ${launching?'arrival-launching':''}`} aria-label="شروع مسیر سلامت"><div className="arrival-grain"/><div className="arrival-copy"><span className="arrival-eyebrow"><i/> سلامت‌بان، همراهِ شما</span><h1>یک شروع تازه.<br/><span>برای حالِ بهترِ شما.</span></h1><p>از چیزی که برای شما مهم است شروع کنیم.<br/>قدم بعدی را با هم پیدا می‌کنیم.</p><button className="arrival-start" disabled={launching} onClick={start}><span>{launching?'بریم شروع کنیم…':'شروع آشنایی'}</span><span className="arrival-arrow"><Icon name="arrow" size={23}/></span></button><div className="arrival-footnote"><span className="arrival-mini-mark"><Icon name="doctor" size={17}/></span>با همراهی پزشک، به زبان خودتان</div></div><div className="arrival-visual"><LivingScene paused={paused} launching={launching}/><div className="arrival-caption"><span/>هر مسیر، از خودِ شما شروع می‌شود</div><button className="arrival-motion" aria-pressed={paused} onClick={()=>P(!paused)} aria-label={paused?'پخش حرکت گرافیکی':'توقف حرکت گرافیکی'}><svg viewBox="0 0 20 20" aria-hidden="true">{paused?<path d="m6 3 10 7-10 7Z" fill="currentColor"/>:<path d="M7 4v12m6-12v12" stroke="currentColor" strokeWidth="2"/>}</svg>{paused?'پخش حرکت':'توقف حرکت'}</button></div><div className="arrival-bottom"><span>شما و دغدغه‌تان</span><i/><span>شناخت بهتر</span><i/><span>قدم بعدی</span></div></section>;
}
