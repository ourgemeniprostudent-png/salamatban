import { build } from 'esbuild';
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { demoBindings } from './bundle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist-demo');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: root, entryPoints: ['demo/main.tsx'], outdir: output,
  entryNames: 'app', assetNames: 'assets/[name]-[hash]', bundle: true,
  format: 'esm', platform: 'browser', target: ['es2022'], minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.sql': 'text', '.woff2': 'file' },
  alias: { '@': root },
  plugins: [demoBindings(root)],
});
await cp(path.join(root, 'node_modules/sql.js/dist/sql-wasm.wasm'), path.join(output, 'sql-wasm.wasm'));
await cp(path.join(root, 'public/favicon.svg'), path.join(output, 'favicon.svg'));
await cp(path.join(root, 'public/og.png'), path.join(output, 'og.png'));
await cp(path.join(root, 'public/brand'), path.join(output, 'brand'), { recursive: true });
await cp(path.join(root, 'public/fonts'), path.join(output, 'fonts'), { recursive: true });
const jsVersion = createHash('sha256').update(await readFile(path.join(output, 'app.js'))).digest('hex').slice(0, 12);
const cssVersion = createHash('sha256').update(await readFile(path.join(output, 'app.css'))).digest('hex').slice(0, 12);
await writeFile(path.join(output, 'index.html'), `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="سلامت‌بان؛ از شناخت سلامت تا برنامهٔ پزشک و پیگیری قدم‌به‌قدم."><meta property="og:title" content="سلامت‌بان | همراهِ مسیر سلامت شما"><meta property="og:description" content="پرونده سلامت، برنامه شخصی و همراهی تیم مراقبت"><meta property="og:image" content="./og.png"><title>سلامت‌بان | نسخهٔ نمایشی</title><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./app.css?v=${cssVersion}"></head><body><div id="app">در حال آماده‌سازی نسخهٔ نمایشی…</div><noscript>برای نمایش نرم‌افزار، JavaScript مرورگر باید فعال باشد.</noscript><script type="module" src="./app.js?v=${jsVersion}"></script></body></html>`);
await writeFile(path.join(output, '.htaccess'), `DirectoryIndex index.html
<IfModule mod_mime.c>
AddType application/wasm .wasm
</IfModule>
<IfModule mod_headers.c>
Header always set X-Robots-Tag "noindex, nofollow"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "same-origin"
<FilesMatch "^(index\\.html|app\\.js|app\\.css)$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>
`);
console.log('Static presentation built in site/dist-demo. Upload its contents to a dedicated HTTPS folder.');
