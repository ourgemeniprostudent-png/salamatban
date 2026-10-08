'use client';
import { useEffect, useId, useState } from 'react';
import { Icon } from './brand';
import { FacilityLookupError, defaultHospitalLookupEndpoint, facilityLocationKey, lookupFacilities, type FacilityLocation, type FacilityResult } from './facility-lookup';
import './nearby-care.css';

type LookupState = { attempt: number; status: 'loading' | 'ready' | 'failed' | 'not-configured'; result?: FacilityResult };
type Props=FacilityLocation&{lookupEndpoint?:string|null};

export function NearbyCare(props: Props) {
  return <NearbyCareResults key={`${props.lookupEndpoint===undefined?defaultHospitalLookupEndpoint:props.lookupEndpoint??'not-configured'}|${facilityLocationKey(props)}`} {...props}/>;
}

function NearbyCareResults({ city, province = '', county = '', cityId,lookupEndpoint }: Props) {
  const id = useId(), key = facilityLocationKey({ city, province, county });
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LookupState>({ attempt: 0, status: lookupEndpoint===null||lookupEndpoint?.trim()===''?'not-configured':'loading' });
  const hasCity = city.trim().length >= 2;
  const current = state.attempt === attempt ? state : { attempt, status: 'loading' as const };
  const loading = hasCity && current.status === 'loading';
  useEffect(() => {
    if (!hasCity) return;
    const controller = new AbortController();
    void lookupFacilities({ city, province, county, cityId }, { endpoint:lookupEndpoint,signal: controller.signal, refresh: attempt > 0 }).then(result => {
      if (!controller.signal.aborted) setState({ attempt, status: 'ready', result });
    }).catch(error => { if (!controller.signal.aborted && error?.name !== 'AbortError') setState({ attempt, status: error instanceof FacilityLookupError&&error.code==='not-configured'?'not-configured':'failed' }); });
    return () => controller.abort();
  }, [key, hasCity, city, province, county, cityId, lookupEndpoint,attempt]);
  const result = current.result;
  return <section className="nearby-care" aria-labelledby={`${id}-title`}>
    <header className="nearby-care-header"><span className="nearby-care-symbol" aria-hidden="true"><Icon name="route" size={21}/></span><div><h3 id={`${id}-title`}>نتایج جست‌وجوی مراکز درمانی در نشان</h3><p>{hasCity?`${city}${province?`، استان ${province}`:''}`:'جست‌وجوی بیمارستان و درمانگاه بر اساس شهر'}</p></div></header>
    <p className="nearby-care-privacy">فقط نام شهر، شهرستان و استان برای جست‌وجو به نشان فرستاده می‌شود؛ اطلاعات پزشکی ارسال نمی‌شود.</p>
    <div className="nearby-care-results" aria-busy={loading} aria-live="polite" tabIndex={0} aria-label="نتیجهٔ جست‌وجوی مراکز درمانی">
      {current.status==='not-configured'?<div className="nearby-care-state"><Icon name="route" size={25}/><strong>فهرست نشان در این نسخه هنوز متصل نشده است.</strong><p>برای راهنمایی دربارهٔ مرکز مناسب، با <a href="tel:115">اورژانس ۱۱۵</a> تماس بگیرید.</p></div>:!hasCity ? <div className="nearby-care-state"><Icon name="route" size={25}/><strong>ابتدا شهر محل حضور را مشخص کنید.</strong><p>تماس با اورژانس به انتخاب شهر یا دریافت این فهرست وابسته نیست.</p></div> : loading ? <div className="nearby-care-state"><span className="nearby-care-loading" aria-hidden="true"/><strong>در حال جست‌وجوی بیمارستان و درمانگاه در نشان…</strong><p>اگر به کمک فوری نیاز دارید، همین حالا با ۱۱۵ تماس بگیرید.</p></div> : current.status === 'failed' ? <div className="nearby-care-state"><Icon name="route" size={25}/><strong>فهرست مرکزها دریافت نشد.</strong><p>ارتباط با نشان برقرار نشد. دوباره تلاش کنید یا برای انتخاب مرکز از ۱۱۵ راهنمایی بگیرید.</p></div> : !result?.facilities.length ? <div className="nearby-care-state"><Icon name="search" size={25}/><strong>در این جست‌وجو مرکزی پیدا نشد.</strong><p>این نتیجه به معنی نبود مرکز درمانی در شهر نیست؛ شهر محل حضور را بررسی کنید یا از ۱۱۵ راهنمایی بگیرید.</p></div> : <ul>{result.facilities.map(facility => <li key={facility.id} className="nearby-care-card"><h4>{facility.name}</h4><p>{facility.address || 'نشانی متنی در نقشه ثبت نشده است.'}</p><div className="nearby-care-actions"><a className="nearby-care-directions" href={facility.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`بازکردن ${facility.name} در نشان و مسیریابی`}>بازکردن در نشان و مسیریابی<Icon name="arrow" size={14}/></a></div></li>)}</ul>}
    </div>
    <div className="nearby-care-source"><a href="https://neshan.org" target="_blank" rel="noopener noreferrer">نقشهٔ نشان</a>{current.status!=='not-configured'&&<button type="button" disabled={!hasCity || loading} onClick={() => setAttempt(n => n + 1)}>تلاش دوباره</button>}</div>
    <p className="nearby-care-date">{result ? `دریافت فهرست: ${new Date(result.retrievedAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}` : 'جست‌وجوی نام بیمارستان و درمانگاه؛ پوشش کامل مرکزها تضمین نمی‌شود.'}</p>
    <p className="nearby-care-note">نتایج بر اساس نام مرکزند؛ نوع خدمت، مناسب‌بودن مرکز، نزدیک‌ترین بودن یا ظرفیت پذیرش تأیید نشده است. انتخاب مرکز را با اپراتور ۱۱۵ هماهنگ کنید.</p>
  </section>;
}
