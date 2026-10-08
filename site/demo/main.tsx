import { createRoot } from 'react-dom/client';
import Pilot from '../app/pilot/pilot';
import { createDemoBackend } from './backend';
import './presentation.css';
import '../app/pilot/pilot.css';
import '../app/pilot/visual-language.css';

declare const __SALAMATBAN_MAPS_GATEWAY_URL__: string | null;

async function main() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const backend = await Promise.race([
    createDemoBackend(),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('دریافت برنامه یا دسترسی به ذخیره‌سازی بیش از حد طول کشید.')), 45000); }),
  ]).finally(() => clearTimeout(timer));
  createRoot(document.getElementById('app')!).render(<div className="presentation-mode">
    <aside className="presentation-note" aria-label="راهنمای نسخه نمایشی">
      <div><strong>نسخهٔ نمایشی برای بررسی کارفرما</strong><p>اطلاعات فقط در همین مرورگر ذخیره می‌شوند. برای بررسی نقش‌ها از حساب‌های ساختگی استفاده کنید؛ اطلاعات واقعی وارد نکنید.</p></div>
      <button type="button" onClick={() => {
        if (confirm('اطلاعات ساختگی همین نسخه پاک شود و نمایش از ابتدا شروع شود؟')) {
          void backend.reset().catch(() => alert('پاک‌کردن اطلاعات انجام نشد؛ دوباره تلاش کنید.'));
        }
      }}>شروع دوبارهٔ نمایش</button>
    </aside>
    <Pilot transport={backend.fetch} hospitalLookupEndpoint={__SALAMATBAN_MAPS_GATEWAY_URL__} homeHref="./" loginImageHref="./media/care-team.webp" brandHref="./brand/index.html" downloadFile={backend.downloadFile} saveMessage="تغییرات در همین مرورگر ذخیره شد." />
  </div>);
}
void main().catch((error: Error) => {
  const root = document.getElementById('app')!;
  root.textContent = `نسخهٔ نمایشی بارگذاری نشد. ${error.message} اگر ذخیره‌سازی مرورگر مسدود است، آن را برای این سایت فعال کنید.`;
  root.setAttribute('role', 'alert');
  const retry = document.createElement('button');
  retry.textContent = 'تلاش دوباره برای بارگذاری';
  retry.onclick = () => location.reload();
  root.appendChild(retry);
});
