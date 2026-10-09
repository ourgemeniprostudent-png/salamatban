"""Shared delivery version, document catalog and deterministic rendering. No I/O on import."""
import hashlib,html,posixpath,re
from urllib.parse import urlsplit,urlunsplit
VERSION = '2.4.7'
APP_VERSION = '2.4.7'
PUBLIC_APP_VERSION = '2.4.7'
GUIDE_DOCS = ['SHOWCASE-GUIDE-fa.md']
DOCS = [
 'SHOWCASE-GUIDE-fa.md', 'COMPLETE-DEMO-fa.md', 'VISUAL-VALUE-fa.md', 'WORKFLOW-ARCHITECTURE-v2.2-fa.md', 'VISUAL-EXPERIENCE-v2.1-fa.md', 'JOURNEY-v2.0-fa.md',
 'DELIVERY-STATUS-fa.md', 'GEOAPIFY-INTEGRATION-fa.md', 'NESHAN-INTEGRATION-fa.md', 'salamatban-product-architecture-fa.md',
 'UX-IMPROVEMENTS-fa.md', 'FLOW-REVIEW-v1.7-fa.md', 'UX-LOCATION-CONTRACT-fa.md',
 'DEVELOPER-HANDOFF-fa.md', 'salamatban-release-checklist-fa.md',
 'FIRST-OPERATIONAL-RELEASE-fa.md', 'architecture/runtime-v1.6.md',
 'architecture/SALAMATBAN-1000-USERS-fa.md', 'architecture/database-1000-users-fa.md',
]
EVIDENCE = ['ux-release.json', 'ux-publication.json', 'architecture-database-validation.json']
MIRRORS = {f'deliverables/{n}':f'technical/{n}' for n in DOCS + ['launch-budget.csv','launch-readiness-register.csv','architecture/postgresql-target-schema.sql']}
MIRRORS.update({f'review-evidence/{n}':f'technical/{n}' for n in EVIDENCE})
LINK = re.compile(r'(!?\[[^\]\n]*\]\()([^\s)]+)(\))')

def digest(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()

def relocate(url, origin, output):
 parsed=urlsplit(html.unescape(url))
 if parsed.scheme or parsed.netloc or not parsed.path:
  return url
 target=posixpath.normpath(posixpath.join(posixpath.dirname(origin),parsed.path))
 destination=MIRRORS.get(target, 'source/'+target)
 return urlunsplit(('', '', posixpath.relpath(destination,posixpath.dirname(output)),parsed.query,parsed.fragment))

def linked(text,origin,output):
 # Preserve fenced examples as text; relocate actual Markdown references.
 chunks=re.split(r'(```[\s\S]*?```)',text)
 return ''.join(c if c.startswith('```') else LINK.sub(lambda m:m[1]+relocate(m[2],origin,output)+m[3],c) for c in chunks)

def inline(value):
 value=html.escape(value)
 value=re.sub(r'`([^`]+)`',r'<code>\1</code>',value)
 value=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',value)
 return re.sub(r'\[([^]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',value)

def markdown(text):
 result,paragraph,code,table=[],[],None,False
 def flush():
  if paragraph:result.append('<p>'+inline(' '.join(paragraph))+'</p>');paragraph.clear()
 for line in text.splitlines():
  if line.startswith('```'):
   flush()
   if code is None:code=[]
   else:result.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');code=None
   continue
  if code is not None:code.append(line);continue
  if line.startswith('|'):
   flush()
   if re.fullmatch(r'[| :\-]+',line):continue
   cells=line.strip('|').split('|')
   if not table:result.append('<table><thead><tr>'+''.join('<th>'+inline(c.strip())+'</th>' for c in cells)+'</tr></thead><tbody>');table=True
   else:result.append('<tr>'+''.join('<td>'+inline(c.strip())+'</td>' for c in cells)+'</tr>')
   continue
  if table:result.append('</tbody></table>');table=False
  if not line.strip():flush()
  elif line.startswith('#'):
   flush();level=min(len(line)-len(line.lstrip('#'))+1,5)
   result.append(f'<h{level}>'+inline(line.lstrip('#').strip())+f'</h{level}>')
  elif line.startswith('- '):flush();result.append('<p>• '+inline(line[2:])+'</p>')
  else:paragraph.append(line)
 flush()
 if table:result.append('</tbody></table>')
 return '\n'.join(result)

def page(title,body,css):
 return '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+'</title><style>'+css+'</style></head><body><main>'+body+'</main></body></html>'

