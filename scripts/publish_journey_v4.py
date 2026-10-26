"""Publish v4 at /next; archive old next once; prove all existing other routes unchanged."""
from pathlib import Path
import hashlib,json,subprocess,tempfile,os
root=Path(__file__).resolve().parent.parent;build=root/'site/dist-journey'
def git(*args,data=None,env=None):return subprocess.check_output(['git',*args],cwd=root,input=data,env=env).decode().strip()
release=json.loads((build/'release.json').read_text());assert release['version']=='4.1.0'
for n,h in release['assets'].items():assert hashlib.sha256((build/n).read_bytes()).hexdigest()==h
ref='refs/heads/gh-pages';parent=git('ls-remote','origin',ref).split()[0];git('fetch','origin',ref)
def files(tree):return {r.split('\t',1)[1]:r.split('\t',1)[0].split()[2] for r in git('ls-tree','-r',tree).splitlines()}
before=files(parent);old={n:h for n,h in before.items() if n.startswith('next/')};archive='archive/v3.5.0-next.1/'
with tempfile.TemporaryDirectory(prefix='salamatban-v4-') as temp:
 env=dict(os.environ,GIT_INDEX_FILE=str(Path(temp)/'index'));git('read-tree',parent,env=env)
 if not any(n.startswith(archive) for n in before):
  oldrelease=json.loads(git('show',parent+':next/release.json'));assert oldrelease['version']=='3.5.0-next.1'
  for n,h in old.items():git('update-index','--add','--cacheinfo','100644',h,archive+n[len('next/'):],env=env)
 if old:git('update-index','--force-remove','-z','--stdin',data=('\0'.join(old)+'\0').encode(),env=env)
 for p in sorted(build.rglob('*')):
  if p.is_file():git('update-index','--add','--cacheinfo','100644',git('hash-object','-w','--stdin',data=p.read_bytes()),'next/'+p.relative_to(build).as_posix(),env=env)
 tree=git('write-tree',env=env)
after=files(tree);assert all(after[n]==h for n,h in before.items() if not n.startswith('next/'))
assert all(n in before or n.startswith(('next/',archive)) for n in after)
if not any(n.startswith(archive) for n in before):assert all(after[archive+n[len('next/'):]]==h for n,h in old.items())
commit=git('commit-tree',tree,'-p',parent,data=b'Publish persistent minimal v4 member journey; preserve previous next archive\n');git('push','origin',commit+':'+ref)
report={'version':'4.1.0','url':'https://ourgemeniprostudent-png.github.io/salamatban/next/','commit':commit,'sha256':release['assets']['index.html'],'existingNonNextRoutesUnchanged':True,'previousNextArchive':'https://ourgemeniprostudent-png.github.io/salamatban/'+archive,'previousPagesCommit':parent}
(root/'review-evidence/journey/publication.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
