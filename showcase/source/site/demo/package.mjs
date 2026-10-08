import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync('python3', ['-c', `
from pathlib import Path
import hashlib, json, zipfile
root=Path(${JSON.stringify(site)})
source=root/'dist-demo'
if not (source/'index.html').is_file(): raise SystemExit('Run npm run build:demo first')
dest=root.parent/'deployments'
dest.mkdir(exist_ok=True)
archive=dest/'salamatban-demo.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(source.rglob('*')):
  if p.is_file(): z.write(p,p.relative_to(source))
release=json.loads((source/'release.json').read_text())
manifest={'version':release['version'],'maps':release.get('maps'), 'archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'targetDirectory':'gh-pages / (root)','identityVersion':'salamatban-identity-v1','pagesUrl':'https://ourgemeniprostudent-png.github.io/salamatban/','pagesBranch':'gh-pages','status':'built; verify hosting publication separately','backend':'browser-local synthetic records; dated Geoapify facility snapshot with Neshan destination links; optional isolated live Geoapify gateway configured separately'}
(dest/'salamatban-demo.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\\n')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
`], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
