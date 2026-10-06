'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const cases = [
  { id: 'diabetes', initials: 'ما', name: 'مریم احمدی', age: '۵۴ سال', condition: 'دیابت نوع ۲', finding: 'HbA1c: ۸٫۴٪', status: 'نیازمند پیگیری نزدیک', tone: 'urgent', recommendations: 'ثبت قند طبق برنامه، کاهش نوشیدنی شیرین، پیاده‌روی متناسب با توان و مراجعه زودتر در صورت افت قند یا بدحالی.', medication: 'ادامه داروهای فعلی طبق نسخه تا ویزیت؛ هرگونه تغییر مقدار یا داروی جدید پس از ارزیابی حضوری پزشک.', followUp: 'ویزیت طی ۲ هفته؛ تکرار HbA1c در ۳ ماه و تکمیل بررسی کلیه، چشم و پا.' },
  { id: 'hypertension', initials: 'رک', name: 'رضا کریمی', age: '۶۱ سال', condition: 'فشارخون بالا', finding: 'میانگین خانه: ۱۵۱/۹۴', status: 'مرور پزشک در اولویت', tone: 'urgent', recommendations: 'ثبت فشارخون صبح و شب برای ۷ روز، کاهش نمک و مراجعه فوری در صورت درد قفسه سینه، تنگی نفس یا علائم عصبی.', medication: 'ادامه درمان فعلی طبق نسخه؛ نیاز به تنظیم دارو پس از بررسی ثبت فشارخون و معاینه پزشک.', followUp: 'مرور ثبت فشارخون طی ۱ تا ۲ هفته و پایش کراتینین و پتاسیم طبق تصمیم پزشک.' },
  { id: 'thyroid', initials: 'سم', name: 'سارا محمدی', age: '۳۸ سال', condition: 'کم‌کاری تیروئید', finding: 'TSH: ۹٫۲ mIU/L', status: 'آماده مرور بالینی', tone: 'normal', recommendations: 'مرور نحوه مصرف دارو، فاصله با غذا و مکمل‌ها و ثبت تغییرات خستگی، وزن و ضربان.', medication: 'در صورت مصرف لووتیروکسین، ادامه طبق نسخه فعلی؛ هر تغییر مقدار فقط پس از ارزیابی پزشک.', followUp: 'ویزیت برای تصمیم درمانی و تکرار TSH و Free T4 حدود ۶ تا ۸ هفته پس از هر تغییر پزشک‌محور.' },
];

type DemoStatus = 'pending' | 'reviewed' | 'published';
type DoctorPlan = { recommendations: string; medication: string; followUp: string };

