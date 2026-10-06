#!/usr/bin/env python3
"""Verify public showcase HTML, guide and every diagram/screenshot against the delivery."""
import concurrent.futures,hashlib,json,subprocess,time,urllib.request,zipfile
from pathlib import Path
from delivery_docs import VERSION
root=Path(__file__).resolve().parent.parent;base='https://ourgemeniprostudent-png.github.io/salamatban/showcase/'
commit=subprocess.check_output(['git','ls-remote','origin','refs/heads/gh-pages'],cwd=root).decode().split()[0]
prefix=f'Salamatban-Complete-Delivery-v{VERSION}/'
with zipfile.ZipFile(root/f'deliverables/Salamatban-Complete-Delivery-v{VERSION}.zip') as z:
 selected=['index.html','documents/Salamatban-Complete-Guide-fa.html','documents/Salamatban-Complete-Guide-fa.pdf']+[n[len(prefix):] for n in z.namelist() if n.startswith(prefix+'presentation/assets/') and n.endswith(('.png','.svg'))]
 expected={n:hashlib.sha256(z.read(prefix+n)).hexdigest() for n in selected}
def check(name):
 try:
  with urllib.request.urlopen(urllib.request.Request(base+name+'?release='+commit[:12],headers={'Cache-Control':'no-cache'}),timeout=20) as r:
   actual=hashlib.sha256(r.read()).hexdigest();return {'file':name,'status':r.status,'matches':actual==expected[name],'sha256':actual}
 except Exception as e:return {'file':name,'matches':False,'error':str(e)}
report={'packageVersion':VERSION,'url':base,'pagesCommit':commit,'success':False,'browserScope':'Local browser of identical assets; public HTTPS verified by checksum'}
for attempt in range(24):
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,selected))
 report['files']=results
 if all(r['matches'] for r in results):report['success']=True;break
 print(json.dumps({'attempt':attempt+1,'matching':sum(r['matches'] for r in results),'total':len(results)}),flush=True);time.sleep(10)
report['verifiedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());(root/'review-evidence/showcase-publication.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));raise SystemExit(0 if report['success'] else 1)
