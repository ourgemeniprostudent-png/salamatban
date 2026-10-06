'use client';

import { useEffect, useState } from 'react';

type DemoProfile = {
  id: string;
  shortTitle: string;
  title: string;
  person: string;
  age: string;
  summary: string;
  status: string;
  accent: string;
  results: { label: string; value: string; reference: string; state: 'high' | 'watch' | 'normal' }[];
  roadmap: { month: string; title: string; detail: string; owner: string; priority: 'بالا' | 'معمول' }[];
};

const profiles: DemoProfile[] = [
  {
    id: 'diabetes', shortTitle: 'دیابت نوع ۲', title: 'کنترل دیابت نوع ۲', person: 'مریم احمدی · پرونده ساختگی', age: '۵۴ سال', status: 'نیازمند پیگیری نزدیک', accent: 'demo-accent-amber',
    summary: 'میانگین قند سه‌ماهه بالاتر از محدوده هدف فرضی است و بررسی کلیه، چشم و سلامت پا باید در برنامه پیگیری قرار گیرد. نتیجه‌ها باید همراه با سابقه درمان، الگوی افت قند و نظر پزشک تفسیر شوند.',
    results: [
      { label: 'HbA1c', value: '۸٫۴٪', reference: 'هدف فردی با نظر پزشک', state: 'high' },
      { label: 'قند ناشتا', value: '۱۶۸ mg/dL', reference: '۷۰–۹۹', state: 'high' },
      { label: 'نسبت آلبومین به کراتینین ادرار', value: '۴۲ mg/g', reference: 'کمتر از ۳۰', state: 'watch' },
      { label: 'LDL', value: '۱۱۸ mg/dL', reference: 'هدف وابسته به خطر قلبی', state: 'watch' },
      { label: 'eGFR', value: '۷۸', reference: 'mL/min/1.73m²', state: 'normal' },
      { label: 'فشارخون', value: '۱۳۶/۸۴', reference: 'میانگین ثبت‌شده', state: 'watch' },
    ],
    roadmap: [
      { month: 'هفته ۱–۲', title: 'مرور بالینی نتایج و درمان فعلی', detail: 'بررسی داروها، پایبندی، عوارض و سابقه افت قند؛ هر تغییر فقط با تصمیم پزشک.', owner: 'پزشک و عضو', priority: 'بالا' },
      { month: 'ماه ۱', title: 'برنامه ثبت قند و سبک زندگی', detail: 'ثبت قند طبق برنامه پزشک، مرور تغذیه و هدف فعالیت بدنی متناسب با توان فرد.', owner: 'عضو و مربی سلامت', priority: 'بالا' },
      { month: 'ماه ۱–۳', title: 'ارزیابی کلیه، چشم و پا', detail: 'تکمیل معاینه پا، هماهنگی معاینه شبکیه و تکرار آزمایش ادرار در صورت صلاحدید.', owner: 'تیم همیار', priority: 'معمول' },
      { month: 'ماه ۳', title: 'تکرار HbA1c و بازبینی هدف', detail: 'مقایسه روند سه‌ماهه و تصمیم‌گیری مشترک درباره ادامه برنامه.', owner: 'پزشک', priority: 'بالا' },
      { month: 'ماه ۶–۱۲', title: 'پایش دوره‌ای خطر قلبی‌عروقی', detail: 'پیگیری فشارخون، چربی خون، فعالیت و واکسیناسیون براساس شرایط فرد.', owner: 'عضو و تیم همیار', priority: 'معمول' },
    ],
  },
  {
    id: 'hypertension', shortTitle: 'فشارخون', title: 'پیگیری فشارخون بالا', person: 'رضا کریمی · پرونده ساختگی', age: '۶۱ سال', status: 'فشارخون بالاتر از هدف فرضی', accent: 'demo-accent-red',
    summary: 'میانگین فشارخون خانگی و مطب در چند نوبت بالا ثبت شده است. ابتدا باید روش اندازه‌گیری، نظم مصرف دارو و عوامل خطر قلبی‌عروقی مرور شوند؛ سپس پزشک درباره هدف و درمان تصمیم بگیرد.',
    results: [
      { label: 'میانگین فشارخون خانه', value: '۱۵۱/۹۴', reference: 'ثبت ۷ روزه', state: 'high' },
      { label: 'فشارخون مطب', value: '۱۵۶/۹۶', reference: 'میانگین دو نوبت', state: 'high' },
      { label: 'کراتینین', value: '۰٫۹ mg/dL', reference: 'در محدوده آزمایشگاه', state: 'normal' },
      { label: 'پتاسیم', value: '۴٫۲ mmol/L', reference: '۳٫۵–۵٫۱', state: 'normal' },
      { label: 'LDL', value: '۱۳۲ mg/dL', reference: 'هدف وابسته به خطر قلبی', state: 'watch' },
      { label: 'BMI', value: '۲۹٫۱', reference: 'اضافه‌وزن', state: 'watch' },
    ],
    roadmap: [
      { month: 'هفته ۱', title: 'اعتبارسنجی اندازه‌گیری فشارخون', detail: 'کنترل اندازه کاف، وضعیت نشستن و ثبت صبح و شب برای هفت روز.', owner: 'عضو و پرستار', priority: 'بالا' },
      { month: 'هفته ۲', title: 'مرور دارو و نشانه‌های هشدار', detail: 'بررسی نظم مصرف، عوارض و داروهای بدون نسخه؛ تغییر درمان فقط توسط پزشک.', owner: 'پزشک', priority: 'بالا' },
      { month: 'ماه ۱–۲', title: 'کاهش نمک و برنامه تحرک', detail: 'هدف کوچک و قابل‌اندازه‌گیری برای نمک، وزن و فعالیت متناسب با توان فرد.', owner: 'عضو و مربی سلامت', priority: 'معمول' },
      { month: 'ماه ۳', title: 'بازبینی روند فشارخون', detail: 'مقایسه میانگین خانه با هدف فردی و ارزیابی نیاز به بررسی تکمیلی.', owner: 'پزشک', priority: 'بالا' },
      { month: 'ماه ۶–۱۲', title: 'پایش کلیه و خطر قلبی‌عروقی', detail: 'آزمایش‌های دوره‌ای و پیگیری چربی، وزن و فشارخون طبق برنامه بالینی.', owner: 'تیم همیار', priority: 'معمول' },
    ],
  },
  {
    id: 'thyroid', shortTitle: 'کم‌کاری تیروئید', title: 'پیگیری کم‌کاری تیروئید', person: 'سارا محمدی · پرونده ساختگی', age: '۳۸ سال', status: 'نیازمند تأیید و تنظیم پیگیری', accent: 'demo-accent-blue',
    summary: 'TSH بالا و FT4 پایین در این نمونه با کم‌کاری تیروئید سازگار است، اما تشخیص و تصمیم درمانی نیازمند مرور نشانه‌ها، سابقه دارویی و ارزیابی پزشک است. نتیجه آنتی‌بادی نیز به‌تنهایی مبنای تغییر درمان نیست.',
    results: [
      { label: 'TSH', value: '۹٫۲ mIU/L', reference: '۰٫۴–۴٫۵', state: 'high' },
      { label: 'Free T4', value: '۰٫۷ ng/dL', reference: '۰٫۸–۱٫۸', state: 'watch' },
      { label: 'Anti-TPO', value: '۲۴۵ IU/mL', reference: 'کمتر از ۳۵', state: 'high' },
      { label: 'LDL', value: '۱۴۶ mg/dL', reference: 'هدف وابسته به خطر فردی', state: 'watch' },
      { label: 'هموگلوبین', value: '۱۲٫۸ g/dL', reference: 'در محدوده آزمایشگاه', state: 'normal' },
      { label: 'نبض استراحت', value: '۶۴ در دقیقه', reference: 'بدون علامت هشدار', state: 'normal' },
    ],
    roadmap: [
      { month: 'هفته ۱–۲', title: 'مرور نشانه‌ها و سابقه درمان', detail: 'بررسی خستگی، تغییر وزن، داروها، مکمل‌ها و نحوه مصرف؛ تصمیم با پزشک.', owner: 'پزشک و عضو', priority: 'بالا' },
      { month: 'هفته ۲', title: 'آموزش زمان‌بندی صحیح دارو', detail: 'در صورت مصرف داروی تیروئید، فاصله با غذا و مکمل‌ها طبق دستور پزشک مرور شود.', owner: 'داروساز یا پرستار', priority: 'معمول' },
      { month: 'هفته ۶–۸', title: 'تکرار TSH و Free T4', detail: 'پس از هر تغییر پزشک‌محور، آزمایش در بازه تعیین‌شده تکرار و روند مقایسه شود.', owner: 'پزشک', priority: 'بالا' },
      { month: 'ماه ۳–۶', title: 'بازبینی نشانه‌ها و چربی خون', detail: 'مقایسه علائم، وزن و چربی خون پس از پایدارشدن وضعیت تیروئید.', owner: 'عضو و تیم همیار', priority: 'معمول' },
      { month: 'ماه ۶–۱۲', title: 'پایش پایدار و برنامه سالانه', detail: 'در صورت تثبیت، زمان پایش بعدی براساس وضعیت فرد و نظر پزشک تعیین شود.', owner: 'پزشک', priority: 'معمول' },
    ],
  },
];

