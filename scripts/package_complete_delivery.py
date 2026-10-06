#!/usr/bin/env python3
"""Build a complete delivery from current sources, never an older delivery ZIP.
Requires the tested site/dist-demo, current evidence, Python 3, Node, Playwright
and Chromium. No runtime data, secrets, dependency caches or old ZIPs exported.
"""
import base64
import hashlib
import html
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
from delivery_docs import VERSION, APP_VERSION, DOCS, MIRRORS, digest, linked, markdown, page

NAME = f'Salamatban-Complete-Delivery-v{VERSION}'
OUTPUT = ROOT / 'deliverables' / f'{NAME}.zip'
BUILD = ROOT / 'site/dist-demo'

if not (BUILD/'release.json').is_file():raise SystemExit('Run npm run build:demo first')
release=json.loads((BUILD/'release.json').read_text())
evidence=json.loads((ROOT/'review-evidence/ux-release.json').read_text())
if evidence['version']!=APP_VERSION or release['version']!=APP_VERSION:raise SystemExit('App/evidence versions do not match this delivery')

with tempfile.TemporaryDirectory(prefix='salamatban-delivery-') as temp:
 dest=Path(temp)/NAME;dest.mkdir()
 for directory in ['documents','technical']: (dest/directory).mkdir()
 for path in (ROOT/'scripts/delivery-template').iterdir():shutil.copy2(path,dest/path.name)
 for n in ['Start-Mac-Linux.command','serve-demo.py']:(dest/n).chmod(0o755)
 try:
  git_root=Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],cwd=ROOT,stderr=subprocess.DEVNULL).decode().strip())
 except subprocess.CalledProcessError:git_root=None
 source_paths=(subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0') if git_root==ROOT else [p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and not any(x in {'node_modules','.git','.wrangler','.test-build','dist','dist-demo','__pycache__'} for x in p.relative_to(ROOT).parts)])
 for name in sorted(set(source_paths)):
  if not name or name.startswith('deliverables/Salamatban-Complete-Delivery-') or name in {'review-evidence/ux-archive-validation.json','deliverables/delivery-manifest.json'}:continue
  path=ROOT/name;parts=Path(name).parts
  if any(p in {'.git','node_modules','.wrangler','.test-build','dist','dist-demo','.next','__pycache__'} for p in parts):continue
  if path.is_symlink():raise SystemExit(f'Source symlink requires review: {name}')
  if not path.is_file():continue
  allowed=name in {'README.md','AGENTS.md'} or name.startswith(('site/','scripts/')) or (name.startswith(('deliverables/','review-evidence/','deployments/')) and path.suffix in {'.md','.csv','.sql','.json','.log'}) or name in {'deliverables/Salamatban-Visual-Identity.pdf','deliverables/Salamatban-Preview.png','deliverables/Salamatban-Mobile-Preview.png'} or (name.startswith('review-evidence/') and path.suffix=='.png')
  if not allowed or (path.name.startswith(('.env','.dev.vars')) and path.name!='.dev.vars.example') or path.suffix in {'.sqlite','.db','.pem','.zip','.tsbuildinfo'}:continue
  target=dest/'source'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
 shutil.copytree(BUILD,dest/'website')
 mirrors=[]
 for origin,target in MIRRORS.items():
  p=dest/target;p.parent.mkdir(parents=True,exist_ok=True)
  if p.suffix=='.md':p.write_text(linked((ROOT/origin).read_text(),origin,target))
  else:shutil.copy2(ROOT/origin,p)
  mirrors.append({'source':'source/'+origin,'path':target,'transformation':'relative Markdown links only' if p.suffix=='.md' else 'identical'})
 for n in ['Salamatban-Visual-Identity.pdf','Salamatban-Preview.png','Salamatban-Mobile-Preview.png']:
  shutil.copy2(ROOT/'deliverables'/n,dest/'documents'/n)
 for n in ['ux-city-form.png','ux-upload.png','ux-location-320.png','ux-question-390.png','ux-options-320.png','ux-payment-receipt-390.png','ux-doctor-workflow.png','ux-coordinator-workflow.png','ux-urgent-guide-390.png']:
  p=ROOT/'site/.test-build'/n
  if p.exists():shutil.copy2(p,dest/'documents'/n)
 font=base64.b64encode((ROOT/'site/public/fonts/PeydaWebFaNum-Regular.woff2').read_bytes()).decode()
 css='@font-face{font-family:Peyda;src:url(data:font/woff2;base64,'+font+')}*{box-sizing:border-box}body{font-family:Peyda,sans-serif;line-height:1.9;color:#153653;margin:0;background:#f5f9ff}main{max-width:1050px;margin:auto;padding:32px}section{background:white;padding:24px;margin:20px 0;border:1px solid #d7e4ef;border-radius:16px}a{color:#245abb;overflow-wrap:anywhere}h1,h2,h3,h4,h5{line-height:1.5;break-after:avoid}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:12px}td,th{border:1px solid #ccd8e3;padding:7px;vertical-align:top;overflow-wrap:anywhere}code{direction:ltr;unicode-bidi:embed;overflow-wrap:anywhere}pre{direction:ltr;text-align:left;white-space:pre-wrap;font-size:11px}img{max-width:100%;height:auto}tr{break-inside:avoid}@media(max-width:600px){main{padding:12px}section{padding:14px}}@media print{body{background:white;font-size:12px}main{padding:0;max-width:none}section{border:0;border-radius:0;padding:0;break-before:page}a{color:inherit;text-decoration:none}table{font-size:10px}pre{font-size:9px}}@page{size:A4;margin:16mm}'
 intro='<h1>سلامت‌بان — تحویل هماهنگ ۱٫۷٫۱</h1><p>برنامهٔ داخل بسته و سایت عمومی: <strong>۱٫۷</strong>. این اصلاح مربوط به مستندات و بسته‌بندی است.</p>'
 navigation='<p><a href="https://ourgemeniprostudent-png.github.io/salamatban/?v=1.7">مشاهده سایت آنلاین</a> · <a href="documents/Salamatban-Complete-Guide-fa.html">راهنمای جامع HTML</a> · <a href="documents/Salamatban-Complete-Guide-fa.pdf">راهنمای PDF</a></p>'
 contents='<section><h2>مرجع‌های هماهنگ این بسته</h2>'+''.join('<p><a href="technical/'+n+'">'+html.escape((ROOT/'deliverables'/n).read_text().splitlines()[0].lstrip('# '))+'</a></p>' for n in DOCS)+'</section>'
 launch='<section><h2>اجرای محلی</h2><p>همه ZIP را استخراج کنید. Python 3 باید نصب باشد. <a href="Start-Windows.cmd">اجراگر ویندوز</a> یا <a href="Start-Mac-Linux.command">اجراگر مک/لینوکس</a> را اجرا کنید؛ راه دیگر در ترمینال: <code>python3 serve-demo.py</code>. نقشه و جست‌وجوی مکان اینترنت می‌خواهند؛ آدرس دستی و فرم محلی‌اند.</p><p><a href="website/index.html">ورودی سایت داخل بسته</a> در حالت فایل، راهنمای اجرای محلی نشان می‌دهد. داده بین دستگاه‌ها مشترک نیست؛ برای بررسی نقش‌ها در همین مرورگر تغییر حساب دهید.</p><p>حساب عضو: <bdi>09000000001</bdi>؛ پزشک: <bdi>09000000011</bdi>؛ کارشناس: <bdi>09000000012</bdi>؛ مدیر: <bdi>09000000013</bdi>. کد نمایشی بعد از درخواست روی صفحه است.</p></section>'
 for n in ['index.html','00-START-HERE.html']:(dest/n).write_text(page('سلامت‌بان | بستهٔ ۱٫۷٫۱',intro+navigation+launch+contents,css))
 (dest/'README-fa.txt').write_text('بستهٔ سلامت‌بان ۱٫۷٫۱؛ برنامهٔ داخل آن ۱٫۷ است.\nاز index.html یا 00-START-HERE.html شروع کنید.\nهمهٔ ZIP را استخراج کنید؛ Python 3 برای اجرای محلی لازم است. اجراگر ویندوز یا مک/لینوکس یا python3 serve-demo.py را اجرا کنید.\nwebsite/ خروجی آماده، source/ سورس و منابع جاری، technical/ اسناد با لینک متناسب با بسته و documents/ راهنمای HTML/PDF است.\nمرجع جاری: technical/DELIVERY-STATUS-fa.md. گزارش‌های تاریخی، طرح PostgreSQL آینده و تصاویر هویت در آن مشخص شده‌اند.\nراهنمای جامع از همین اسناد ساخته شده؛ CONTENTS.json فهرست منابع و MANIFEST.json هش همه فایل‌هاست.\nنسخه عمومی نمایشی و با داده محلی مرورگر است. پرداخت و SMS واقعی ندارد. نقشه اینترنت می‌خواهد.\n')
 guide_output='documents/Salamatban-Complete-Guide-fa.html'
 toc='<nav><h2>فهرست</h2>'+''.join(f'<p><a href="#doc-{i}">{html.escape((ROOT/"deliverables"/n).read_text().splitlines()[0].lstrip("# "))}</a></p>' for i,n in enumerate(DOCS))+'</nav>'
 sections=[]
 for i,n in enumerate(DOCS):
  origin='deliverables/'+n
  sections.append(f'<section id="doc-{i}">'+markdown(linked((ROOT/origin).read_text(),origin,guide_output))+'</section>')
 guide=dest/guide_output;guide.write_text(page('سلامت‌بان — راهنمای جامع تحویل ۱٫۷٫۱',intro+'<p>تولیدشده از منابع جاری؛ تاریخ آزمون‌های برنامه در گزارش اصلی حفظ شده است.</p>'+toc+''.join(sections),css))
 renderer="""const {chromium}=await import(process.argv[1]);const {readFile}=await import('node:fs/promises');const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{const p=await b.newPage();await p.setContent(await readFile(process.argv[2],'utf8'),{waitUntil:'load'});await p.evaluate(()=>document.fonts.ready);await p.pdf({path:process.argv[3],format:'A4',printBackground:true,preferCSSPageSize:true});}finally{await b.close();}"""
 subprocess.run(['node','--input-type=module','-e',renderer,(ROOT/'site/node_modules/playwright/index.mjs').as_uri(),str(guide),str(guide.with_suffix('.pdf'))],check=True)
 catalog={'packageVersion':VERSION,'appVersion':APP_VERSION,'scope':'documentation and packaging correction; app assets unchanged','guideSources':['source/deliverables/'+n for n in DOCS],'mirrors':mirrors,'currentAppEvidence':['source/review-evidence/'+n for n in ['ux-release.json','api-tests.json','ux-tests.json','workflow-tests.json','edge-tests.json','ux-final-browser.json','ux-publication.json']],'packageEvidence':'source/review-evidence/delivery-consistency-v1.7.1.json','historicalEvidence':'Other review-evidence reports/logs retain their original scope and dates; not new app test results','designEvidence':'architecture-database-validation.json validates the proposed PostgreSQL schema only','historicalInputs':['source/deliverables/prd-source.json','source/deliverables/execution-backlog.json','source/deliverables/readiness.json'],'identityIllustrations':'Salamatban-Preview.png and Salamatban-Mobile-Preview.png are historical identity illustrations, not current UI screenshots'}
 (dest/'CONTENTS.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
 entries=[{'path':p.relative_to(dest).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in sorted(dest.rglob('*')) if p.is_file()]
 (dest/'MANIFEST.json').write_text(json.dumps({'version':VERSION,'appVersion':APP_VERSION,'selfExcluded':'MANIFEST.json','files':entries},ensure_ascii=False,indent=2)+'\n')
 with zipfile.ZipFile(OUTPUT,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(dest.rglob('*')):
   if p.is_file():z.write(p,Path(NAME)/p.relative_to(dest))
 with zipfile.ZipFile(OUTPUT) as z:assert z.testzip() is None
 summary={'file':OUTPUT.name,'bytes':OUTPUT.stat().st_size,'sha256':digest(OUTPUT),'fileCount':len(entries)+1,'version':VERSION,'appVersion':APP_VERSION,'sourceBaseCommit':(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip() if git_root==ROOT else None),'sourceState':'current files identified individually by MANIFEST.json','validation':evidence,'archiveIntegrity':'passed'}
 OUTPUT.with_suffix('.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:summary[k] for k in ['file','bytes','sha256','fileCount','archiveIntegrity']}))
