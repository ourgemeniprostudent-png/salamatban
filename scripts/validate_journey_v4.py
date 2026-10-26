from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,subprocess,tempfile,zipfile,urllib.parse
root=Path(__file__).resolve().parent.parent;archive=root/'deliverables/Salamatban-Complete-Delivery-v4.0.0.zip';name=archive.stem
with tempfile.TemporaryDirectory(prefix='salamatban-v4-validation-') as temp:
 dest=Path(temp)
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  assert all(not n.startswith('/') and '..' not in Path(n).parts for n in z.namelist())
  z.extractall(dest)
 package=dest/name;manifest=json.loads((package/'MANIFEST.json').read_text())
 for n,entry in manifest['files'].items():assert hashlib.sha256((package/n).read_bytes()).hexdigest()==entry['sha256']
 assert not any(x in p.parts for p in package.rglob('*') for x in ['node_modules','.git','.env','.wrangler'])
 for required in ['index.html','00-START-HERE.html','website/next/index.html','source/site/journey/persistence.js','documents/Salamatban-Guide-fa.pdf','technical/architecture-fa.md','technical/future-schema.sql','technical/readiness.csv','technical/budget.csv','identity/salamatban.svg','Start-Windows.cmd','Start-Mac-Linux.command','serve-demo.py']:assert (package/required).is_file()
 class Links(HTMLParser):
  def __init__(self):super().__init__();self.urls=[]
  def handle_starttag(self,tag,attrs):
   for k,v in attrs:
    if k in ['href','src'] and v:self.urls.append(v)
 for file in ['index.html','00-START-HERE.html','website/index.html']:
  parser=Links();parser.feed((package/file).read_text())
  for url in parser.urls:
   if urllib.parse.urlparse(url).scheme or url.startswith('#'):continue
   assert (package/file).parent.joinpath(urllib.parse.unquote(url)).exists(),url
 subprocess.run(['python3','site/journey/build.py'],cwd=package/'source',check=True,capture_output=True)
 assert (package/'source/site/dist-journey/index.html').read_bytes()==(package/'website/next/index.html').read_bytes()
 server=subprocess.Popen(['python3',str(package/'serve-demo.py'),'--port','4181','--no-browser'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
 try:
  assert '4181/next/' in server.stdout.readline()
  code="""import{chromium}from'./site/node_modules/playwright/index.mjs';import assert from'node:assert/strict';const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage();await p.goto('http://127.0.0.1:4181/next/');await p.waitForSelector('#login-scene:not([hidden])');assert.equal(await p.locator('.sample-user').count(),3);assert.equal(await p.locator('.sample-user').first().innerText(),'سارا احمدی\\n۰۹۰۰۰۰۰۰۰۰۱');await b.close();"""
  subprocess.run(['node','--input-type=module','-e',code],cwd=root,check=True,capture_output=True)
 finally:server.terminate();server.wait(timeout=5)
report={'version':'4.0.0','sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'zipIntegrity':'passed','perFileHashes':'passed','entryLinks':'passed','sourceRebuildByteIdentical':True,'packagedLauncherAndLogin':'passed','runtimeDataExcluded':True}
(root/'review-evidence/journey/archive-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
