import { build } from 'esbuild';
import { mkdir, writeFile, cp, rm } from 'node:fs/promises';
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
await writeFile(path.join(output, 'index.html'), `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>سلامت‌بان | نسخهٔ نمایشی</title><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./app.css"></head><body><div id="app">در حال آماده‌سازی نسخهٔ نمایشی…</div><noscript>برای نمایش نرم‌افزار، JavaScript مرورگر باید فعال باشد.</noscript><script type="module" src="./app.js"></script></body></html>`);
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
