#!/usr/bin/env python3
"""Build the complete v1.5 delivery from tested outputs and the established guide.
Run npm run build:demo and tests in site first. Requires Node 24, the locked
Playwright package, and Chromium (CHROMIUM_PATH or /usr/bin/chromium).
No databases, credentials, caches or installed dependencies are exported.
"""
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
VERSION = '1.5'
NAME = f'Salamatban-Complete-Delivery-v{VERSION}'
OUTPUT = ROOT / 'deliverables' / f'{NAME}.zip'
PREVIOUS = ROOT / 'deliverables/Salamatban-Complete-Delivery-v1.4.zip'
BUILD = ROOT / 'site/dist-demo'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inline(value):
    value = html.escape(value)
    value = re.sub(r'`([^`]+)`', r'<code>\1</code>', value)
    value = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', value)
    value = re.sub(r'\[([^]]+)\]\(([^)]+)\)', r'\1 (<code>\2</code>)', value)
    return value

def markdown(text):
    result, paragraph, code, table = [], [], None, False
    def flush():
        if paragraph:
            result.append('<p>' + inline(' '.join(paragraph)) + '</p>')
            paragraph.clear()
    for line in text.splitlines():
        if line.startswith('```'):
            flush()
            if code is None:
                code = []
            else:
                result.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>')
                code = None
            continue
        if code is not None:
            code.append(line)
            continue
        if line.startswith('|'):
            flush()
            if re.fullmatch(r'[| :\-]+', line):
                continue
            cells = line.strip('|').split('|')
            if not table:
                result.append('<table><thead><tr>'+''.join('<th>'+inline(c.strip())+'</th>' for c in cells)+'</tr></thead><tbody>')
                table = True
            else:
                result.append('<tr>'+''.join('<td>'+inline(c.strip())+'</td>' for c in cells)+'</tr>')
            continue
        if table:
            result.append('</tbody></table>')
            table = False
        if not line.strip():
            flush()
        elif line.startswith('#'):
            flush()
            level = min(len(line)-len(line.lstrip('#')), 4)
            result.append(f'<h{level}>'+inline(line.lstrip('#').strip())+f'</h{level}>')
        elif line.startswith('- '):
            flush()
            result.append('<p>• '+inline(line[2:])+'</p>')
        else:
            paragraph.append(line)
    flush()
    if table:
        result.append('</tbody></table>')
    return '\n'.join(result)

if not (BUILD / 'index.html').is_file():
    raise SystemExit('Run npm run build:demo first')
if not (ROOT / 'review-evidence/ux-release.json').is_file():
    raise SystemExit('Missing current validation evidence')

