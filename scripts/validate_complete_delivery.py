#!/usr/bin/env python3
"""Verify archive hashes, source/build equality, exclusions and delivery links."""
import hashlib,json,subprocess,re,sys,html,os
from html.parser import HTMLParser
from pathlib import Path,PurePosixPath
from urllib.parse import unquote,urlsplit
import posixpath,zipfile
from delivery_docs import VERSION, APP_VERSION, GUIDE_DOCS, linked, markdown
root=Path(__file__).resolve().parent.parent
archive=Path(sys.argv[1]) if len(sys.argv)>1 else root/f'deliverables/Salamatban-Complete-Delivery-v{VERSION}.zip'
prefix=f'Salamatban-Complete-Delivery-v{VERSION}/'
class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.ids=set()
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in {'src','href'} and value:self.links.append(value)
            if key=='id' and value:self.ids.add(value)
with zipfile.ZipFile(archive) as z:
    names=z.namelist()
    assert len(names)==len(set(names))
    assert z.testzip() is None
    for name in names:
        assert name.startswith(prefix) and '..' not in PurePosixPath(name).parts
        parts=PurePosixPath(name).parts
        assert not any(p in {'node_modules','.git','.wrangler','.test-build','__pycache__','.maps-data','dist-maps-server'} for p in parts),'Forbidden runtime/dependency directory: '+name
        assert not any(p.startswith(('.env','.dev.vars')) and p!='.dev.vars.example' for p in parts),name
        assert PurePosixPath(name).suffix not in {'.db','.sqlite','.pem'},name
        assert not name.endswith(('.sqlite-wal','.sqlite-shm','.db-wal','.db-shm')),name
    configured_secrets=[value.encode() for key in ['GEOAPIFY_API_KEY','GEOAPIFY_RATE_LIMIT_SECRET'] if len(value:=os.environ.get(key,''))>=16]
    manifest=json.loads(z.read(prefix+'MANIFEST.json'))
    for item in manifest['files']:
        data=z.read(prefix+item['path'])
        assert not any(secret in data for secret in configured_secrets),'Configured map credential found inside delivery; export refused'
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
    # Check every HTML and Markdown file, including source documentation.
    missing=[];checked_links=0;parsers={}
    for name in names:
        if name.endswith('.html'):
            parser=Links();parser.feed(z.read(name).decode());parsers[name]=parser
    for name in names:
        if name.endswith('.html'):links=parsers[name].links
        elif name.endswith('.md'):
            content=re.sub(r'```[\s\S]*?```','',z.read(name).decode())
            links=re.findall(r'!?\[[^\]\n]*\]\(([^\s)]+)\)',content)
        else:continue
        for link in links:
            parsed=urlsplit(html.unescape(link))
            if parsed.scheme or parsed.netloc:continue
            if not parsed.path and not parsed.fragment:continue
            target=posixpath.normpath(posixpath.join(posixpath.dirname(name),unquote(parsed.path))) if parsed.path else name
            exists=target in names or any(n.startswith(target.rstrip('/')+'/') for n in names)
            checked_links+=1
            if not exists:missing.append({'from':name[len(prefix):],'link':link,'reason':'missing file'})
            elif parsed.fragment and target.endswith('.html') and unquote(parsed.fragment) not in parsers[target].ids:
                missing.append({'from':name[len(prefix):],'link':link,'reason':'missing HTML anchor'})
    catalog=json.loads(z.read(prefix+'CONTENTS.json'))
    assert manifest['version']==catalog['packageVersion']==VERSION
    assert manifest['appVersion']==catalog['appVersion']==json.loads(z.read(prefix+'website/release.json'))['version']==json.loads(z.read(prefix+'technical/ux-release.json'))['version']==APP_VERSION
    maps=catalog['mapsData']
    assert maps['mode']=='snapshot' and maps['provider']=='geoapify' and maps['directionsProvider']=='neshan' and maps['liveGatewayDeployed'] is False,'Snapshot mode metadata mismatch'
    assert maps['path']=='website/data/care-facilities.geoapify.json' and maps['source']=='source/site/public/data/care-facilities.geoapify.json','Snapshot path metadata mismatch'
    snapshot_bytes=z.read(prefix+maps['path'])
    assert snapshot_bytes==z.read(prefix+maps['source']),'Snapshot source/build mismatch'
    assert hashlib.sha256(snapshot_bytes).hexdigest()==maps['sha256'],'Snapshot hash metadata mismatch'
    snapshot=json.loads(snapshot_bytes)
    assert snapshot['schemaVersion']==1 and snapshot['provider']=='geoapify' and snapshot['mode']=='snapshot','Snapshot schema mismatch'
    assert maps['generatedAt']==snapshot['generatedAt'] and maps['coverage']==snapshot['coverage'] and maps['attribution']==snapshot['attribution'],'Snapshot metadata mismatch'
    assert maps.get('providerRevision')==snapshot.get('providerRevision'),'Snapshot provider revision mismatch'
    entries=snapshot['entries'];coverage=snapshot['coverage']
    assert len({entry['cityId'] for entry in entries})==len(entries)==coverage['includedCities'],'Snapshot city coverage mismatch'
    assert coverage['selectedCities']==coverage['includedCities']+coverage['omittedCities'] and coverage['omittedCities']>=0,'Snapshot coverage accounting mismatch'
    card_count=sum(len(entry['facilities']) for entry in entries)
    assert maps['facilityCards']==card_count,'Snapshot facility card count mismatch'
    release_maps=json.loads(z.read(prefix+'website/release.json'))['maps']
    assert release_maps['provider']=='geoapify' and release_maps['directionsProvider']=='neshan' and release_maps['mode']=='snapshot' and release_maps['gatewayConfigured'] is False and release_maps['liveGatewayVerified'] is False,'Static release unexpectedly claims live gateway'
    assert release_maps['snapshotGeneratedAt']==snapshot['generatedAt'] and release_maps['coveredCities']==len(entries) and release_maps['facilityCount']==card_count,'Snapshot release metadata mismatch'
    for mirror in catalog['mirrors']:
        original=z.read(prefix+mirror['source']).decode()
        actual=z.read(prefix+mirror['path']).decode()
        if mirror['transformation']=='identical':assert actual==original,mirror['path']
        else:
            # Only URL relocation may differ: all narrative/code/table text must agree.
            pattern=r'(!?\[[^\]\n]*\]\()([^\s)]+)(\))'
            assert re.sub(pattern,r'\1URL\3',actual)==re.sub(pattern,r'\1URL\3',original),mirror['path']
    assert catalog['guideSources']==['source/deliverables/'+n for n in GUIDE_DOCS]
    guide=z.read(prefix+'documents/Salamatban-Complete-Guide-fa.html').decode()
    for i,doc in enumerate(GUIDE_DOCS):
        origin='deliverables/'+doc
        expected=f'<section id="doc-{i}">'+markdown(linked(z.read(prefix+'source/'+origin).decode(),origin,'documents/Salamatban-Complete-Guide-fa.html'))+'</section>'
        assert guide.count(expected)==1,doc
    assert z.getinfo(prefix+'Start-Mac-Linux.command').external_attr >> 16 & 0o111
    fallback_script = r"""const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const html=fs.readFileSync(0,'utf8');const elements={};const document={getElementById(id){return elements[id]??={hidden:true,textContent:''};}};for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInNewContext(match[1],{location:{protocol:'file:'},document});assert.equal(elements['local-launch'].hidden,false);assert.match(elements['launch-status'].textContent,/یکی از روش/);console.log('PASS file protocol branch: launch instructions replace loading state');"""
    subprocess.run(['node','-e',fallback_script],input=z.read(prefix+'website/index.html'),check=True)
    report={'directFileFallback':'file protocol branch executed in JavaScript VM; managed Chromium blocks native file navigation','archive':archive.name,'integrity':'passed','manifestFiles':len(manifest['files']),'matchedCurrentFiles':compared,'checkedLocalLinks':checked_links,'checkedMirrors':len(catalog['mirrors']),'guideSectionsMatchSources':len(GUIDE_DOCS),'packageVersion':catalog['packageVersion'],'appVersion':catalog['appVersion'],'missingLinks':missing,'exclusions':'passed','snapshotIntegrity':{'sourceBuildMatch':True,'metadataMatch':True,'provider':'geoapify','mode':'snapshot','coveredCities':len(entries),'facilityCards':card_count},'configuredMapCredentialScan':'passed' if configured_secrets else 'no map credential present in validation environment'}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if len(sys.argv)==1:(root/'review-evidence/ux-archive-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if missing:raise SystemExit(1)
