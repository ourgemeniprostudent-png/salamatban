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
manifest={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'targetDirectory':'/domains/temporarydomain.ir/public_html/salamatban-demo/','expectedUrl':'https://temporarydomain.ir/salamatban-demo/','status':'prepared; not uploaded','backend':'browser-only synthetic demonstration; no remote API'}
(dest/'salamatban-demo.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\\n')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
`], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
