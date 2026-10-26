from pathlib import Path
import base64,hashlib,json
root=Path(__file__).parent
out=root.parent/'dist-journey';out.mkdir(exist_ok=True)
s=(root/'template.html').read_text()
for prefix,stem in [('DOCTORS','doctors'),('MEMBER_HOME','member-home'),('LOGIN','login'),('WORKFLOW','workflow')]:
 for ext in ['css','html','js']:
  p=root/(stem+'.'+ext)
  if p.exists():s=s.replace('__'+prefix+'_'+ext.upper()+'__',p.read_text())
s=s.replace('__PERSISTENCE_JS__',(root/'persistence.js').read_text())
for token,path in [('__FAVICON__','favicon.svg'),('__REGULAR__','PeydaWebFaNum-Regular.woff2'),('__BOLD__','PeydaWebFaNum-Bold.woff2'),('__BODY__','body.png')]+[('__DOCTOR_'+n.upper()+'__','doctor-'+n+'.webp') for n in ['nazanin','arman','kaveh']]:
 s=s.replace(token,base64.b64encode((root/'assets'/path).read_bytes()).decode())
assert '__LOGIN_' not in s and '__PERSISTENCE_' not in s
s=s.translate(str.maketrans({'ٔ':'','ٕ':'','أ':'ا','إ':'ا','ؤ':'و','ئ':'ی','ء':''}))
(out/'index.html').write_text(s)
release={'version':'4.1.0','path':'/salamatban/next/','mode':'persistent browser demo','accounts':8,'storage':'IndexedDB per user; localStorage session','serverAuthentication':False,'clinicalService':False,'staffWorkspaces':'physician and coordinator connected local demo','assets':{'index.html':hashlib.sha256((out/'index.html').read_bytes()).hexdigest()}}
(out/'release.json').write_text(json.dumps(release,indent=2)+'\n')
print('Built v4 member journey:',out)
