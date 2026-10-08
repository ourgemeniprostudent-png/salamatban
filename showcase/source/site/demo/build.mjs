import { build } from 'esbuild';
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { demoBindings, publicFontAssets } from './bundle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist-demo');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: root, entryPoints: ['demo/main.tsx'], outdir: output,
  entryNames: 'app', assetNames: 'assets/[name]-[hash]', bundle: true,
  format: 'esm', platform: 'browser', target: ['es2022'], minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.sql': 'text', '.woff2': 'file', '.png': 'file' },
  alias: { '@': root },
  plugins: [demoBindings(root), publicFontAssets(root)],
});
await cp(path.join(root, 'node_modules/sql.js/dist/sql-wasm.wasm'), path.join(output, 'sql-wasm.wasm'));
await writeFile(path.join(output, 'THIRD-PARTY-NOTICES.txt'), 'Leaflet 1.9.4\n'+await readFile(path.join(root, 'node_modules/leaflet/LICENSE'), 'utf8')+'\n\nIran city catalog — Ahmad Azizi v3.0 (1399 snapshot)\n'+await readFile(path.join(root, 'lib/data/iran-cities/LICENSE.md'), 'utf8')+'\n\nHospital map results: © OpenStreetMap contributors, ODbL. https://www.openstreetmap.org/copyright\nSearch service: https://nominatim.openstreetmap.org/\n');
await cp(path.join(root, 'public/favicon.svg'), path.join(output, 'favicon.svg'));
await cp(path.join(root, 'public/og.png'), path.join(output, 'og.png'));
await cp(path.join(root, 'public/brand'), path.join(output, 'brand'), { recursive: true });
await cp(path.join(root, 'public/fonts'), path.join(output, 'fonts'), { recursive: true });
await cp(path.join(root, 'public/media'), path.join(output, 'media'), { recursive: true });
const jsVersion = createHash('sha256').update(await readFile(path.join(output, 'app.js'))).digest('hex').slice(0, 12);
const cssVersion = createHash('sha256').update(await readFile(path.join(output, 'app.css'))).digest('hex').slice(0, 12);
const fontPreloads = ['Regular', 'SemiBold', 'Bold'].map(weight => `<link rel="preload" href="./fonts/PeydaWebFaNum-${weight}.woff2" as="font" type="font/woff2" crossorigin>`).join('');
await writeFile(path.join(output, 'index.html'), `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="سلامت‌بان؛ از شناخت سلامت تا برنامهٔ پزشک و پیگیری قدم‌به‌قدم."><meta property="og:title" content="سلامت‌بان | همراهِ مسیر سلامت شما"><meta property="og:description" content="پرونده سلامت، برنامه شخصی و همراهی تیم مراقبت"><meta property="og:image" content="./og.png"><title>سلامت‌بان | نسخهٔ نمایشی</title><style>
body{margin:0}.demo-launch{box-sizing:border-box;max-width:760px;margin:8vh auto;padding:32px;color:#18344d;background:#f4f8fc;border:1px solid #d7e4ef;border-radius:20px;font:17px/2 Peyda,Tahoma,sans-serif}.demo-launch h1{font-size:26px}.demo-launch #launch-status{min-height:4em}.demo-launch #launch-retry[hidden]{display:inline-block;visibility:hidden}.demo-launch a{color:#2755a3}.demo-launch .launch-button{display:inline-block;margin:8px 0;padding:10px 22px;border-radius:12px;background:#346ed1;color:white;text-decoration:none}.demo-launch code{direction:ltr;unicode-bidi:isolate;display:inline-block}.demo-launch [hidden]{display:none}@media(max-width:600px){.demo-launch{margin:20px 12px;padding:22px}.demo-launch #launch-status{min-height:6em}}
</style>${fontPreloads}<link rel="preload" href="./sql-wasm.wasm" as="fetch" type="application/wasm" crossorigin><link rel="modulepreload" href="./app.js?v=${jsVersion}"><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./app.css?v=${cssVersion}"></head><body><div id="app"><main class="demo-launch"><h1>سلامت‌بان</h1><p id="launch-status" role="status">در حال آماده‌سازی نسخهٔ نمایشی…</p><a class="launch-button" href="https://ourgemeniprostudent-png.github.io/salamatban/">مشاهدهٔ سایت آنلاین</a><section id="local-launch" hidden><h2>فایل سایت مستقیم باز شده است</h2><p>برای مشاهدهٔ فوری، دکمهٔ بالا را بزنید؛ نصب برنامه یا حساب گیت‌هاب لازم نیست.</p><p>برای اجرای نسخهٔ داخل بسته بدون اینترنت، ابتدا کل ZIP را استخراج کنید. در پوشهٔ اصلی، <b>Start-Windows.cmd</b> را در ویندوز اجرا کنید؛ در مک/لینوکس از دستور <code>python3 serve-demo.py</code> استفاده کنید. Python 3 باید نصب باشد و پنجرهٔ اجرا باز بماند.</p><p><a href="../00-START-HERE.html">باز کردن راهنمای کامل بسته و مستندات</a></p></section><button id="launch-retry" type="button" hidden onclick="location.reload()">تلاش دوباره برای بارگذاری</button><p id="launch-error" hidden>بارگذاری برنامه کامل نشد. اتصال یا فایل‌های استخراج‌شده را بررسی کنید و دوباره صفحه را باز کنید.</p></main></div><noscript>برای نمایش نرم‌افزار، JavaScript مرورگر باید فعال باشد. لینک سایت آنلاین و راهنمای بسته قابل استفاده‌اند.</noscript><script>
if (location.protocol === 'file:') {
  document.getElementById('launch-status').textContent = 'برای اجرای سایت، یکی از روش‌های زیر را انتخاب کنید.';
  document.getElementById('local-launch').hidden = false;
} else {
  setTimeout(function () {
    var status = document.getElementById('launch-status');
    if (status) { status.textContent = 'دریافت برنامه بیشتر از معمول طول کشیده است؛ لطفاً اتصال اینترنت را بررسی کنید.'; document.getElementById('launch-retry').hidden = false; }
  }, 10000);
  import('./app.js?v=${jsVersion}').catch(function () {
    var status = document.getElementById('launch-status');
    var error = document.getElementById('launch-error');
    if (status) status.textContent = 'سایت بارگذاری نشد.';
    if (error) error.hidden = false;
    document.getElementById('launch-retry').hidden = false;
  });
}
</script></body></html>`);
await writeFile(path.join(output, '.htaccess'), `DirectoryIndex index.html
<IfModule mod_mime.c>
AddType application/wasm .wasm
</IfModule>
<IfModule mod_headers.c>
Header always set X-Robots-Tag "noindex, nofollow"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
<FilesMatch "^(index\\.html|app\\.js|app\\.css)$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>
`);
const releaseAssets = {};
for (const name of ['index.html', 'app.js', 'app.css']) {
  releaseAssets[name] = createHash('sha256').update(await readFile(path.join(output, name))).digest('hex');
}
await writeFile(path.join(output, 'release.json'), JSON.stringify({ version: '2.3', assets: releaseAssets }, null, 2) + '\n');
console.log('Static presentation built in site/dist-demo. Upload its contents to a dedicated HTTPS folder.');