with tempfile.TemporaryDirectory(prefix='salamatban-delivery-', dir='/workspace') as temp:
    dest = Path(temp) / NAME
    dest.mkdir()
    with zipfile.ZipFile(PREVIOUS) as previous:
        prefix = 'Salamatban-Complete-Delivery-v1.4/'
        for name in ['index.html','00-START-HERE.html','README-fa.txt','Start-Mac-Linux.command','Start-Windows.cmd','serve-demo.py']:
            content = previous.read(prefix+name)
            if name.endswith(('.html','.txt')):
                content = content.decode().replace('۱٫۴','۱٫۵').replace('v1.4','v1.5').encode()
            (dest/name).write_bytes(content)
        guide = previous.read(prefix+'documents/Salamatban-Complete-Guide-fa.html').decode()
    (dest/'Start-Mac-Linux.command').chmod(0o755)
    (dest/'serve-demo.py').chmod(0o755)
    (dest/'documents').mkdir()
    (dest/'technical').mkdir()
    for source in ['Salamatban-Visual-Identity.pdf','Salamatban-Preview.png','Salamatban-Mobile-Preview.png']:
        shutil.copy2(ROOT/'deliverables'/source,dest/'documents'/source)
    source_paths = subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
    for name in sorted(set(source_paths)):
        if not name or name.startswith('deliverables/Salamatban-Complete-Delivery-') or name=='review-evidence/ux-archive-validation.json':
            continue
        path = ROOT/name
        parts = Path(name).parts
        if any(p in {'.git','node_modules','.wrangler','.test-build','dist','dist-demo','.next','__pycache__'} for p in parts):
            continue
        if path.is_symlink():
            raise SystemExit(f'Source symlink requires review: {name}')
        if not path.is_file():
            continue
        allowed = name in {'README.md','AGENTS.md'} or name.startswith(('site/','scripts/')) or (name.startswith(('deliverables/','review-evidence/')) and path.suffix in {'.md','.csv','.sql','.json','.log'})
        if not allowed or (path.name.startswith(('.env','.dev.vars')) and path.name != '.dev.vars.example') or path.suffix in {'.sqlite','.db','.pem','.zip','.tsbuildinfo'}:
            continue
        target=dest/'source'/name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(path,target)
    shutil.copytree(BUILD,dest/'website')
    for directory in ['architecture']:
        shutil.copytree(ROOT/'deliverables'/directory,dest/'technical'/directory)
    for name in ['launch-budget.csv','launch-readiness-register.csv','UX-IMPROVEMENTS-fa.md','UX-LOCATION-CONTRACT-fa.md','DEVELOPER-HANDOFF-fa.md','FIRST-OPERATIONAL-RELEASE-fa.md']:
        shutil.copy2(ROOT/'deliverables'/name,dest/'technical'/name)
    for name in ['ux-release.json','ux-publication.json','architecture-database-validation.json']:
        if (ROOT/'review-evidence'/name).exists():
            shutil.copy2(ROOT/'review-evidence'/name,dest/'technical'/name)
    for name in ['ux-city-form.png','ux-upload.png','ux-location-320.png']:
        if (ROOT/'site/.test-build'/name).exists():
            shutil.copy2(ROOT/'site/.test-build'/name,dest/'documents'/name)
    shutil.copy2(ROOT/'site/.test-build/visual-review/compact-year-select-320.png',dest/'documents/compact-year-select-320.png')
    guide=guide.replace('۱٫۴','۱٫۵').replace('v1.4','v1.5')
    guide=guide.replace('../technical/deliverables/architecture/','../technical/architecture/').replace('../technical/review-evidence/','../technical/').replace('../technical/site/','../source/site/').replace('../technical/scripts/','../source/scripts/')
    sections = {'ux-improvements':'UX-IMPROVEMENTS-fa.md','document-2':'DEVELOPER-HANDOFF-fa.md','document-4':'salamatban-release-checklist-fa.md'}
    for section,name in sections.items():
        pattern=rf'<section class="section" id="{section}">.*?</section>'
        replacement=f'<section class="section" id="{section}">'+markdown((ROOT/'deliverables'/name).read_text())+'</section>'
        guide,count=re.subn(pattern,lambda _:replacement,guide,flags=re.S)
        if count != 1:
            raise SystemExit(f'Expected one guide section {section}, got {count}')
    contract='<section class="section" id="location-contract">'+markdown((ROOT/'deliverables/UX-LOCATION-CONTRACT-fa.md').read_text())+'</section>'
    guide=guide.replace('<section class="section" id="demo">',contract+'<section class="section" id="demo">')
    guide=guide.replace('۱۲ جدول فعلی','۱۲ جدول پایهٔ قبلی؛ جدول آدرس نمایشی در افزودهٔ ۱٫۵')
    guide=guide.replace('</head>','<style>code{overflow-wrap:anywhere}table{width:100%;table-layout:fixed}td,th{overflow-wrap:anywhere}pre{white-space:pre-wrap;direction:ltr;text-align:left}h1,h2,h3{break-after:avoid}tr{break-inside:avoid}</style></head>')
    guide_path=dest/'documents/Salamatban-Complete-Guide-fa.html'
    guide_path.write_text(guide)
    with (dest/'README-fa.txt').open('a') as f:
        f.write('\nافزودهٔ ۱٫۵: ذخیرهٔ خودکار، شهر، مدارک، مرور و نقشهٔ اختیاری. نقشه/جست‌وجوی مکان به اینترنت نیاز دارند؛ آدرس دستی و بقیهٔ نمایش محلی مستقل‌اند. خدمت در محل فقط نمایشی است. گزارش انتشار جاری در technical/ux-publication.json قرار دارد.\n')
    notice='<section><h2>نسخهٔ ۱٫۵ — تجربهٔ کاربری تازه</h2><p>ذخیرهٔ خودکار قابل پیگیری، شهر جست‌وجوپذیر، ویرایش مستقیم مرور، مدارک با پیش‌نمایش و نقشهٔ اختیاری خدمت نمایشی در محل.</p><p>فرم و آدرس دستی محلی کار می‌کنند؛ نقشه و جست‌وجوی مکان اینترنت می‌خواهند.</p><a href="technical/UX-IMPROVEMENTS-fa.md">وضعیت بهبودها</a> · <a href="technical/ux-publication.json">گزارش انتشار همین نسخه</a></section>'
    for name in ['index.html','00-START-HERE.html']:
        p=dest/name;p.write_text(p.read_text().replace('technical/deliverables/architecture/','technical/architecture/').replace('</main>',notice+'</main>'))
    renderer="""const {chromium}=await import(process.argv[1]);const {readFile}=await import('node:fs/promises');const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{const page=await browser.newPage();await page.setContent(await readFile(process.argv[2],'utf8'),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await page.pdf({path:process.argv[3],format:'A4',printBackground:true,preferCSSPageSize:true});}finally{await browser.close();}"""
    subprocess.run(['node','--input-type=module','-e',renderer,(ROOT/'site/node_modules/playwright/index.mjs').as_uri(),str(guide_path),str(guide_path.with_suffix('.pdf'))],check=True)
    # The manifest covers every deliverable file except itself, with explicit exclusion.
    entries=[{'path':p.relative_to(dest).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in sorted(dest.rglob('*')) if p.is_file()]
    manifest={'version':VERSION,'selfExcluded':'MANIFEST.json','files':entries}
    (dest/'MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    for entry in entries:
        if digest(dest/entry['path'])!=entry['sha256']:
            raise SystemExit('Files changed during packaging')
    with zipfile.ZipFile(OUTPUT,'w',zipfile.ZIP_DEFLATED) as archive:
        for p in sorted(dest.rglob('*')):
            if p.is_file():
                archive.write(p,Path(NAME)/p.relative_to(dest))
    with zipfile.ZipFile(OUTPUT) as archive:
        if archive.testzip() is not None:
            raise SystemExit('ZIP integrity failed')
    summary={'file':OUTPUT.name,'bytes':OUTPUT.stat().st_size,'sha256':digest(OUTPUT),'fileCount':len(entries)+1,'version':VERSION,'sourceBaseCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'sourceState':'current files identified individually by MANIFEST.json','validation':json.loads((ROOT/'review-evidence/ux-release.json').read_text()),'archiveIntegrity':'passed'}
    OUTPUT.with_suffix('.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({key:summary[key] for key in ['file','bytes','sha256','fileCount','archiveIntegrity']},ensure_ascii=False))
