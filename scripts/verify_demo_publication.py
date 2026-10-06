#!/usr/bin/env python3
"""Read back public assets and compare exact bytes with the tested static build."""
import hashlib,json,subprocess,time,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parent.parent
base='https://ourgemeniprostudent-png.github.io/salamatban/'
build=root/'site/dist-demo'
commit=subprocess.check_output(['git','ls-remote','origin','refs/heads/gh-pages'],cwd=root).decode().split()[0]
files=['index.html','app.js','app.css','release.json','sql-wasm.wasm','brand/index.html']
report={'url':base,'pagesCommit':commit,'success':False,'assets':[]}
for attempt in range(24):
 results=[]
 for name in files:
  try:
   with urllib.request.urlopen(urllib.request.Request(base+name+'?v=1.5-'+commit[:12],headers={'Cache-Control':'no-cache','User-Agent':'Salamatban-Release-Verification/1.5'}),timeout=20) as response:
    actual=hashlib.sha256(response.read()).hexdigest()
    expected=hashlib.sha256((build/name).read_bytes()).hexdigest()
    results.append({'file':name,'status':response.status,'sha256':actual,'matches':actual==expected})
  except Exception as e:
   results.append({'file':name,'error':str(e),'matches':False})
 report['assets']=results
 if all(item['matches'] for item in results):
  report['success']=True;break
 print(json.dumps({'attempt':attempt+1,'matching':sum(item['matches'] for item in results),'total':len(files)},ensure_ascii=False),flush=True)
 time.sleep(10)
report['verifiedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
(root/'review-evidence/ux-publication.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if report['success'] else 1)
