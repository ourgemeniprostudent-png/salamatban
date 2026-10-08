'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './brand';
import './urgent-assistance.css';

type Props = {
  open: boolean;
  city: string;
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

function UrgentAssistanceDialog({ city, questionLabel, questionId, onReturn, onCorrect, correctionLabel = 'اشتباه زدم؛ پاسخ را اصلاح می‌کنم' }: Omit<Props, 'open'>) {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false), locating = useRef(false);
  const [searchCity, setSearchCity] = useState(city.trim());
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [point, setPoint] = useState<Point | null>(null);
  const term = searchCity.trim(), query = `بیمارستان ${term}`;
  const cityMap = term ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : undefined;
  const osmMap = term ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}` : undefined;
  const nearbyMap = point ? `https://www.google.com/maps/search/${encodeURIComponent('بیمارستان')}/@${point.latitude.toFixed(3)},${point.longitude.toFixed(3)},14z` : undefined;
  const selfHarm = questionId === 'urgent_self_harm' || questionLabel?.includes('آسیب‌زدن به خود');

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
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) { setGeoStatus('failed'); return; }
      // Approximate coordinates are kept only in this dialog, never in the health record.
      setPoint({ latitude: Number(latitude.toFixed(3)), longitude: Number(longitude.toFixed(3)) });
      setGeoStatus('ready');
    }, () => {
      locating.current = false;
      if (mounted.current) setGeoStatus('failed');
    }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 });
  }

  return createPortal(<dialog ref={dialog} className="urgent-assistance" dir="rtl" aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`}
    onCancel={event => { event.preventDefault(); onReturn(); }}>
    <header className="urgent-assistance-header">
      <div className="urgent-assistance-heading"><span className="urgent-assistance-symbol"><Icon name="phone" size={23}/></span><div><span className="urgent-assistance-eyebrow">کمک برای وضعیت فعلی</span><h2 ref={heading} id={`${id}-title`} tabIndex={-1}>اول، برای وضعیت فعلی کمک بگیرید</h2></div><button type="button" className="urgent-assistance-close" aria-label="بستن راهنمای کمک فوری و بازگشت به پاسخ‌ها" onClick={onReturn}><Icon name="close" size={20}/></button></div>
      <p id={`${id}-intro`}>{questionLabel ? 'برای علامتی که ثبت کردید، همین حالا از اورژانس راهنمایی بگیرید؛ منتظر ادامهٔ فرم یا پاسخ در سامانه نمانید.' : 'هشدار قبلی هنوز بررسی نشده است. اگر این علائم را اکنون دارید، با اورژانس ۱۱۵ تماس بگیرید و منتظر سامانه نمانید.'}</p>
      <a className="urgent-assistance-call" href="tel:115"><Icon name="phone" size={21}/><span>تماس با اورژانس <bdi>۱۱۵</bdi></span><Icon name="arrow" size={19}/></a>
    </header>

    <div className="urgent-assistance-body" tabIndex={0} aria-label="راهنمای تماس و پیدا کردن مرکز درمانی">
      {questionLabel && <p className="urgent-assistance-context">به این پرسش پاسخ «بله» دادید: <strong>{questionLabel}</strong></p>}
      <section aria-labelledby={`${id}-script`}><h3 id={`${id}-script`}>به اپراتور چه بگویم؟</h3><p className="urgent-assistance-hint">می‌توانید از متن زیر کمک بگیرید. اگر چیزی را نمی‌دانید، همان را بگویید.</p>
        <dl className="urgent-assistance-script">
          <div><dt>شهر و نشانی دقیق</dt><dd>«من در [شهر فعلی]، [خیابان، کوچه، پلاک و طبقه] هستم. نزدیکِ [یک نشانهٔ مشخص] هستیم.»</dd>{city && <small>شهر پروندهٔ شما {city} است؛ اگر اکنون جای دیگری هستید، نشانی همان‌جا را بگویید.</small>}</div>
          <div><dt>علامت و زمان شروع</dt><dd>«من / همراهم [علامت فعلی را بگویید] دارم / دارد. از [زمان شروع یا آخرین زمان حال عادی] شروع شده است.»</dd></div>
          <div><dt>هوشیاری و نفس‌کشیدن</dt><dd>«فردی که کمک می‌خواهد [هوشیار است / پاسخ نمی‌دهد / نمی‌دانم] و [نفس می‌کشد / نفس طبیعی ندارد / نمی‌دانم].»</dd></div>
          <div><dt>شمارهٔ تماس برای ارتباط دوباره</dt><dd>«شماره‌ای که می‌توانید دوباره با من تماس بگیرید [شمارهٔ تماس] است.»</dd></div>
        </dl>
      </section>

      <section className="urgent-assistance-wait" aria-labelledby={`${id}-waiting`}><h3 id={`${id}-waiting`}>تا دریافت راهنمایی</h3><ul><li>طبق راهنمایی اپراتور عمل کنید؛ زمان پایان تماس را هم با او هماهنگ کنید.</li><li>اگر امن است، از یک فرد مطمئن بخواهید کنار شما بماند.</li><li>اگر ضعف، احساس غش یا تنگی نفس دارید، خودتان رانندگی نکنید.</li>{selfHarm && <li>اگر ممکن است به خود یا دیگری آسیب برسد، از وسایل خطرناک فاصله بگیرید و از یک فرد مطمئن کمک بخواهید.</li>}</ul></section>

      <details className="urgent-assistance-centers"><summary><Icon name="search" size={18}/><span>پیدا کردن بیمارستان روی نقشه</span><Icon name="chevron" size={17}/></summary><div className="urgent-assistance-centers-content">
        <p>نقشه، نتیجه‌های واقعی جست‌وجو و امکان مسیریابی را در یک صفحهٔ دیگر نشان می‌دهد. انتخاب مرکز مناسب را با اپراتور اورژانس هماهنگ کنید؛ برای جست‌وجوی مرکز، تماس با ۱۱۵ را عقب نیندازید.</p>
        <label htmlFor={`${id}-city`}>شهر برای جست‌وجوی بیمارستان</label><input id={`${id}-city`} value={searchCity} maxLength={100} autoComplete="off" placeholder="نام شهر محل حضور شما" onChange={event => setSearchCity(event.target.value)}/>
        <p className="urgent-assistance-hint">پیش‌فرض از پرونده آمده است؛ اگر اکنون شهر دیگری هستید، آن را اصلاح کنید. جست‌وجو بر اساس شهر، نزدیک‌ترین مرکز به شما را مشخص نمی‌کند.</p>
        <a className="urgent-assistance-map-link" href={cityMap} aria-disabled={!cityMap} tabIndex={cityMap ? 0 : -1} target="_blank" rel="noopener noreferrer">دیدن بیمارستان‌های این شهر و مسیریابی در Google Maps <Icon name="arrow" size={17}/></a>
        <a className="urgent-assistance-osm" href={osmMap} aria-disabled={!osmMap} tabIndex={osmMap ? 0 : -1} target="_blank" rel="noopener noreferrer">جست‌وجوی همین شهر در OpenStreetMap</a>
        <div className="urgent-assistance-nearby"><h4>اگر می‌خواهید اطراف موقعیت فعلی را جست‌وجو کنید</h4><button type="button" className="urgent-assistance-location" disabled={geoStatus === 'loading'} onClick={locate}>استفاده از موقعیت فعلی برای جست‌وجو</button>
          <p className="urgent-assistance-geo-status" role="status">{geoStatus === 'loading' ? 'در انتظار اجازهٔ مرورگر و دریافت موقعیت…' : geoStatus === 'failed' ? 'موقعیت دریافت نشد؛ نام شهر را وارد کنید و با جست‌وجوی شهر ادامه دهید.' : geoStatus === 'ready' ? 'موقعیت آماده است؛ لینک زیر جست‌وجو را روی نقشه باز می‌کند.' : 'دریافت موقعیت اختیاری است و فقط با زدن دکمه و اجازهٔ شما انجام می‌شود.'}</p>
          <a className="urgent-assistance-map-link" href={nearbyMap} aria-disabled={!nearbyMap} tabIndex={nearbyMap ? 0 : -1} target="_blank" rel="noopener noreferrer">دیدن بیمارستان‌های اطراف این نقطه <Icon name="arrow" size={17}/></a>
          <small>موقعیت در پرونده ذخیره نمی‌شود. با بازکردن لینک، موقعیت تقریبی به سرویس نقشه فرستاده می‌شود.</small>
        </div>
        <p className="urgent-assistance-map-note">نتیجه‌های نقشه، ظرفیت اورژانس یا مناسب‌بودن مرکز برای وضعیت شما را تأیید نمی‌کنند.</p>
      </div></details>
    </div>

    <footer className="urgent-assistance-footer"><button type="button" className="urgent-assistance-return" onClick={onReturn}>راهنما را خواندم؛ به پاسخ‌ها برمی‌گردم</button>{onCorrect && <button type="button" className="urgent-assistance-correct" onClick={onCorrect}>{correctionLabel}</button>}</footer>
  </dialog>, document.body);
}
