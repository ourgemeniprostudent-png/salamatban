#!/usr/bin/env python3
"""Reject broken delivered links and rebuild from the extracted source without Git.
Run after packaging; reuses installed Node dependencies, not an older delivery.
"""
from pathlib import Path
import hashlib,json,subprocess,zipfile,shutil,tempfile,sys
root=Path(__file__).resolve().parent.parent;name='Salamatban-Complete-Delivery-v1.7.2';prefix=name+'/'
archive=root/'deliverables'/f'{name}.zip';scratch=tempfile.TemporaryDirectory(prefix='salamatban-delivery-test-');work=Path(scratch.name)
with zipfile.ZipFile(archive) as z:
 original={n:z.read(n) for n in z.namelist()};infos={n:z.getinfo(n) for n in z.namelist()}
for label,target,old,new in [('broken-markdown','technical/DEVELOPER-HANDOFF-fa.md','DELIVERY-STATUS-fa.md','missing-document.md'),('broken-anchor','index.html','documents/Salamatban-Complete-Guide-fa.html','documents/Salamatban-Complete-Guide-fa.html#missing-anchor')]:
 data=dict(original);key=prefix+target
 assert old.encode() in data[key]
 data[key]=data[key].replace(old.encode(),new.encode(),1)
 manifest=json.loads(data[prefix+'MANIFEST.json'])
 for f in manifest['files']:
  if f['path']==target:f.update(bytes=len(data[key]),sha256=hashlib.sha256(data[key]).hexdigest())
 data[prefix+'MANIFEST.json']=json.dumps(manifest).encode()
 candidate=work/f'{label}.zip'
 with zipfile.ZipFile(candidate,'w',zipfile.ZIP_DEFLATED) as z:
  for n,content in data.items():z.writestr(infos[n],content)
 r=subprocess.run([sys.executable,str(root/'scripts/validate_complete_delivery.py'),str(candidate)],capture_output=True,text=True)
 assert r.returncode!=0 and ('missing file' if label=='broken-markdown' else 'missing HTML anchor') in r.stdout,(r.stdout,r.stderr)
 print('PASS rejection:',label)
# Test complete package reconstruction outside Git, from delivered source + built app.
standalone=work/'standalone';standalone.mkdir(exist_ok=True)
with zipfile.ZipFile(archive) as z:z.extractall(standalone)
base=standalone/name;source=base/'source'
shutil.copytree(base/'website',source/'site/dist-demo',dirs_exist_ok=True)
(source/'site/node_modules').symlink_to(root/'site/node_modules',target_is_directory=True)
r=subprocess.run([sys.executable,'scripts/package_complete_delivery.py'],cwd=source,capture_output=True,text=True)
assert r.returncode==0,(r.stdout,r.stderr)
r=subprocess.run([sys.executable,'scripts/validate_complete_delivery.py'],cwd=source,capture_output=True,text=True)
assert r.returncode==0,(r.stdout,r.stderr)
print('PASS standalone extracted-source rebuild and validation, no previous ZIP or Git required')
print(r.stdout)

scratch.cleanup()
