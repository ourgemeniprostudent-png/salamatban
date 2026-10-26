"""Build a current-only complete v4 delivery, with reproducible source and SHA manifest."""
from pathlib import Path
import base64,hashlib,html,json,shutil,subprocess,tempfile,zipfile
root=Path(__file__).resolve().parent.parent;src=root/'site/journey';build=root/'site/dist-journey';version='4.3.0';name='Salamatban-Complete-Delivery-v'+version;output=root/'deliverables'/(name+'.zip');output.parent.mkdir(exist_ok=True)
release=json.loads((build/'release.json').read_text());assert release['version']==version
verification=json.loads((root/'review-evidence/journey/verification.json').read_text());assert verification['version']==version and not verification['errors']
workflow=json.loads((root/'review-evidence/journey/workflow-verification.json').read_text());assert workflow['version']==version and not workflow['errors']
physician=json.loads((root/'review-evidence/journey/physician-verification.json').read_text());assert physician['version']==version and not physician['errors']
coordinator=json.loads((root/'review-evidence/journey/coordinator-verification.json').read_text());assert coordinator['version']==version and not coordinator['errors']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(build/'index.html')==release['assets']['index.html']
font=base64.b64encode((src/'assets/PeydaWebFaNum-Regular.woff2').read_bytes()).decode()
css="@font-face{font-family:Peyda;src:url(data:font/woff2;base64,"+font+") format('woff2')}*{box-sizing:border-box}body{margin:0;background:white;color:#24466d;font:15px/2 Peyda,Tahoma,sans-serif}main{max-width:940px;margin:auto;padding:45px 24px}h1{font-size:30px}h2{font-size:21px;margin-top:30px}a{color:#326dde}p{margin:10px 0}code{direction:ltr;unicode-bidi:embed;display:inline-block}nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}nav a{padding:10px 18px;background:#eef4ff;border-radius:12px;text-decoration:none}.muted{color:#8195af;font-size:12px}hr{border:0;border-top:1px solid #e5edf8;margin:28px 0}@page{size:A4;margin:18mm}@media print{main{padding:0}h2{break-after:avoid}p{orphans:3;widows:3}}"
def page(title,body):return '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+css+'</style><main>'+body+'</main></html>'
def md(text):
 parts=[]
 for line in text.splitlines():
  if not line.strip():continue
  if line.startswith('# '):parts.append('<h1>'+html.escape(line[2:])+'</h1>')
  elif line.startswith('## '):parts.append('<h2>'+html.escape(line[3:])+'</h2>')
  else:parts.append('<p>'+html.escape(line)+'</p>')
 return ''.join(parts)
