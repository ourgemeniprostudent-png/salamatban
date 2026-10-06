import { createRoot } from 'react-dom/client';
import Pilot from '../app/pilot/pilot';
import { createDemoBackend } from './backend';
import './presentation.css';
import '../app/pilot/pilot.css';

async function main() {
  const backend = await createDemoBackend();
  createRoot(document.getElementById('app')!).render(<>
    <aside className="presentation-note" aria-label="راهنمای نسخه نمایشی">
      <div><strong>نسخهٔ نمایشی برای بررسی کارفرما</strong><p>اطلاعات فقط در همین مرورگر ذخیره می‌شوند. برای بررسی نقش‌ها از حساب‌های ساختگی استفاده کنید؛ اطلاعات واقعی وارد نکنید.</p></div>
      <button type="button" onClick={() => {
        if (confirm('اطلاعات ساختگی همین نسخه پاک شود و نمایش از ابتدا شروع شود؟')) {
          void backend.reset().catch(() => alert('پاک‌کردن اطلاعات انجام نشد؛ دوباره تلاش کنید.'));
        }
      }}>شروع دوبارهٔ نمایش</button>
    </aside>
    <Pilot transport={backend.fetch} homeHref="./" downloadFile={backend.downloadFile} saveMessage="تغییرات در همین مرورگر ذخیره شد." />
  </>);
}
void main().catch((error: Error) => {
  const root = document.getElementById('app')!;
  root.textContent = `نسخهٔ نمایشی بارگذاری نشد. ${error.message} اگر ذخیره‌سازی مرورگر مسدود است، آن را برای این سایت فعال کنید.`;
  root.setAttribute('role', 'alert');
});
