"""Verify next assets and preserved root files via HTTPS with system CA trust."""
from pathlib import Path
import concurrent.futures,hashlib,json,subprocess,time,urllib.request
root=Path(__file__).resolve().parent.parent
report=json.loads((root/'review-evidence/next/publication.json').read_text())
base='https://ourgemeniprostudent-png.github.io/salamatban/'
build=root/'site/dist-demo/next'
assets=['config.json','demo/documents/manifest.json','demo/documents/case-4-v2.pdf','demo/documents/case-3-v1.pdf','index.html','app.js','app.css','release.json','sql-wasm.wasm','demo/documents/51-lab.pdf','demo/documents/first-report-demo.pdf','data/care-facilities.geoapify.json','favicon.svg','THIRD-PARTY-NOTICES.txt']
assets+=['fonts/PeydaWebFaNum-'+w+'.woff2' for w in ['Regular','Medium','SemiBold','Bold','ExtraBold','Black']]
expected={'next/'+name:hashlib.sha256((build/name).read_bytes()).hexdigest() for name in assets}
for name in ['index.html','app.js','app.css','release.json','showcase/index.html','previews/value-before-payment/index.html']:
 data=subprocess.check_output(['git','show',report['previousPagesCommit']+':'+name],cwd=root)
 expected[name]=hashlib.sha256(data).hexdigest()
def check(name):
 try:
  with urllib.request.urlopen(base+name+'?next-check='+report['pagesCommit'][:12],timeout=25) as response:
   actual=hashlib.sha256(response.read()).hexdigest()
   return {'file':name,'status':response.status,'matches':actual==expected[name]}
 except Exception as error:return {'file':name,'matches':False,'error':str(error)}
for attempt in range(24):
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,expected))
 if all(value['matches'] for value in results):break
 print(json.dumps({'attempt':attempt+1,'matching':sum(value['matches'] for value in results),'total':len(results)}),flush=True)
 time.sleep(10)
report.update(httpsAssets=results,httpsVerified=all(value['matches'] for value in results),verifiedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
(root/'review-evidence/next/publication.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
raise SystemExit(0 if report['httpsVerified'] else 1)
