#!/usr/bin/env python3
"""Publish the reviewed showcase under /showcase/, preserving the demo and other paths."""
import hashlib,json,os,subprocess,tempfile,zipfile
from pathlib import Path,PurePosixPath
from delivery_docs import VERSION
root=Path(__file__).resolve().parent.parent
archive=root/f'deliverables/Salamatban-Complete-Delivery-v{VERSION}.zip'
manifest=json.loads(archive.with_suffix('.json').read_text())
assert hashlib.sha256(archive.read_bytes()).hexdigest()==manifest['sha256']
def git(*args,data=None,env=None):return subprocess.check_output(['git',*args],cwd=root,input=data,env=env).decode().strip()
ref='refs/heads/gh-pages';parent=git('ls-remote','origin',ref).split()[0];git('fetch','origin',ref)
files={};prefix=f'Salamatban-Complete-Delivery-v{VERSION}/'
with zipfile.ZipFile(archive) as z:
 for entry in z.infolist():
  if entry.is_dir():continue
  assert entry.filename.startswith(prefix)
  name=entry.filename[len(prefix):]
  assert '..' not in PurePosixPath(name).parts and not PurePosixPath(name).is_absolute()
  if name.startswith('website/') or name in {'MANIFEST.json','CONTENTS.json'}:continue
  files['showcase/'+name]=z.read(entry)
assert {'showcase/index.html','showcase/presentation/assets/architecture-demo.png'}<=files.keys()
with tempfile.TemporaryDirectory(prefix='salamatban-showcase-index-') as temp:
 env=dict(os.environ,GIT_INDEX_FILE=str(Path(temp)/'index'))
 git('read-tree',parent,env=env)
 old=git('ls-files','-z','--','showcase/',env=env)
 if old:git('update-index','--force-remove','-z','--stdin',data=old.encode() if old.endswith('\0') else old.encode()+b'\0',env=env)
 for name,content in sorted(files.items()):
  blob=git('hash-object','-w','--stdin',data=content)
  git('update-index','--add','--cacheinfo','100644',blob,name,env=env)
 tree=git('write-tree',env=env)
 # Root app hashes must remain byte-identical to the previous published tree.
 for name in ['index.html','app.js','app.css','sql-wasm.wasm']:
  assert git('rev-parse',f'{parent}:{name}')==git('rev-parse',f'{tree}:{name}'),name
if tree==git('rev-parse',f'{parent}^{{tree}}'):commit=parent
else:
 commit=git('commit-tree',tree,'-p',parent,data=f'Publish Salamatban product showcase {VERSION}\n'.encode());git('push','origin',f'{commit}:{ref}')
print(json.dumps({'url':'https://ourgemeniprostudent-png.github.io/salamatban/showcase/','commit':commit,'files':len(files),'appPreserved':True}))