with tempfile.TemporaryDirectory(prefix='salamatban-v4-package-') as temp:
 dest=Path(temp)/name;dest.mkdir();(dest/'website/next').mkdir(parents=True);shutil.copytree(build,dest/'website/next',dirs_exist_ok=True)
 for d in ['documents','technical','identity/fonts','source/site','source/scripts','source/review-evidence/journey']:(dest/d).mkdir(parents=True,exist_ok=True)
 shutil.copytree(src,dest/'source/site/journey')
 (dest/'source/site/package.json').write_text(json.dumps({'name':'salamatban-journey-v4','private':True,'type':'module','scripts':{'build':'python3 journey/build.py','test':'node journey/browser.test.mjs && node journey/workflow.test.mjs && node journey/physician.test.mjs && node journey/coordinator.test.mjs'},'devDependencies':{'playwright':'1.63.0'}},indent=2)+'\n')
 for p in (root/'review-evidence/journey').glob('*'):
  if p.is_file() and p.suffix in {'.json','.png'} and p.name!='archive-validation.json':shutil.copy2(p,dest/'source/review-evidence/journey'/p.name)
 for n in ['publish_journey_v4.py','package_journey_v4.py','validate_journey_v4.py','verify_journey_v4.py','test_journey_v4_public.mjs']:shutil.copy2(root/'scripts'/n,dest/'source/scripts'/n)
 shutil.copy2(root/'AGENTS.md',dest/'source/AGENTS.md')
 shutil.copy2(src/'README-fa.md',dest/'source/README.md')
 (dest/'source/scripts/delivery-template').mkdir()
 for n in ['serve-demo.py','Start-Windows.cmd','Start-Mac-Linux.command']:shutil.copy2(root/'scripts/delivery-template'/n,dest/'source/scripts/delivery-template'/n)
 for p in (src/'assets').glob('*.woff2'):shutil.copy2(p,dest/'identity/fonts'/p.name)
 shutil.copy2(src/'assets/favicon.svg',dest/'identity/salamatban.svg')
 for n in ['README-fa.md','architecture-fa.md','readiness.csv','budget.csv','future-schema.sql']:shutil.copy2(src/n,dest/'technical'/n)
 shutil.copy2(src/'proposals/coordinator-dashboard.png',dest/'documents/Coordinator-Proposal.png')
 guide=page('سلامت‌بان | راهنمای نسخه ۴',md((src/'README-fa.md').read_text())+'<hr>'+md((src/'architecture-fa.md').read_text()))
 (dest/'documents/Salamatban-Guide-fa.html').write_text(guide)
 renderer="""import{chromium}from'./site/node_modules/playwright/index.mjs';const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage();const {readFile}=await import('node:fs/promises');await p.setContent(await readFile(process.argv[1],'utf8'));await p.evaluate(()=>document.fonts.ready);await p.pdf({path:process.argv[2],format:'A4',printBackground:true});await b.close();"""
 subprocess.run(['node','--input-type=module','-e',renderer,str(dest/'documents/Salamatban-Guide-fa.html'),str(dest/'documents/Salamatban-Guide-fa.pdf')],cwd=root,check=True)
 landing=page('سلامت‌بان | نسخه ۴','<p class="muted">نسخه ۴.۳ · بیمار، پزشک و کارشناس</p><h1>سلامت‌بان</h1><p>از اولین گفت‌وگو تا هماهنگی مراجعه و توضیح نتیجه؛ با سه بیمار، سه پزشک و دو کارشناس نمونه.</p><nav><a href="https://ourgemeniprostudent-png.github.io/salamatban/next/?v=4.3.0">باز کردن نسخه آنلاین</a><a href="https://ourgemeniprostudent-png.github.io/salamatban/next/?staff=1&amp;v=4.3.0">ورود پزشک و کارشناس</a><a href="documents/Salamatban-Guide-fa.html">راهنمای کوتاه</a><a href="documents/Salamatban-Guide-fa.pdf">راهنمای PDF</a></nav><h2>اجرای همین بسته</h2><p>همه ZIP را استخراج کن. Python 3 لازم است. اجراگر زیر را باز کن یا در پوشه بسته دستور <code>python3 serve-demo.py</code> را اجرا کن.</p><nav><a href="Start-Windows.cmd">اجرای ویندوز</a><a href="Start-Mac-Linux.command">اجرای مک و لینوکس</a><a href="http://127.0.0.1:8765/next/">برنامه محلی بعد از اجرای سرور</a></nav><p class="muted">بازکردن فایل برنامه با file به جای HTTP راهنمای اجرا را نشان می‌دهد. برای حفظ اطلاعات همان مرورگر و پورت را استفاده کن.</p><hr><h2>محدوده این نسخه</h2><p>ورود، سوال‌ها، پزشک، تقویم، خانه و مدارک اختیاری اجرا شده‌اند. داشبورد پزشک و پرونده کامل مریم اجرا شده اند. داشبورد کارشناس با صف کارها، جستجو، مسیر پیگیری و سابقه درخواست به همین پرونده وصل است. کد ورود، نوبت و تماس نمایشی‌اند؛ ذخیره فقط در مرورگر انجام می‌شود.</p><nav><a href="documents/Coordinator-Proposal.png">مرجع تصویری طراحی کارشناس</a><a href="technical/architecture-fa.md">معماری فعلی</a><a href="technical/readiness.csv">آمادگی راه‌اندازی</a><a href="technical/budget.csv">کاربرگ بودجه</a></nav>')
 for n in ['index.html','00-START-HERE.html']:(dest/n).write_text(landing)
 (dest/'website/index.html').write_text(page('سلامت‌بان | اجرای محلی','<h1>سلامت‌بان</h1><p>با اجراگر بسته یا دستور python3 serve-demo.py برنامه را باز کن.</p><p><a href="next/">ورود به نسخه جدید</a></p><p><a href="../00-START-HERE.html">راهنمای شروع</a></p>'))
 for n in ['serve-demo.py','Start-Windows.cmd','Start-Mac-Linux.command']:shutil.copy2(root/'scripts/delivery-template'/n,dest/n)
 for n in ['serve-demo.py','Start-Mac-Linux.command']:(dest/n).chmod(0o755)
 (dest/'README-fa.txt').write_text('سلامت‌بان نسخه ۴\nاز index.html شروع کن. اجرای محلی: python3 serve-demo.py\nحساب‌های نمایشی و داده هر کاربر در همان مرورگر ذخیره می‌شوند. ورود کارکنان با next/?staff=1 است.\nراهنمای جاری documents/Salamatban-Guide-fa.html است. source/site/journey سورس فعال همین نسخه است.\n')
 catalog={'version':version,'entry':'index.html','application':'website/next/index.html','activeSource':'source/site/journey','guide':'documents/Salamatban-Guide-fa.pdf','storage':'per-user IndexedDB on stable HTTP origin','serverAuthentication':False,'staffWorkspaces':'connected local demo','runtimeUserDataIncluded':False}
 (dest/'CONTENTS.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
 manifest={p.relative_to(dest).as_posix():{'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(dest.rglob('*')) if p.is_file()}
 (dest/'MANIFEST.json').write_text(json.dumps({'version':version,'selfExcluded':'MANIFEST.json','files':manifest},ensure_ascii=False,indent=2)+'\n')
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(dest.rglob('*')):
   if p.is_file():z.write(p,name+'/'+p.relative_to(dest).as_posix())
 with zipfile.ZipFile(output) as z:
  assert z.testzip() is None
  for n,v in manifest.items():assert hashlib.sha256(z.read(name+'/'+n)).hexdigest()==v['sha256']
 report={'version':version,'file':output.name,'bytes':output.stat().st_size,'sha256':sha(output),'fileCount':len(manifest)+1,'integrity':'passed','activeSource':'source/site/journey'}
 output.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
