'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewForm({ reviewId, urgent }: { reviewId:string; urgent:boolean }) {
  const router = useRouter();
  const [status,setStatus] = useState<'idle'|'saving'|'error'>('idle');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus('saving');
    const data=new FormData(event.currentTarget);
    const response=await fetch(`/api/clinical/reviews/${reviewId}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:data.get('action'),notes:data.get('notes'),recommendations:data.get('recommendations'),medicationPlan:data.get('medicationPlan'),followUpPlan:data.get('followUpPlan'),medicationConfirmed:data.get('medicationConfirmed')==='on'})});
    if(!response.ok){setStatus('error');return;} router.push('/clinical/reviews'); router.refresh();
  }
  return <form className="review-form" onSubmit={submit}>
    <label><span>جمع‌بندی و دلیل تصمیم</span><textarea name="notes" minLength={5} maxLength={2000} required rows={6} placeholder="مشاهدات، محدودیت‌ها و دلیل تصمیم را ثبت کنید…" /></label>
    <div className="clinical-plan-fields">
      <label><span>توصیه‌های پزشک برای عضو</span><textarea name="recommendations" minLength={5} maxLength={2000} required rows={5} placeholder="تغذیه، فعالیت، خودپایشی و علائم نیازمند مراجعه…" /></label>
      <label><span>داروها و تغییرات دارویی</span><textarea name="medicationPlan" maxLength={1500} rows={5} placeholder="نام دارو، مقدار، دفعات و مدت—فقط در صورت تصمیم و مسئولیت پزشک. اگر تغییری نیست، بنویسید بدون تغییر." /></label>
      <label><span>برنامه پیگیری</span><textarea name="followUpPlan" minLength={5} maxLength={1500} required rows={5} placeholder="زمان آزمایش بعدی، ویزیت، هدف پایش و شرایط مراجعه زودتر…" /></label>
    </div>
    <label className="medication-attestation"><input type="checkbox" name="medicationConfirmed" /><span><b>تأیید مسئولیت بالینی دارو</b><small>اگر بخش دارو تکمیل شده، ثبت‌کننده تأیید می‌کند تصمیم دارویی توسط پزشک مجاز و پس از بررسی پرونده انجام شده است.</small></span></label>
    <fieldset><legend>تصمیم بازبین</legend>{urgent ? <label><input type="radio" name="action" value="acknowledge_urgent" required /> تأیید مشاهده هشدار و ادامه پیگیری فوری</label> : <label><input type="radio" name="action" value="approve_draft" required /> تأیید برای ایجاد تصویر سلامت پیش‌نویس</label>}<label><input type="radio" name="action" value="request_information" required /> درخواست اطلاعات تکمیلی از عضو</label></fieldset>
    {status==='error'&&<p className="form-error">ثبت تصمیم انجام نشد؛ فیلدهای توصیه، پیگیری و تأیید مسئولیت دارویی را بررسی کنید.</p>}<button className="submit-button" disabled={status==='saving'}>{status==='saving'?'در حال ثبت…':'ثبت تصمیم و برنامه پزشک'}</button>
  </form>;
}