const stateLabel = { high: 'بالاتر از محدوده', watch: 'نیازمند توجه', normal: 'پایدار' };

export default function DemoShowcase() {
  const [activeId, setActiveId] = useState(profiles[0].id);
  const [workflowStatus, setWorkflowStatus] = useState('pending');
  const [doctorPlan, setDoctorPlan] = useState<{ recommendations: string; medication: string; followUp: string } | null>(null);
  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0];

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('case');
    if (requested && profiles.some((profile) => profile.id === requested)) setActiveId(requested);
  }, []);

  useEffect(() => {
    setWorkflowStatus(localStorage.getItem(`hamyar-demo-workflow-${activeId}`) ?? 'pending');
    const savedPlan = localStorage.getItem(`hamyar-demo-doctor-plan-${activeId}`);
    setDoctorPlan(savedPlan ? JSON.parse(savedPlan) as { recommendations: string; medication: string; followUp: string } : null);
  }, [activeId]);

  const workflowLabel = workflowStatus === 'published' ? 'برنامه توسط پزشک منتشر شده' : workflowStatus === 'reviewed' ? 'نتایج توسط پزشک تأیید شده' : 'در انتظار مرور پزشک';
  return <div className="demo-workspace">
    <div className="demo-tabs" role="tablist" aria-label="انتخاب پرونده نمونه">
      {profiles.map((profile) => <button key={profile.id} type="button" role="tab" aria-selected={profile.id === active.id} className={profile.id === active.id ? 'active' : ''} onClick={() => setActiveId(profile.id)}><span>پرونده نمونه</span><b>{profile.shortTitle}</b></button>)}
    </div>
    <div className="demo-flowbar"><div><span className={`workflow-dot ${workflowStatus}`} /><b>{workflowLabel}</b><small>وضعیت زنده همین پرونده در سناریوی دمو</small></div><a href={`/clinical/demo?case=${active.id}`}>ادامه در پنل پزشک ←</a></div>
    <section className={`demo-profile ${active.accent}`}><div><span className="demo-label">نسخه نمایشی · اطلاعات کاملاً ساختگی</span><h2>{active.title}</h2><p>{active.person} · {active.age}</p></div><aside><small>وضعیت پیگیری</small><strong>{active.status}</strong></aside></section>
    <section className="demo-summary"><div><span>تصویر سلامت نمونه</span><h2>جمع‌بندی قابل‌فهم برای عضو</h2></div><p>{active.summary}</p><small>این سناریو فقط برای نمایش محصول است و جایگزین تشخیص، نسخه یا ویزیت پزشکی نیست.</small></section>
    {workflowStatus === 'published' && doctorPlan && <section className="demo-published-plan"><header><span>منتشرشده توسط پزشک</span><h2>توصیه‌ها و برنامه درمان</h2></header><div className="member-clinical-plan"><article><span>توصیه‌های پزشک</span><p>{doctorPlan.recommendations}</p></article><article><span>داروها و تغییرات دارویی</span><p>{doctorPlan.medication || 'تغییر دارویی ثبت نشده است.'}</p></article><article><span>پیگیری بعدی</span><p>{doctorPlan.followUp}</p></article></div><small>داروها را فقط مطابق نسخه پزشک مصرف کنید و هیچ دارویی را خودسرانه تغییر ندهید.</small></section>}
    <section id="demo-results" className="demo-results" aria-labelledby="demo-results-title"><header><div><span>نتایج نمونه</span><h2 id="demo-results-title">شاخص‌های کلیدی</h2></div><b>{active.results.length.toLocaleString('fa-IR')} نتیجه</b></header><div>{active.results.map((result) => <article key={result.label}><div><span>{result.label}</span><strong>{result.value}</strong><small>{result.reference}</small></div><em className={`result-${result.state}`}>{stateLabel[result.state]}</em></article>)}</div></section>
    <section id="demo-roadmap" className="demo-roadmap" aria-labelledby="demo-roadmap-title"><header><div><span>مسیر همراهی نمونه</span><h2 id="demo-roadmap-title">نقشه راه ۱۲ ماهه</h2></div><b>۵ اقدام زمان‌دار</b></header><div className="demo-roadmap-list">{active.roadmap.map((action, index) => <article key={action.title}><b>{String(index + 1).padStart(2, '0')}</b><div><span>{action.month} · اولویت {action.priority}</span><h3>{action.title}</h3><p>{action.detail}</p><small>مسئول: {action.owner}</small></div></article>)}</div></section>
  </div>;
}