export default function DemoDoctorPanel() {
  const [statuses, setStatuses] = useState<Record<string, DemoStatus>>({ diabetes: 'pending', hypertension: 'pending', thyroid: 'pending' });
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState('');
  const [plan, setPlan] = useState<DoctorPlan>({ recommendations: '', medication: '', followUp: '' });
  const [medicationConfirmed, setMedicationConfirmed] = useState(false);

  useEffect(() => {
    setStatuses(Object.fromEntries(cases.map((item) => [item.id, (localStorage.getItem(`hamyar-demo-workflow-${item.id}`) as DemoStatus | null) ?? 'pending'])));
  }, []);

  function update(id: string, next: DemoStatus) {
    localStorage.setItem(`hamyar-demo-workflow-${id}`, next);
    setStatuses((current) => ({ ...current, [id]: next }));
    setNotice(next === 'reviewed' ? 'نتایج با موفقیت تأیید شد.' : 'تصویر سلامت و نقشه راه برای عضو منتشر شد.');
  }

  function openEditor(id: string) {
    const item = cases.find((entry) => entry.id === id)!;
    const saved = localStorage.getItem(`hamyar-demo-doctor-plan-${id}`);
    setPlan(saved ? JSON.parse(saved) as DoctorPlan : { recommendations: item.recommendations, medication: item.medication, followUp: item.followUp });
    setMedicationConfirmed(false);
    setEditingId(id);
    setNotice('');
  }

  function savePlan() {
    if (!editingId || plan.recommendations.trim().length < 5 || plan.followUp.trim().length < 5 || (plan.medication.trim() && !medicationConfirmed)) {
      setNotice('توصیه، پیگیری و تأیید مسئولیت دارویی را کامل کنید.');
      return;
    }
    localStorage.setItem(`hamyar-demo-doctor-plan-${editingId}`, JSON.stringify(plan));
    update(editingId, 'reviewed');
    setEditingId('');
  }

  function reset() {
    for (const item of cases) { localStorage.removeItem(`hamyar-demo-workflow-${item.id}`); localStorage.removeItem(`hamyar-demo-doctor-plan-${item.id}`); }
    setStatuses({ diabetes: 'pending', hypertension: 'pending', thyroid: 'pending' });
    setNotice('سناریوی دمو از ابتدا آماده شد.');
  }

  return <>
    <div className="doctor-demo-toolbar"><div><b>جریان واقعی‌نما</b><span>نتیجه را تأیید و سپس برنامه را منتشر کنید؛ وضعیت در نمای بیمار هم دیده می‌شود.</span></div><button type="button" onClick={reset}>بازنشانی دمو</button></div>
    {notice && <div className="demo-toast" role="status">✓ {notice}</div>}
    <section className="doctor-case-grid">{cases.map((item) => {
      const status = statuses[item.id];
      return <article key={item.condition}>
        <header><i>{item.initials}</i><div><b>{item.name}</b><span>{item.age} · پرونده ساختگی</span></div><em className={item.tone === 'urgent' ? 'priority urgent' : 'priority'}>{item.tone === 'urgent' ? 'اولویت بالا' : 'عادی'}</em></header>
        <div><span>موضوع اصلی</span><h2>{item.condition}</h2></div>
        <dl><div><dt>یافته کلیدی</dt><dd>{item.finding}</dd></div><div><dt>وضعیت</dt><dd>{status === 'published' ? 'منتشرشده برای عضو' : status === 'reviewed' ? 'تأییدشده توسط پزشک' : item.status}</dd></div></dl>
        <Link href={`/demo?case=${item.id}`}>مشاهده نتایج و نقشه راه ←</Link>
        <div className="doctor-demo-actions">
          <button type="button" disabled={status === 'published'} onClick={() => openEditor(item.id)}>{status === 'pending' ? 'نوشتن توصیه و دارو' : 'ویرایش برنامه پزشک'}</button>
          <button type="button" disabled={status !== 'reviewed'} onClick={() => update(item.id, 'published')}>{status === 'published' ? 'برنامه منتشر شد' : 'انتشار برنامه'}</button>
        </div>
      </article>;
    })}</section>
    {editingId && <section className="demo-doctor-editor">
      <header><div><span>ثبت برنامه توسط پزشک</span><h2>{cases.find((item) => item.id === editingId)?.name}</h2></div><button type="button" onClick={() => setEditingId('')}>بستن</button></header>
      <div className="clinical-plan-fields">
        <label><span>توصیه‌های پزشک</span><textarea rows={6} value={plan.recommendations} onChange={(event) => setPlan((current) => ({ ...current, recommendations: event.target.value }))} /></label>
        <label><span>داروها و تغییرات دارویی</span><textarea rows={6} value={plan.medication} onChange={(event) => setPlan((current) => ({ ...current, medication: event.target.value }))} /></label>
        <label><span>برنامه پیگیری</span><textarea rows={6} value={plan.followUp} onChange={(event) => setPlan((current) => ({ ...current, followUp: event.target.value }))} /></label>
      </div>
      <label className="medication-attestation"><input type="checkbox" checked={medicationConfirmed} onChange={(event) => setMedicationConfirmed(event.target.checked)} /><span><b>تأیید مسئولیت بالینی دارو</b><small>این برنامه پس از بررسی پزشک ثبت شده و جایگزین نسخه رسمی خارج از سامانه نیست.</small></span></label>
      <button type="button" className="submit-button" onClick={savePlan}>ذخیره برنامه و تأیید نتایج</button>
    </section>}
  </>;
}
