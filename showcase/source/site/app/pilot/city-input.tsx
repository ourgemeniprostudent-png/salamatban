'use client';
import { useId, useState } from 'react';
import { cities, normalizeSearch, type City } from '../../lib/data/cities';
import './controls-stability.css';
export function CityInput({value,onChange,error}:{value:string;onChange:(value:string,city?:City)=>void;error?:string}) {
 const id=useId(),[open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const matches=cities.filter(c=>normalizeSearch(c.name+' '+c.province).includes(normalizeSearch(value))).slice(0,12);
 return <div className="ux-city"><label className="p-field" htmlFor={id}><span>شهر</span></label>
 <input id={id} role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls={open?id+'-list':undefined} aria-activedescendant={open&&active>=0?id+'-'+active:undefined} aria-invalid={!!error} aria-describedby={error?id+'-error':id+'-hint'} autoComplete="address-level2" maxLength={80} value={value} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onChange={e=>{onChange(e.target.value);setOpen(true);setActive(-1);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>Math.max(0,Math.min(matches.length-1,i+(e.key==='ArrowDown'?1:-1))));}if(e.key==='Enter'&&open&&matches[active]){e.preventDefault();onChange(matches[active].name,matches[active]);setOpen(false);}}}/>
 {open&&<div className="ux-city-options" role="listbox" id={id+'-list'} aria-label="پیشنهاد شهرها">{matches.map((c,i)=><button type="button" role="option" aria-selected={active===i} id={id+'-'+i} key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{onChange(c.name,c);setOpen(false);}}>{c.name}<small>استان {c.province}</small></button>)}<button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{setOpen(false);document.getElementById(id)?.focus();setOpen(false);}}>شهرم را پیدا نکردم؛ نام تایپ‌شده را نگه دار</button></div>}
 <small id={id+'-hint'}>شهرهای پیشنهادی، پوشش کامل کشور نیستند؛ می‌توانید نام شهر را آزادانه وارد کنید.</small><small className="ux-error ux-city-error" id={id+'-error'} role="status">{error||''}</small>
 </div>;
}
