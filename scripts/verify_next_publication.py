"""Verify next assets and preserved root files via HTTPS with system CA trust."""
from pathlib import Path
import concurrent.futures,hashlib,json,subprocess,time,urllib.request
root=Path(__file__).resolve().parent.parent;report=json.loads((root/'review-evidence/next/publication.json').read_text());base='https://ourgemeniprostudent-png.github.io/salamatban/';build=root/'site/dist-demo/next'
expected={f'next/{n}':hashlib.sha256((build/n).read_bytes()).hexdigest() for n in ['index.html','app.js','app.css','release.json','sql-wasm.wasm','demo/documents/51-lab.pdf','demo/documents/first-report-demo.pdf','data/care-facilities.geoapify.json','favicon.svg','THIRD-PARTY-NOTICES.txt']+['fonts/PeydaWebFaNum-'+w+'.woff2' for w in ['Regular','Medium','SemiBold','Bold','ExtraBold','Black']]}
for n in ['index.html','app.js','app.css','release.json','showcase/index.html','previews/value-before-payment/index.html']:
 b=subprocess.check_output(['git','show',report['previousPagesCommit']+':'+n],cwd=root);expected[n]=hashlib.sha256(b).hexdigest()
def check(n):
 try:
  with urllib.request.urlopen(base+n+'?next-check='+report['pagesCommit'][:12],timeout=25) as r:actual=hashlib.sha256(r.read()).hexdigest();return {'file':n,'status':r.status,'matches':actual==expected[n]}
 except Exception as e:return {'file':n,'matches':False,'error':str(e)}
for attempt in range(24):
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,expected))
 if all(v['matches'] for v in results):break
 print(json.dumps({'attempt':attempt+1,'matching':sum(v['matches'] for v in results),'total':len(results)}),flush=True);time.sleep(10)
report.update(httpsAssets=results,httpsVerified=all(v['matches'] for v in results),verifiedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()));(root/'review-evidence/next/publication.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));raise SystemExit(0 if report['httpsVerified'] else 1)
