'use client';
export function UrgentNotice({demo,persisted,clinician,onRefresh,onSupport,busy=false}:{demo:boolean;persisted:boolean;clinician?:{name:string;demoPhone?:string};onRefresh:()=>void;onSupport:()=>void;busy?:boolean}){
 return <section className="p-alert danger ux-urgent-notice" tabIndex={-1} aria-label="راهنمای توقف پرداخت برای بررسی پزشک">
  <h3>پرداخت منتظر بررسی علامت هشدار توسط پزشک است</h3>
  <p>در بخش «علائم مهم»، دست‌کم یکی از پاسخ‌های فعلی یا قبلی «بله» بوده است. تا ثبت بررسی پزشک، پرداخت و ارسال عادی پرونده متوقف می‌ماند؛ پاسخ‌ها پاک نشده‌اند.</p>
  <p>{persisted?`این پرونده برای بررسی علامت هشدار در صف ${clinician?.name||'پزشک مسئول'} قرار دارد؛ برای دیده‌شدن توسط پزشک نیازی به پرداخت یا ارسال دوباره نیست.`:'ابتدا رضایت و پاسخ‌ها را ذخیره کنید تا هشدار در صف پزشک قرار بگیرد. وضعیت ذخیره در بالای صفحه دیده می‌شود.'} تغییر پاسخ به «خیر» به‌تنهایی هشدار ثبت‌شده را نمی‌بندد.</p>
  {demo&&<details open><summary>برای ادامهٔ آزمون با اطلاعات ساختگی چه کنم؟</summary><ol><li>در همین مرورگر از حساب کاربر خارج شوید و با حساب پزشک مسئول {clinician?.demoPhone?<bdi>{clinician.demoPhone}</bdi>:'(برای کاربران نمونه با تخصیص پیش‌فرض: 09000000011)'} وارد شوید.</li><li>پرونده را از «پرونده‌های من» انتخاب کنید؛ در «یادداشت بررسی یا درخواست تکمیل» نتیجهٔ بررسی را بنویسید و «ثبت بررسی انسانی علامت هشدار» را بزنید.</li><li>به حساب همین کاربر برگردید و پس از تازه‌سازی، پرداخت را ادامه دهید. از «شروع دوبارهٔ نمایش» استفاده نکنید؛ آن دکمه اطلاعات نمونه را پاک می‌کند.</li></ol></details>}
  <p><strong>اگر این علامت واقعی و شدید است، منتظر سامانه نمانید؛ با اورژانس ۱۱۵ تماس بگیرید یا به مرکز درمانی مراجعه کنید.</strong></p>
  <div className="p-actions"><button className="p-secondary" disabled={busy} onClick={onRefresh}>بررسی دوباره وضعیت پزشک</button><button className="p-link" onClick={onSupport}>پیگیری از پشتیبانی</button></div>
 </section>;
}
