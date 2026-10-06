import AdminShell from '../../components/admin-shell';
import DemoDoctorPanel from './demo-doctor-panel';

export default function ClinicalDemoPage() {
  return <AdminShell active="/clinical/demo">
    <div className="admin-page-head"><div><p>پنل پزشک · داده‌های ساختگی</p><h1>پرونده‌های نمایشی</h1></div><div className="head-summary"><b>۳</b><span>پرونده آماده دمو</span></div></div>
    <section className="doctor-demo-notice"><b>محیط نمایش محصول</b><span>این پرونده‌ها به فرد واقعی تعلق ندارند. اعداد و برنامه‌ها فقط برای نمایش جریان مرور انسانی و انتشار نقشه راه هستند.</span></section>
    <DemoDoctorPanel />
  </AdminShell>;
}
