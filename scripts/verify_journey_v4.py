from pathlib import Path
import hashlib,json,subprocess,time,urllib.request,concurrent.futures
root=Path(__file__).resolve().parent.parent;p=root/'review-evidence/journey/publication.json';report=json.loads(p.read_text());base='https://ourgemeniprostudent-png.github.io/salamatban/'
expected={'next/'+n:hashlib.sha256((root/'site/dist-journey'/n).read_bytes()).hexdigest() for n in ['index.html','release.json']}
for n in ['index.html','release.json','previews/intake-wireframe/index.html']:
 expected[n]=hashlib.sha256(subprocess.check_output(['git','show',report['previousPagesCommit']+':'+n],cwd=root)).hexdigest()
for n in ['index.html','release.json']:
 archived='archive/v3.5.0-next.1/'+n
 ref=report['previousPagesCommit']+':'+archived
 if subprocess.run(['git','cat-file','-e',ref],cwd=root,stderr=subprocess.DEVNULL).returncode:ref=report['previousPagesCommit']+':next/'+n
 expected[archived]=hashlib.sha256(subprocess.check_output(['git','show',ref],cwd=root)).hexdigest()
def check(n):
 try:
  with urllib.request.urlopen(base+n+'?verify='+report['commit'][:12],timeout=25) as response:return {'path':n,'status':response.status,'matches':hashlib.sha256(response.read()).hexdigest()==expected[n]}
 except Exception as error:return {'path':n,'matches':False,'error':str(error)}
for i in range(24):
 with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:results=list(pool.map(check,expected))
 if all(r['matches'] for r in results):break
 print(json.dumps({'attempt':i+1,'matched':sum(r['matches'] for r in results),'total':len(results)}),flush=True);time.sleep(5)
report['httpsVerified']=all(r['matches'] for r in results);report['checks']=results;p.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));raise SystemExit(0 if report['httpsVerified'] else 1)
