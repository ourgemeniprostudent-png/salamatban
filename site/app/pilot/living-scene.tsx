'use client';
import { useEffect, useId, useRef } from 'react';

/** Decorative generative sculpture. No health data, score, network or 3D dependency. */
export function LivingScene({paused=false,launching=false,small=false,surface='dark'}:{paused?:boolean;launching?:boolean;small?:boolean;surface?:'dark'|'light'}){
 const canvas=useRef<HTMLCanvasElement>(null),clock=useRef(0),gradientId=useId();
 const light=surface==='light';
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  const ctx=el.getContext('2d');if(!ctx)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=0,width=0,height=0,visible=true,disposed=false,launchTime=0;
  const pointer={x:0,y:0};
  function project(x:number,y:number,z:number,time:number){
   const angle=time*(light?.20:.14)+pointer.x*.18,tilt=.53+pointer.y*.12;
   const xx=x*Math.cos(angle)-z*Math.sin(angle),zz=x*Math.sin(angle)+z*Math.cos(angle);
   const yy=y*Math.cos(tilt)-zz*Math.sin(tilt),depth=y*Math.sin(tilt)+zz*Math.cos(tilt);
   const scale=660/(660-depth);
   return {x:xx*scale,y:yy*scale,z:depth};
  }
  function draw(){
   if(!ctx||!el||!width||!height)return;
   const time=clock.current,unit=Math.min(width,height)/570;
   const launch=launching&&!media.matches&&!paused?Math.min(1,launchTime/.65):0;
   ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(width/2,height/2);ctx.scale(unit*(1+launch*.58),unit*(1+launch*.58));
   const glow=ctx.createRadialGradient(-35,-20,4,0,0,260);glow.addColorStop(0,light?'rgba(82,144,245,.12)':'rgba(85,156,255,.19)');glow.addColorStop(.5,light?'rgba(116,168,248,.06)':'rgba(40,91,175,.10)');glow.addColorStop(1,'rgba(52,110,209,0)');ctx.fillStyle=glow;ctx.fillRect(-300,-300,600,600);
   // Sixty flowing filaments form an organic, dimensional halo.
   for(let band=0;band<60;band++){
    const v=band/60*Math.PI*2;
    ctx.beginPath();
    for(let i=0;i<=104;i++){
     const u=i/104*Math.PI*2,twist=v+u*.8+Math.sin(u*3+time*(light?.55:.35))*.16;
     const radius=154+Math.cos(twist)*49;
     const p=project(radius*Math.cos(u),radius*Math.sin(u)*1.05,Math.sin(twist)*62+Math.sin(u*2+time*.3)*17,time);
     if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }
    const gradient=ctx.createLinearGradient(-210,-170,210,180);gradient.addColorStop(0,light?`rgba(36,96,194,${.22+(band%5)*.025})`:`rgba(135,165,255,${.23+(band%5)*.025})`);gradient.addColorStop(.47,light?'rgba(65,132,235,.50)':'rgba(160,207,255,.55)');gradient.addColorStop(1,light?'rgba(31,83,181,.16)':'rgba(52,110,209,.14)');ctx.strokeStyle=gradient;ctx.lineWidth=band%7===0?1.3:.65;ctx.stroke();
   }
   // Satellite orbits and lights travel independently of the text.
   for(let orbit=0;orbit<3;orbit++){
    ctx.beginPath();for(let i=0;i<=110;i++){const a=i/110*Math.PI*2,p=project(Math.cos(a)*(225+orbit*16),Math.sin(a)*(195+orbit*17),Math.sin(a+orbit)*90,time*.5+orbit);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.strokeStyle=light?'rgba(52,110,209,.16)':'rgba(139,185,244,.13)';ctx.lineWidth=.8;ctx.stroke();
   }
   for(let i=0;i<58;i++){
    const a=i*2.39996+time*(i%2?-.12:.10),r=195+(i%7)*10,p=project(Math.cos(a)*r,Math.sin(a)*r,Math.sin(a*2+i)*65,time*.5);
    const alpha=.28+(p.z+85)/300;ctx.beginPath();ctx.arc(p.x,p.y,i%11===0?3.1:1.15,0,Math.PI*2);ctx.fillStyle=light?(i%11===0?`rgba(43,102,206,${alpha+.2})`:`rgba(71,132,226,${alpha})`):(i%11===0?`rgba(204,227,255,${alpha+.2})`:`rgba(155,203,255,${alpha})`);ctx.fill();
    if(i%11===0){const light=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,13);light.addColorStop(0,'rgba(100,162,248,.30)');light.addColorStop(1,'rgba(100,162,248,0)');ctx.fillStyle=light;ctx.fillRect(p.x-13,p.y-13,26,26);}
   }
   if(launch>0){ctx.beginPath();ctx.arc(0,0,90+launch*330,0,Math.PI*2);ctx.strokeStyle=`rgba(177,211,255,${1-launch})`;ctx.lineWidth=2;ctx.stroke();}
   ctx.restore();const state=media.matches?'reduced':paused?'paused':visible&&!document.hidden?'running':'hidden';el.dataset.motion=state;if(el.parentElement)el.parentElement.dataset.motion=state;
  }
  function tick(stamp:number){if(disposed)return;if(stamp-last>=32){const delta=last?Math.min((stamp-last)/1000,.05):0;last=stamp;clock.current+=delta;launchTime+=delta;draw();}frame=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(frame);last=0;draw();if(!paused&&!media.matches&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  function resize(){const rect=el!.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);el!.width=Math.round(width*dpr);el!.height=Math.round(height*dpr);ctx!.setTransform(dpr,0,0,dpr,0,0);draw();}
  function move(event:PointerEvent){if(paused||media.matches)return;const rect=el!.getBoundingClientRect();pointer.x=(event.clientX-rect.left)/rect.width-.5;pointer.y=(event.clientY-rect.top)/rect.height-.5;}
  const observer=new ResizeObserver(resize);observer.observe(el);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});intersection.observe(el);
  media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);el.addEventListener('pointermove',move);resize();sync();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);el.removeEventListener('pointermove',move);};
 },[paused,launching,light]);
 return <div className={`living-scene living-${surface} ${small?'living-small':''} ${paused?'is-paused':''} ${launching?'is-launching':''}`} aria-hidden="true"><div className="living-aura"/><canvas ref={canvas}/><div className="living-core"><svg viewBox="0 0 100 120" fill="none"><defs><linearGradient id={gradientId} x1="10" y1="5" x2="90" y2="110" gradientUnits="userSpaceOnUse"><stop stopColor={light?'#9fc6ff':'#dce7fb'} stopOpacity={light?'.95':'.6'}/><stop offset=".5" stopColor={light?'#407edd':'#6691da'} stopOpacity={light?'.9':'.14'}/><stop offset="1" stopColor={light?'#2459b9':'#8c9cfa'} stopOpacity={light?'1':'.5'}/></linearGradient></defs><path d="M50 8 86 22v29c0 26-17 44-36 55C31 95 14 77 14 51V22Z" fill={`url(#${gradientId})`} stroke={light?'#346ed1':'#c3d6f8'} strokeOpacity={light?'.65':'.75'}/><path d="M30 62c11 0 12-20 21-20 8 0 9 17 21 11" stroke={light?'#fff':'#e0eafc'} strokeWidth="4" strokeLinecap="round"/><path d="M53 36c0-10 7-16 17-16 0 10-6 17-17 16Z" fill={light?'#e4efff':'#c8daf9'}/><circle cx="30" cy="62" r="3" fill="white"/></svg></div><span className="living-spark s-one"/><span className="living-spark s-two"/></div>;
}

/** Keep motion optional without replacing the artwork with a static image. */
export function SceneMotionControl({paused,onChange,className=''}:{paused:boolean;onChange:(value:boolean)=>void;className?:string}){
 return <button type="button" className={`scene-motion ${className}`} aria-pressed={paused} aria-label={paused?'پخش حرکت گرافیکی':'توقف حرکت گرافیکی'} onClick={()=>onChange(!paused)}><svg viewBox="0 0 20 20" aria-hidden="true">{paused?<path d="m6 3 10 7-10 7Z" fill="currentColor"/>:<path d="M7 4v12m6-12v12" stroke="currentColor" strokeWidth="2"/>}</svg><span>{paused?'پخش حرکت':'توقف حرکت'}</span></button>;
}
