'use client';
import { useEffect, useRef } from 'react';

/** Decorative generative sculpture. No health data, score, network or 3D dependency. */
export function LivingScene({paused=false,launching=false,small=false}:{paused?:boolean;launching?:boolean;small?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),clock=useRef(0);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  const ctx=el.getContext('2d');if(!ctx)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=0,width=0,height=0,visible=true,disposed=false,launchTime=0;
  const pointer={x:0,y:0};
  function project(x:number,y:number,z:number,time:number){
   const angle=time*.14+pointer.x*.18,tilt=.53+pointer.y*.12;
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
   const glow=ctx.createRadialGradient(-35,-20,4,0,0,260);glow.addColorStop(0,'rgba(74,224,207,.19)');glow.addColorStop(.5,'rgba(35,101,156,.10)');glow.addColorStop(1,'rgba(20,55,85,0)');ctx.fillStyle=glow;ctx.fillRect(-300,-300,600,600);
   // Sixty flowing filaments form an organic, dimensional halo.
   for(let band=0;band<60;band++){
    const v=band/60*Math.PI*2;
    ctx.beginPath();
    for(let i=0;i<=104;i++){
     const u=i/104*Math.PI*2,twist=v+u*.8+Math.sin(u*3+time*.35)*.16;
     const radius=154+Math.cos(twist)*49;
     const p=project(radius*Math.cos(u),radius*Math.sin(u)*1.05,Math.sin(twist)*62+Math.sin(u*2+time*.3)*17,time);
     if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }
    const gradient=ctx.createLinearGradient(-210,-170,210,180);gradient.addColorStop(0,`rgba(157,155,251,${.23+(band%5)*.025})`);gradient.addColorStop(.47,'rgba(120,241,220,.55)');gradient.addColorStop(1,'rgba(35,131,179,.14)');ctx.strokeStyle=gradient;ctx.lineWidth=band%7===0?1.3:.65;ctx.stroke();
   }
   // Satellite orbits and lights travel independently of the text.
   for(let orbit=0;orbit<3;orbit++){
    ctx.beginPath();for(let i=0;i<=110;i++){const a=i/110*Math.PI*2,p=project(Math.cos(a)*(225+orbit*16),Math.sin(a)*(195+orbit*17),Math.sin(a+orbit)*90,time*.5+orbit);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.strokeStyle='rgba(140,201,215,.13)';ctx.lineWidth=.8;ctx.stroke();
   }
   for(let i=0;i<58;i++){
    const a=i*2.39996+time*(i%2?-.09:.07),r=195+(i%7)*10,p=project(Math.cos(a)*r,Math.sin(a)*r,Math.sin(a*2+i)*65,time*.5);
    const alpha=.28+(p.z+85)/300;ctx.beginPath();ctx.arc(p.x,p.y,i%11===0?3.1:1.15,0,Math.PI*2);ctx.fillStyle=i%11===0?`rgba(245,208,143,${alpha+.2})`:`rgba(154,235,224,${alpha})`;ctx.fill();
    if(i%11===0){const light=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,13);light.addColorStop(0,'rgba(137,246,221,.35)');light.addColorStop(1,'rgba(137,246,221,0)');ctx.fillStyle=light;ctx.fillRect(p.x-13,p.y-13,26,26);}
   }
   if(launch>0){ctx.beginPath();ctx.arc(0,0,90+launch*330,0,Math.PI*2);ctx.strokeStyle=`rgba(177,255,236,${1-launch})`;ctx.lineWidth=2;ctx.stroke();}
   ctx.restore();el.dataset.motion=media.matches?'reduced':paused?'paused':visible?'running':'hidden';
  }
  function tick(stamp:number){if(disposed)return;if(stamp-last>=32){const delta=last?Math.min((stamp-last)/1000,.05):0;last=stamp;clock.current+=delta;launchTime+=delta;draw();}frame=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(frame);last=0;draw();if(!paused&&!media.matches&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  function resize(){const rect=el!.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);el!.width=Math.round(width*dpr);el!.height=Math.round(height*dpr);ctx!.setTransform(dpr,0,0,dpr,0,0);draw();}
  function move(event:PointerEvent){if(paused||media.matches)return;const rect=el!.getBoundingClientRect();pointer.x=(event.clientX-rect.left)/rect.width-.5;pointer.y=(event.clientY-rect.top)/rect.height-.5;}
  const observer=new ResizeObserver(resize);observer.observe(el);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});intersection.observe(el);
  media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);el.addEventListener('pointermove',move);resize();sync();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);el.removeEventListener('pointermove',move);};
 },[paused,launching]);
 return <div className={`living-scene ${small?'living-small':''} ${paused?'is-paused':''} ${launching?'is-launching':''}`} aria-hidden="true"><div className="living-aura"/><canvas ref={canvas}/><div className="living-core"><svg viewBox="0 0 100 120" fill="none"><defs><linearGradient id={small?'glass-small':'glass-large'} x1="10" y1="5" x2="90" y2="110" gradientUnits="userSpaceOnUse"><stop stopColor="#d8fff2" stopOpacity=".6"/><stop offset=".5" stopColor="#66dac7" stopOpacity=".14"/><stop offset="1" stopColor="#8c9cfa" stopOpacity=".5"/></linearGradient></defs><path d="M50 8 86 22v29c0 26-17 44-36 55C31 95 14 77 14 51V22Z" fill={`url(#${small?'glass-small':'glass-large'})`} stroke="#bcfff1" strokeOpacity=".75"/><path d="M30 62c11 0 12-20 21-20 8 0 9 17 21 11" stroke="#dcfff8" strokeWidth="4" strokeLinecap="round"/><path d="M53 36c0-10 7-16 17-16 0 10-6 17-17 16Z" fill="#c2ffe9"/><circle cx="30" cy="62" r="3" fill="white"/></svg></div><span className="living-spark s-one"/><span className="living-spark s-two"/></div>;
}
