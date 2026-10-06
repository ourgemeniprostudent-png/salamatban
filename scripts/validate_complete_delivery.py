#!/usr/bin/env python3
"""Verify archive hashes, source/build equality, exclusions and delivery links."""
import hashlib,json,subprocess
from html.parser import HTMLParser
from pathlib import Path,PurePosixPath
from urllib.parse import unquote,urlsplit
import posixpath,zipfile
root=Path(__file__).resolve().parent.parent
archive=root/'deliverables/Salamatban-Complete-Delivery-v1.6.1.zip'
prefix='Salamatban-Complete-Delivery-v1.6.1/'
class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in {'src','href'} and value:self.links.append(value)
with zipfile.ZipFile(archive) as z:
    names=z.namelist()
    assert len(names)==len(set(names))
    assert z.testzip() is None
    for name in names:
        assert name.startswith(prefix) and '..' not in PurePosixPath(name).parts
        parts=PurePosixPath(name).parts
        assert not any(p in {'node_modules','.git','.wrangler','.test-build','__pycache__'} for p in parts),name
        assert not any(p.startswith(('.env','.dev.vars')) and p!='.dev.vars.example' for p in parts),name
        assert PurePosixPath(name).suffix not in {'.db','.sqlite','.pem'},name
    manifest=json.loads(z.read(prefix+'MANIFEST.json'))
    for item in manifest['files']:
        data=z.read(prefix+item['path'])
        assert hashlib.sha256(data).hexdigest()==item['sha256'],item['path']
        assert len(data)==item['bytes'],item['path']
    assert len(manifest['files'])+1==len(names)
    compared={'source':0,'website':0}
    for name in names:
        relative=name[len(prefix):]
        if relative.startswith('website/'):
            path=root/'site/dist-demo'/relative[len('website/'):]
            assert path.is_file() and path.read_bytes()==z.read(name),name
            compared['website']+=1
        elif relative.startswith('source/'):
            path=root/relative[len('source/'):]
            assert path.is_file() and path.read_bytes()==z.read(name),name
            compared['source']+=1
    missing=[]
    for name in names:
        relative=name[len(prefix):]
        if name.endswith('.html') and not relative.startswith('source/'):
            parser=Links();parser.feed(z.read(name).decode())
            for link in parser.links:
                parsed=urlsplit(link)
                if parsed.scheme or parsed.netloc or not parsed.path:continue
                target=posixpath.normpath(posixpath.join(posixpath.dirname(name),unquote(parsed.path)))
                if target not in names:missing.append({'from':relative,'link':link})
    assert z.getinfo(prefix+'Start-Mac-Linux.command').external_attr >> 16 & 0o111
    fallback_script = r"""const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const html=fs.readFileSync(0,'utf8');const elements={};const document={getElementById(id){return elements[id]??={hidden:true,textContent:''};}};for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInNewContext(match[1],{location:{protocol:'file:'},document});assert.equal(elements['local-launch'].hidden,false);assert.match(elements['launch-status'].textContent,/یکی از روش/);console.log('PASS file protocol branch: launch instructions replace loading state');"""
    subprocess.run(['node','-e',fallback_script],input=z.read(prefix+'website/index.html'),check=True)
    report={'directFileFallback':'file protocol branch executed in JavaScript VM; managed Chromium blocks native file navigation','archive':archive.name,'integrity':'passed','manifestFiles':len(manifest['files']),'matchedCurrentFiles':compared,'missingLinks':missing,'exclusions':'passed'}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    (root/'review-evidence/ux-archive-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if missing:raise SystemExit(1)
