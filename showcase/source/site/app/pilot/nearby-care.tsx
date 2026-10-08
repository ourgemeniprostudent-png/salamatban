'use client';
import { useEffect, useId, useState } from 'react';
import { Icon } from './brand';
import { facilityLocationKey, lookupFacilities, type FacilityLocation, type FacilityResult } from './facility-lookup';
import './nearby-care.css';

type LookupState = { attempt: number; status: 'loading' | 'ready' | 'failed'; result?: FacilityResult };

export function NearbyCare(props: FacilityLocation) {
  return <NearbyCareResults key={facilityLocationKey(props)} {...props}/>;
}

function NearbyCareResults({ city, province = '', county = '', cityId }: FacilityLocation) {
  const id = useId(), key = facilityLocationKey({ city, province, county });
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LookupState>({ attempt: 0, status: 'loading' });
  const hasCity = city.trim().length >= 2;
  const current = state.attempt === attempt ? state : { attempt, status: 'loading' as const };
  const loading = hasCity && current.status === 'loading';
  useEffect(() => {
    if (!hasCity) return;
    const controller = new AbortController();
    void lookupFacilities({ city, province, county, cityId }, { signal: controller.signal, refresh: attempt > 0 }).then(result => {
      if (!controller.signal.aborted) setState({ attempt, status: 'ready', result });
    }).catch(error => { if (!controller.signal.aborted && error?.name !== 'AbortError') setState({ attempt, status: 'failed' }); });
    return () => controller.abort();
  }, [key, hasCity, city, province, county, cityId, attempt]);
  const result = current.result;
  return <section className="nearby-care" aria-labelledby={`${id}-title`}>
    <header className="nearby-care-header"><span className="nearby-care-symbol" aria-hidden="true"><Icon name="route" size={21}/></span><div><h3 id={`${id}-title`}>{hasCity ? `بیمارستان‌های ${city}` : 'بیمارستان‌های شهر شما'}</h3><p>{province ? `استان ${province}` : 'فهرست عمومی نقشه؛ بدون رتبه‌بندی فاصله'}</p></div></header>
    <p className="nearby-care-privacy">فقط نام شهر، شهرستان و استان برای دریافت فهرست به OpenStreetMap فرستاده می‌شود.</p>
    <div className="nearby-care-results" aria-busy={loading} aria-live="polite" tabIndex={0} aria-label="نتیجهٔ جست‌وجوی بیمارستان‌ها">
      {!hasCity ? <div className="nearby-care-state"><Icon name="route" size={25}/><strong>ابتدا شهر محل حضور را مشخص کنید.</strong><p>تماس با اورژانس به انتخاب شهر یا دریافت این فهرست وابسته نیست.</p></div> : loading ? <div className="nearby-care-state"><span className="nearby-care-loading" aria-hidden="true"/><strong>در حال دریافت بیمارستان‌های این شهر…</strong><p>اگر به کمک فوری نیاز دارید، همین حالا با ۱۱۵ تماس بگیرید.</p></div> : current.status === 'failed' ? <div className="nearby-care-state"><Icon name="route" size={25}/><strong>فهرست مرکزها دریافت نشد.</strong><p>ارتباط با نقشه برقرار نشد. دوباره تلاش کنید یا برای انتخاب مرکز از ۱۱۵ راهنمایی بگیرید.</p></div> : !result?.facilities.length ? <div className="nearby-care-state"><Icon name="search" size={25}/><strong>در این جست‌وجو بیمارستانی پیدا نشد.</strong><p>این نتیجه به معنی نبود بیمارستان در شهر نیست؛ شهر محل حضور را بررسی کنید یا از ۱۱۵ راهنمایی بگیرید.</p></div> : <ul>{result.facilities.map(facility => <li key={facility.id} className="nearby-care-card"><h4>{facility.name}</h4><p>{facility.address || 'نشانی متنی در نقشه ثبت نشده است.'}</p>{facility.phone && <a className="nearby-care-phone" href={`tel:${facility.phone}`}><Icon name="phone" size={14}/><span>تلفن ثبت‌شده در نقشه: <bdi>{facility.phone}</bdi></span></a>}<div className="nearby-care-actions"><a className="nearby-care-directions" href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`} target="_blank" rel="noopener noreferrer" aria-label={`مسیریابی به ${facility.name}`}>مسیریابی<Icon name="arrow" size={14}/></a><a href={facility.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`مشاهدهٔ ${facility.name} در OpenStreetMap`}>اطلاعات نقشه</a></div></li>)}</ul>}
    </div>
    <div className="nearby-care-source"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© مشارکت‌کنندگان OpenStreetMap</a><button type="button" disabled={!hasCity || loading} onClick={() => setAttempt(n => n + 1)}>تلاش دوباره</button></div>
    <p className="nearby-care-date">{result ? `دریافت فهرست: ${new Date(result.retrievedAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}` : 'دادهٔ عمومی نقشه؛ پوشش کامل مرکزها تضمین نمی‌شود.'}</p>
    <p className="nearby-care-note">این فهرست نزدیک‌ترین مرکز، اورژانس فعال یا ظرفیت پذیرش را تأیید نمی‌کند. مرکز مناسب را با اپراتور ۱۱۵ هماهنگ کنید.</p>
  </section>;
}
