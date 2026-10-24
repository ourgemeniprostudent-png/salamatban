"""Publish only /next/, proving that every existing non-next GitHub Pages file stays identical."""
from pathlib import Path,PurePosixPath
import hashlib,json,os,subprocess,tempfile,zipfile
root=Path(__file__).resolve().parent.parent;build=root/'site/dist-demo/next'
def git(*args,data=None,env=None):return subprocess.check_output(['git',*args],cwd=root,input=data,env=env).decode().strip()
release=json.loads((build/'release.json').read_text());assert release['version']=='3.2.1-next.1'
for name,digest in release['assets'].items():assert hashlib.sha256((build/name).read_bytes()).hexdigest()==digest
archive=root/'deployments/salamatban-next-demo.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(build.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(build))
manifest={'version':release['version'],'path':'/salamatban/next/','archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'preservedAppVersion':'2.4.7','backend':release['backend']};archive.with_suffix('.json').write_text(json.dumps(manifest,indent=2)+'\n')
ref='refs/heads/gh-pages';remote=git('ls-remote','origin',ref);assert remote,'Existing Pages deployment is required';parent=remote.split()[0];git('fetch','origin',ref)
def tree_files(tree):
 return {row.split('\t',1)[1]:row.split('\t',1)[0].split()[2] for row in git('ls-tree','-r',tree).splitlines() if not row.split('\t',1)[1].startswith('next/')}
before=tree_files(parent)
with tempfile.TemporaryDirectory(prefix='salamatban-next-index-') as temp:
 env=dict(os.environ,GIT_INDEX_FILE=str(Path(temp)/'index'));git('read-tree',parent,env=env);old=git('ls-files','-z','--','next/',env=env)
 if old:git('update-index','--force-remove','-z','--stdin',data=(old+'\0').encode(),env=env)
 for p in sorted(build.rglob('*')):
  if not p.is_file():continue
  name='next/'+p.relative_to(build).as_posix();assert '..' not in PurePosixPath(name).parts
  blob=git('hash-object','-w','--stdin',data=p.read_bytes());git('update-index','--add','--cacheinfo','100644',blob,name,env=env)
 tree=git('write-tree',env=env)
assert tree_files(tree)==before,'Publishing next would modify an existing route'
if tree==git('rev-parse',f'{parent}^{{tree}}'):commit=parent
else:commit=git('commit-tree',tree,'-p',parent,data=b'Publish isolated Salamatban next care journey\n');git('push','origin',f'{commit}:{ref}')
report={'version':release['version'],'url':'https://ourgemeniprostudent-png.github.io/salamatban/next/','previousPagesCommit':parent,'pagesCommit':commit,'preservedNonNextFiles':len(before),'allExistingRoutesByteIdentical':True,'preservedRootVersion':'2.4.7'}
(root/'review-evidence/next').mkdir(exist_ok=True);(root/'review-evidence/next/publication.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
