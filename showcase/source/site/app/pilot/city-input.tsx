'use client';
import { useId, useRef, useState } from 'react';
import { cities, normalizeSearch, searchCities, type City } from '../../lib/data/cities';
import './controls-stability.css';
import './city-input.css';

const cityKey=(city:City)=>city.provinceId+':'+normalizeSearch(city.name).replace(/ /g,'');
const namesWithinProvince=new Map<string,number>();
for(const city of cities)namesWithinProvince.set(cityKey(city),(namesWithinProvince.get(cityKey(city))||0)+1);

export function CityInput({value,onChange,error}:{value:string;onChange:(value:string,city?:City)=>void;error?:string}) {
 const id=useId(),input=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const suggestions=searchCities(value,{limit:13}),matches=suggestions.slice(0,12);
 const choose=(city:City)=>{onChange(city.name,city);setOpen(false);setActive(-1);};
 function move(next:number){
  setOpen(true);setActive(next);
  // Scroll only the popup, so navigating results cannot shift the intake page.
  const option=list.current?.children[next] as HTMLElement|undefined;
  if(option&&list.current){
   const top=option.offsetTop,bottom=top+option.offsetHeight;
   if(top<list.current.scrollTop)list.current.scrollTop=top;
   else if(bottom>list.current.scrollTop+list.current.clientHeight)list.current.scrollTop=bottom-list.current.clientHeight;
  }
 }
 return <div className="ux-city" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setOpen(false);setActive(-1);}}}><label className="p-field" htmlFor={id}><span>شهر</span></label>
  <input ref={input} id={id} role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls={open?id+'-list':undefined} aria-activedescendant={open&&matches[active]?id+'-'+active:undefined} aria-invalid={!!error} aria-describedby={id+'-hint'+(error?' '+id+'-error':'')} autoComplete="address-level2" maxLength={80} value={value}
   onFocus={()=>{setOpen(true);setActive(-1);}}
   onChange={e=>{onChange(e.target.value);setOpen(true);setActive(-1);}}
   onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();setOpen(false);setActive(-1);return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
     e.preventDefault();const next=active<0?(e.key==='ArrowDown'?0:matches.length-1):Math.max(0,Math.min(matches.length-1,active+(e.key==='ArrowDown'?1:-1)));
     move(matches.length?next:-1);
    }
    if(e.key==='Enter'&&open&&matches[active]){e.preventDefault();choose(matches[active]);}
   }}/>
  {open&&<div className="ux-city-options ux-city-panel">
   <div ref={list} className="ux-city-results" role="listbox" id={id+'-list'} aria-label="پیشنهاد شهرها">
    {matches.map((city,i)=><button type="button" tabIndex={-1} role="option" aria-selected={active===i} id={id+'-'+i} key={city.id} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(city)}>
     <span>{city.name}</span><small>استان {city.province}{(namesWithinProvince.get(cityKey(city))||0)>1&&city.county?` · شهرستان ${city.county}`:''}</small>
    </button>)}
   </div>
   <p className="ux-city-results-hint" role="status">{!matches.length?'شهری پیدا نشد؛ می‌توانید نام را دستی وارد کنید.':suggestions.length>12?'برای پیشنهاد دقیق‌تر، نام شهر یا استان را کامل‌تر بنویسید.':'شهر و استان مورد نظرتان را انتخاب کنید.'}</p>
   <button className="ux-city-manual" type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{onChange(value);input.current?.focus();setOpen(false);setActive(-1);}}>شهرم را پیدا نکردم؛ نام تایپ‌شده را نگه دار</button>
  </div>}
  <small id={id+'-hint'}>نام شهر یا استان را جست‌وجو کنید؛ ورود دستی شهر هم امکان‌پذیر است.</small><small className="ux-error ux-city-error" id={id+'-error'} role="status">{error||''}</small>
 </div>;
}
