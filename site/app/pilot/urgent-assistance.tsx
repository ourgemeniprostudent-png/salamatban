'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './brand';
import { NearbyCare } from './nearby-care';
import { CityInput } from './city-input';
import type { City } from '../../lib/data/cities';
import type { FacilityLocation } from './facility-lookup';
import { neshanPointUrl } from './neshan-links';
import { buildUrgentGuidance, type UrgentPositiveQuestion } from './urgent-guidance';
import './urgent-assistance.css';

type Props = {
  open: boolean;
  city: string;
  province?: string;
  county?: string;
  cityId?: string;
  hospitalLookupEndpoint?:string|null;
  hospitalSnapshotUrl?:string|null;
  positiveQuestions?: readonly UrgentPositiveQuestion[];
  questionLabel?: string;
  questionId?: string;
  onReturn: () => void;
  onCorrect?: () => void;
  correctionLabel?: string;
};
type Point = { latitude: number; longitude: number };

/** Guidance only: closing or correcting never changes an answer or a persisted alert. */
export function UrgentAssistance({ open, ...props }: Props) {
  return open && typeof document !== 'undefined' ? <UrgentAssistanceDialog {...props}/> : null;
}

function UrgentAssistanceDialog({ city, province, county, cityId, hospitalLookupEndpoint,hospitalSnapshotUrl,positiveQuestions, questionLabel, questionId, onReturn, onCorrect, correctionLabel = 'اشتباه زدم؛ پاسخ را اصلاح می‌کنم' }: Omit<Props, 'open'>) {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false), locating = useRef(false);
  const [searchCity, setSearchCity] = useState(city.trim());
  const [searchPlace, setSearchPlace] = useState<City>();
  const [careLocation, setCareLocation] = useState<FacilityLocation>({city:city.trim(),province,county,cityId});
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [point, setPoint] = useState<Point | null>(null);
  const guidance = buildUrgentGuidance(positiveQuestions ?? (questionLabel && questionId ? [{ id: questionId, label: questionLabel }] : []));
  const currentSymptoms = guidance.questions.length > 0;
  const nearbyMap = point ? neshanPointUrl(point.latitude,point.longitude) : undefined;

  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialog.current;
    // Stop a still-running route scroll before the dialog takes focus.
    window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: 'instant' });
    if (node && !node.open) node.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      mounted.current = false;
      node?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  function locate() {
    if (locating.current) return;
    if (!navigator.geolocation) { setGeoStatus('failed'); return; }
    locating.current = true;
    setPoint(null);
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(position => {
      locating.current = false;
      if (!mounted.current) return;
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180) { setGeoStatus('failed'); return; }
      // Approximate coordinates are kept only in this dialog, never in the health record.
      setPoint({ latitude: Number(latitude.toFixed(3)), longitude: Number(longitude.toFixed(3)) });
      setGeoStatus('ready');
    }, () => {
      locating.current = false;
      if (mounted.current) setGeoStatus('failed');
    }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 });
  }

  return createPortal(<dialog ref={dialog} className="urgent-assistance" dir="rtl" data-current-symptoms={currentSymptoms} aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`}
    onCancel={event => { event.preventDefault(); onReturn(); }}>
    <header className="urgent-assistance-header">
      <div className="urgent-assistance-heading"><span className="urgent-assistance-symbol"><Icon name="phone" size={23}/></span><div><span className="urgent-assistance-eyebrow">راهنمای کمک فوری</span><h2 ref={heading} id={`${id}-title`} tabIndex={-1}>{currentSymptoms ? 'اول، برای وضعیت فعلی کمک بگیرید' : 'راهنمای هشدار ثبت‌شده'}</h2></div><button type="button" className="urgent-assistance-close" aria-label="بستن راهنمای کمک فوری و بازگشت به پاسخ‌ها" onClick={onReturn}><Icon name="close" size={20}/></button></div>
      <p id={`${id}-intro`}>{currentSymptoms ? 'برای علامتی که ثبت کردید، همین حالا از اورژانس راهنمایی بگیرید؛ منتظر ادامهٔ فرم یا پاسخ در سامانه نمانید.' : 'هشدار قبلی هنوز بررسی نشده است. اگر اکنون علائم هشدار دارید، با اورژانس ۱۱۵ تماس بگیرید؛ منتظر سامانه نمانید.'}</p>
      <a className="urgent-assistance-call" href="tel:115"><Icon name="phone" size={21}/><span>تماس با اورژانس <bdi>۱۱۵</bdi></span><Icon name="arrow" size={19}/></a>
    </header>

    <div className="urgent-assistance-body" tabIndex={0} aria-label="راهنمای تماس و پیدا کردن مرکز درمانی">
      <section className="urgent-assistance-column urgent-assistance-conversation" tabIndex={0} aria-labelledby={`${id}-script`}>
        <span className="urgent-assistance-step">۱ · هنگام تماس</span><h3 id={`${id}-script`}>به اپراتور چه بگویم؟</h3>
        <p className="urgent-assistance-hint">از متن زیر کمک بگیرید؛ داخل کروشه‌ها را با چیزی که می‌دانید پر کنید. اگر نمی‌دانید، همان را بگویید.</p>
        <div className="urgent-assistance-script">
          <p className="urgent-assistance-spoken">{currentSymptoms ? guidance.spokenSymptoms.join(' ') : 'برای راهنمایی دربارهٔ وضعیت فعلی تماس گرفته‌ام. [علامت فعلی، یا این‌که اکنون علامتی ندارم، را می‌گویم].'}</p>
          <p>من در [شهر فعلی]، [خیابان، کوچه، پلاک و طبقه] هستم؛ نزدیکِ [یک نشانهٔ مشخص].</p>
          <p>زمان شروع علامت یا آخرین زمان حال عادی: [زمان / نمی‌دانم].</p>
          <p>هوشیاری و نفس‌کشیدن: [هوشیارم / پاسخ نمی‌دهد / نمی‌دانم]؛ [نفس می‌کشم / نفس طبیعی ندارد / نمی‌دانم].</p>
          <p>شمارهٔ تماس برای ارتباط دوباره: [شمارهٔ تماس].</p>
        </div>
        {currentSymptoms && <details className="urgent-assistance-selected" open={guidance.questions.length === 1}><summary>پاسخ‌هایی که این راهنما بر اساس آن‌هاست <span>{guidance.questions.length.toLocaleString('fa-IR')}</span></summary><ul>{guidance.questions.map(question => <li key={question.id} data-question-id={question.id}>{question.label} <strong>بله</strong></li>)}</ul></details>}
        <p className="urgent-assistance-hint urgent-assistance-script-note">{currentSymptoms ? 'اگر پرسش چند علامت داشت، فقط همان علامتی را بگویید که دارید. اگر برای همراهتان تماس می‌گیرید، وضعیت او را توضیح دهید.' : 'این متن وجود علامت فعلی را فرض نمی‌کند. اگر پاسخ قبلی اشتباه بوده، می‌توانید آن را اصلاح کنید؛ هشدار ثبت‌شده تا بررسی پزشک باقی می‌ماند.'}</p>
      </section>

      <section className="urgent-assistance-column urgent-assistance-wait" tabIndex={0} aria-labelledby={`${id}-waiting`}>
        <span className="urgent-assistance-step">۲ · تا دریافت راهنمایی</span><h3 id={`${id}-waiting`}>با راهنمایی اپراتور پیش بروید</h3>
        <ul><li>طبق راهنمایی اپراتور عمل کنید؛ زمان پایان تماس را هم با او هماهنگ کنید.</li><li>اگر امن است، از فردی مطمئن برای تماس و گفتن نشانی کمک بگیرید.</li>{guidance.waitingInstructions.map(instruction => <li key={instruction.id} data-guidance-for={instruction.id}>{instruction.text}</li>)}<li>اگر ضعف، احساس غش یا تنگی نفس دارید، خودتان رانندگی نکنید.</li></ul>
        <p className="urgent-assistance-priority">برای پیدا کردن مرکز درمانی، تماس با ۱۱۵ را عقب نیندازید.</p>
      </section>

      <section className="urgent-assistance-column urgent-assistance-care" tabIndex={0} aria-label="پیدا کردن مرکز درمانی">
        <span className="urgent-assistance-step">۳ · مراکز روی نقشه</span>
        <NearbyCare snapshotUrl={hospitalSnapshotUrl} lookupEndpoint={hospitalLookupEndpoint} {...careLocation}/>
        <details className="urgent-assistance-centers"><summary><Icon name="search" size={16}/><span>اکنون در شهر دیگری هستم / موقعیت روی نشان</span><Icon name="chevron" size={16}/></summary><div className="urgent-assistance-centers-content">
          <p>شهر پرونده، موقعیت فعلی شما را مشخص نمی‌کند. شهر محل حضور را اصلاح کنید یا با اجازهٔ خودتان موقعیت را دریافت کنید.</p>
          <form onSubmit={event => { event.preventDefault(); if (!searchCity.trim()) return; setCareLocation(searchPlace ? {city:searchPlace.name,cityId:searchPlace.id,province:searchPlace.province,county:searchPlace.county} : searchCity.trim()===city.trim() ? {city:city.trim(),province,county,cityId} : {city:searchCity.trim()}); }}><div className="urgent-assistance-city-row"><CityInput label="شهر محل حضور" value={searchCity} onChange={(value,selected)=>{setSearchCity(value);setSearchPlace(selected);}}/><button type="submit" disabled={!searchCity.trim()}>نمایش مراکز</button></div></form>
          <div className="urgent-assistance-nearby"><button type="button" className="urgent-assistance-location" disabled={geoStatus === 'loading'} onClick={locate}>دریافت موقعیت فعلی</button>
            <p className="urgent-assistance-geo-status" role="status">{geoStatus === 'loading' ? 'در انتظار اجازهٔ مرورگر و دریافت موقعیت…' : geoStatus === 'failed' ? 'موقعیت دریافت نشد؛ نام شهر را وارد کنید و با جست‌وجوی شهر ادامه دهید.' : geoStatus === 'ready' ? 'موقعیت آماده است؛ با لینک زیر آن را در نشان باز کنید.' : 'دریافت موقعیت فقط با زدن دکمه و اجازهٔ شما انجام می‌شود.'}</p>
            <a className="urgent-assistance-map-link" href={nearbyMap} aria-disabled={!nearbyMap} tabIndex={nearbyMap ? 0 : -1} target="_blank" rel="noopener noreferrer">بازکردن موقعیت در نشان <Icon name="arrow" size={17}/></a>
            <small>موقعیت در پرونده ذخیره نمی‌شود. فقط با بازکردن لینک، موقعیت تقریبی به نشان فرستاده می‌شود؛ این لینک صرفاً همان نقطه را نمایش می‌دهد.</small>
          </div>
        </div></details>
      </section>
    </div>

    <footer className="urgent-assistance-footer"><span>بستن راهنما، پاسخ‌ها یا هشدار ثبت‌شده را پاک نمی‌کند.</span><div><button type="button" className="urgent-assistance-return" onClick={onReturn}>راهنما را خواندم؛ به پاسخ‌ها برمی‌گردم</button>{onCorrect && <button type="button" className="urgent-assistance-correct" onClick={onCorrect}>{correctionLabel}</button>}</div></footer>
  </dialog>, document.body);
}
