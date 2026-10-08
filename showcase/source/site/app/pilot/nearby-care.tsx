'use client';
import { useEffect, useId, useState } from 'react';
import { Icon } from './brand';
import { FacilityLookupError, defaultHospitalLookupEndpoint, facilityLocationKey, lookupFacilities, type FacilityLocation, type FacilityResult } from './facility-lookup';
import './nearby-care.css';

type Status='loading'|'ready'|'failed'|'not-configured'|'not-covered'|'invalid'|'rate-limited'|'location-unconfirmed';
type LookupState={attempt:number;status:Status;result?:FacilityResult;retryAt?:number};
type Props=FacilityLocation&{lookupEndpoint?:string|null;snapshotUrl?:string|null};

export function NearbyCare(props:Props){
 return <NearbyCareResults key={`${props.lookupEndpoint===undefined?defaultHospitalLookupEndpoint:props.lookupEndpoint??props.snapshotUrl??'not-configured'}|${props.cityId||''}|${facilityLocationKey(props)}`} {...props}/>;
}

function NearbyCareResults({city,province='',county='',cityId,lookupEndpoint,snapshotUrl}:Props){
 const id=useId(),key=facilityLocationKey({city,province,county});
 const [attempt,setAttempt]=useState(0),[now,setNow]=useState(Date.now);
 const snapshotMode=lookupEndpoint===null&&!!snapshotUrl;
 const [state,setState]=useState<LookupState>({attempt:0,status:(lookupEndpoint===null&&!snapshotUrl)||lookupEndpoint?.trim()===''?'not-configured':'loading'});
 const hasCity=city.trim().length>=2;
 const current:LookupState=state.attempt===attempt?state:{attempt,status:'loading'};
 const loading=hasCity&&current.status==='loading';
 const remaining=Math.max(0,Math.ceil(((current.retryAt||0)-now)/1000));
 useEffect(()=>{
  if(!hasCity)return;
  const controller=new AbortController();
  void lookupFacilities({city,province,county,cityId},{endpoint:lookupEndpoint,snapshotUrl,signal:controller.signal,refresh:attempt>0}).then(result=>{
   if(!controller.signal.aborted)setState({attempt,status:'ready',result});
  }).catch(error=>{
   if(controller.signal.aborted||error?.name==='AbortError')return;
   const code=error instanceof FacilityLookupError?error.code:'unavailable';
   const status:Status=code==='not-configured'||code==='not-covered'||code==='invalid'||code==='rate-limited'||code==='location-unconfirmed'?code:code==='location'?'location-unconfirmed':'failed';
   const retryAt=status==='rate-limited'?Date.now()+error.retryAfterSeconds*1000:undefined;
   setNow(Date.now());setState({attempt,status,retryAt});
  });
  return ()=>controller.abort();
 },[key,hasCity,city,province,county,cityId,lookupEndpoint,snapshotUrl,attempt]);
 useEffect(()=>{
  if(current.status!=='rate-limited'||remaining===0)return;
  const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);
 },[current.status,current.retryAt,remaining]);
 const result=current.result;
 let message:{title:string;description:string}|undefined;
 if(current.status==='not-configured')message={title:'فهرست مراکز درمانی در این نسخه هنوز متصل نشده است.',description:'برای راهنمایی دربارهٔ مرکز مناسب، با اورژانس ۱۱۵ تماس بگیرید.'};
 else if(current.status==='not-covered')message={title:'برای این شهر فهرست نمایشی تهیه نشده است.',description:'این نسخه شهرهای منتخب را پوشش می‌دهد؛ این پیام به معنی نبود مرکز درمانی نیست. برای راهنمایی با ۱۱۵ تماس بگیرید.'};
 else if(!hasCity)message={title:'ابتدا شهر محل حضور را مشخص کنید.',description:'تماس با اورژانس به انتخاب شهر یا دریافت این فهرست وابسته نیست.'};
 else if(loading)message={title:snapshotMode?'در حال بازکردن فهرست ذخیره‌شده…':'در حال جست‌وجوی بیمارستان و درمانگاه…',description:'اگر به کمک فوری نیاز دارید، همین حالا با ۱۱۵ تماس بگیرید.'};
 else if(current.status==='failed')message={title:'فهرست مرکزها دریافت نشد.',description:snapshotMode?'فایل فهرست باز نشد. دوباره تلاش کنید یا از ۱۱۵ راهنمایی بگیرید.':'ارتباط با سرویس جست‌وجو برقرار نشد. دوباره تلاش کنید یا از ۱۱۵ راهنمایی بگیرید.'};
 else if(current.status==='invalid')message={title:'اطلاعات دریافت‌شده قابل نمایش نیست.',description:'پاسخ سرویس معتبر نبود؛ فهرست خالی تأیید نشده است. دوباره تلاش کنید یا از ۱۱۵ راهنمایی بگیرید.'};
 else if(current.status==='location-unconfirmed')message={title:'موقعیت این شهر تأیید نشد.',description:'نام شهر و استان را بررسی کنید. تا مشخص‌شدن شهر، مرکزی پیشنهاد نمی‌شود؛ تماس با ۱۱۵ در دسترس است.'};
 else if(current.status==='rate-limited')message={title:'درخواست‌های جست‌وجو زیاد شده است.',description:remaining>0?`حدود ${remaining.toLocaleString('fa-IR')} ثانیه دیگر دوباره تلاش کنید؛ تماس با ۱۱۵ در دسترس است.`:'می‌توانید دوباره تلاش کنید؛ برای کمک فوری منتظر فهرست نمانید.'};
 else if(!result?.facilities.length)message={title:'در این جست‌وجو مرکزی پیدا نشد.',description:'این نتیجه به معنی نبود مرکز درمانی در شهر نیست؛ نام شهر را بررسی کنید یا از ۱۱۵ راهنمایی بگیرید.'};
 return <section className="nearby-care" aria-labelledby={`${id}-title`}>
  <header className="nearby-care-header"><span className="nearby-care-symbol" aria-hidden="true"><Icon name="route" size={21}/></span><div><h3 id={`${id}-title`}>مراکز درمانی روی نقشه</h3><p>{hasCity?`${city}${province?`، استان ${province}`:''}`:'بیمارستان و درمانگاه'}</p></div></header>
  <p className="nearby-care-privacy">{snapshotMode?'فهرست از فایل همین نسخه باز می‌شود؛ شهر و اطلاعات پزشکی شما به سرویس نقشه فرستاده نمی‌شود.':'فقط نام شهر، شهرستان و استان به Geoapify فرستاده می‌شود؛ اطلاعات پزشکی ارسال نمی‌شود.'}</p>
  <div className="nearby-care-results" aria-busy={loading} aria-live="polite" tabIndex={0} aria-label="نتیجهٔ جست‌وجوی مراکز درمانی">
   {message?<div className="nearby-care-state">{loading?<span className="nearby-care-loading" aria-hidden="true"/>:<Icon name="route" size={25}/>}<strong>{message.title}</strong><p>{message.description}</p></div>:<ul>{result!.facilities.map(facility=><li key={facility.id} className="nearby-care-card">
    <span className="nearby-care-kind">{facility.kind==='hospital'?'بیمارستان':'درمانگاه / کلینیک'} · برچسب نقشه</span><h4>{facility.name}</h4><p>{facility.address||'نشانی متنی در نقشه ثبت نشده است.'}</p>
    <div className="nearby-care-actions"><a className="nearby-care-directions" href={facility.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`بازکردن ${facility.name} در نشان و مسیریابی`}>بازکردن در نشان و مسیریابی<Icon name="arrow" size={14}/></a></div>
   </li>)}</ul>}
  </div>
  <div className="nearby-care-source"><span>منبع: <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© مشارکت‌کنندگان OpenStreetMap</a></span>{current.status!=='not-configured'&&current.status!=='not-covered'&&<button type="button" disabled={!hasCity||loading||remaining>0} onClick={()=>setAttempt(n=>n+1)}>تلاش دوباره</button>}</div>
  <p className="nearby-care-date"><span>{snapshotMode?'فهرست ذخیره‌شدهٔ نمایشی':'جست‌وجوی زنده'}{result&&<> · <time dateTime={result.retrievedAt} title={new Date(result.retrievedAt).toLocaleString('fa-IR')}>{new Date(result.retrievedAt).toLocaleDateString('fa-IR')}</time></>}</span><span>{result?`شعاع ${(result.radiusMeters/1000).toLocaleString('fa-IR')} کیلومتر از مرکز شهر`:'اطراف مرکز شهر؛ نه بر اساس موقعیت شما'}</span></p>
  <p className="nearby-care-note">فاصله از شما، خدمات اورژانس، ظرفیت پذیرش و مناسب‌بودن مرکز تأیید نشده است. مقصد را با اپراتور ۱۱۵ هماهنگ کنید.</p>
 </section>;
}
