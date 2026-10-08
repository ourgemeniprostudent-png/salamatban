#!/usr/bin/env python3
"""Reject invalid delivery artifacts, compile the extracted app and rebuild its ZIP.
Run after packaging; reuses installed Node dependencies, not an older delivery.
"""
from pathlib import Path
from delivery_docs import VERSION
import hashlib,json,subprocess,zipfile,shutil,tempfile,sys,os
root=Path(__file__).resolve().parent.parent;name=f'Salamatban-Complete-Delivery-v{VERSION}';prefix=name+'/'
archive=root/'deliverables'/f'{name}.zip';scratch=tempfile.TemporaryDirectory(prefix='salamatban-delivery-test-');work=Path(scratch.name)
with zipfile.ZipFile(archive) as z:
 original={n:z.read(n) for n in z.namelist()};infos={info.filename:info for info in z.infolist()}

def reject(label, change, expected):
 data=dict(original);change(data)
 manifest=json.loads(data[prefix+'MANIFEST.json'])
 manifest['files']=[{'path':key[len(prefix):],'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()} for key,content in sorted(data.items()) if key!=prefix+'MANIFEST.json']
 data[prefix+'MANIFEST.json']=(json.dumps(manifest)+'\n').encode()
 candidate=work/f'{label}.zip'
 with zipfile.ZipFile(candidate,'w',zipfile.ZIP_DEFLATED) as z:
  for n,content in data.items():z.writestr(infos.get(n,n),content)
 r=subprocess.run([sys.executable,str(root/'scripts/validate_complete_delivery.py'),str(candidate)],capture_output=True,text=True)
 assert r.returncode!=0 and expected in r.stdout+r.stderr,(r.stdout,r.stderr)
 print('PASS rejection:',label)

def replace_link(target,old,new):
 def change(data):
  key=prefix+target;assert old.encode() in data[key];data[key]=data[key].replace(old.encode(),new.encode(),1)
 return change
reject('broken-markdown',replace_link('technical/DEVELOPER-HANDOFF-fa.md','DELIVERY-STATUS-fa.md','missing-document.md'),'missing file')
reject('broken-anchor',replace_link('index.html','documents/Salamatban-Complete-Guide-fa.html','documents/Salamatban-Complete-Guide-fa.html#missing-anchor'),'missing HTML anchor')
def stale_metadata(data):
 key=prefix+'CONTENTS.json';catalog=json.loads(data[key]);catalog['mapsData']['coverage']['includedCities']+=1;data[key]=json.dumps(catalog).encode()
reject('stale-snapshot-metadata',stale_metadata,'Snapshot metadata mismatch')
reject('runtime-quota-database',lambda data:data.update({prefix+'source/site/.maps-data/rate-limits.sqlite-wal':b'synthetic forbidden runtime test'}),'Forbidden runtime/dependency directory')
# Recompile the actual browser app using the delivered source, outside Git.
standalone=work/'standalone';standalone.mkdir(exist_ok=True)
with zipfile.ZipFile(archive) as z:z.extractall(standalone)
base=standalone/name;source=base/'source'
(source/'site/node_modules').symlink_to(root/'site/node_modules',target_is_directory=True)
env=dict(os.environ);env.pop('SALAMATBAN_MAPS_GATEWAY_URL',None)
r=subprocess.run(['npm','run','build:demo'],cwd=source/'site',env=env,capture_output=True,text=True)
assert r.returncode==0,(r.stdout,r.stderr)
compared=[]
for filename in ['app.js','app.css','index.html','data/care-facilities.geoapify.json','release.json','THIRD-PARTY-NOTICES.txt','demo/documents/manifest.json','demo/documents/51-lab.pdf','demo/documents/51-image.jpg']:
 actual=(source/'site/dist-demo'/filename).read_bytes();expected=original[prefix+'website/'+filename]
 assert actual==expected,'Extracted app compilation differs: '+filename
 compared.append({'file':filename,'sha256':hashlib.sha256(actual).hexdigest()})
print('PASS actual app compilation from extracted source: app JS/CSS, entry, snapshot, release metadata and notices match')
# Independently reconstruct and validate the complete delivery archive.
r=subprocess.run([sys.executable,'scripts/package_complete_delivery.py'],cwd=source,capture_output=True,text=True)
assert r.returncode==0,(r.stdout,r.stderr)
r=subprocess.run([sys.executable,'scripts/validate_complete_delivery.py'],cwd=source,capture_output=True,text=True)
assert r.returncode==0,(r.stdout,r.stderr)
print('PASS complete archive reconstruction and validation from extracted source, no previous ZIP or Git required')
print(json.dumps({'appCompilation':'passed','comparedAssets':compared,'archiveReconstruction':'passed','negativeChecks':4},indent=2))
print(r.stdout)
scratch.cleanup()
