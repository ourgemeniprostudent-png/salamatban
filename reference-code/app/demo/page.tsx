import Link from 'next/link';
import DemoShowcase from './demo-showcase';

export const metadata = { title: 'دموی پرونده‌های سلامت | همیار سلامت', description: 'سه پرونده کاملاً ساختگی برای نمایش نتایج و نقشه راه ۱۲ ماهه همیار سلامت.' };

export default function DemoPage() {
  return <main className="demo-page">
    <header className="demo-header"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">ه‍</span><span><strong>همیار سلامت</strong><small>نمایش پرونده‌های نمونه</small></span></Link><div><span>داده‌های ساختگی، ویژه نمایش محصول</span><Link href="/clinical">پنل پزشک</Link><Link href="/">صفحه اصلی</Link></div></header>
    <section className="demo-intro"><div><p>دموی نتایج و برنامه سلامت</p><h1>سه پرونده، سه مسیر همراهی متفاوت</h1><span>برای مشاهده نتیجه‌های نمونه و برنامه پیگیری، نوع پرونده را انتخاب کنید.</span></div><div className="demo-safety"><b>مرز ایمنی</b><span>هیچ‌یک از اعداد یا اقدام‌ها متعلق به فرد واقعی نیست و تصمیم درمانی محسوب نمی‌شود.</span></div></section>
    <DemoShowcase />
  </main>;
}
