#!/usr/bin/env python3
"""Run the delivered prebuilt server against its delivered website and document."""
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import re
import selectors
import subprocess
import tempfile
from urllib.request import HTTPCookieProcessor, Request, build_opener
import zipfile

from delivery_docs import VERSION

root = Path(__file__).resolve().parent.parent
name = f'Salamatban-Complete-Delivery-v{VERSION}'
archive = root / 'deliverables' / f'{name}.zip'
checks = []
with tempfile.TemporaryDirectory(prefix='salamatban-packet-server-') as tmp:
    with zipfile.ZipFile(archive) as z:
        for entry in z.infolist():
            if entry.filename.startswith((name + '/website/', name + '/shared-demo-server/')):
                assert '..' not in Path(entry.filename).parts
                z.extract(entry, tmp)
    base = Path(tmp) / name
    env = {**os.environ, 'PORT': '0', 'NEXT_DEMO_DB': str(Path(tmp) / 'private/care.sqlite')}
    env.pop('NEXT_DEMO_WEBSITE', None)
    env.pop('NEXT_DEMO_ORIGIN', None)
    process = subprocess.Popen(['node', str(base / 'shared-demo-server/main.mjs')],
                               env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        selector = selectors.DefaultSelector()
        selector.register(process.stdout, selectors.EVENT_READ)
        assert selector.select(20), 'Packaged server did not start'
        line = process.stdout.readline().decode()
        port = re.search(r'ready on port (\d+)', line)
        assert port, line
        origin = 'http://127.0.0.1:' + port.group(1)
        client = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))

        def get(route):
            with client.open(origin + route, timeout=10) as response:
                return response.read()

        assert json.loads(get('/next/config.json'))['mode'] == 'shared-demo'
        assert get('/next/') == (base / 'website/next/index.html').read_bytes()
        checks.append('prebuilt server discovers the extracted website and shared mode')
        request = Request(origin + '/api/care/auth/sample', method='POST',
                          data=json.dumps({'phone': '09000000003'}).encode(),
                          headers={'Content-Type': 'application/json', 'Origin': origin})
        with client.open(request, timeout=10) as response:
            assert json.loads(response.read())['user']['phone'] == '09000000003'
        case = json.loads(get('/api/care/view'))['member']
        assert case['phone'] == '09000000003'
        checks.append('cookie session opens the prepared patient from the extracted server')
        file = next(f for f in case['files'] if f.get('fixture'))
        content = get('/api/care/files/' + case['phone'] + '/' + file['id'])
        expected = (base / 'website/next' / file['fixture']).read_bytes()
        assert content.startswith(b'%PDF-') and content == expected
        assert hashlib.sha256(content).hexdigest() == file['checksum']
        checks.append('scoped prepared PDF matches the packaged original and recorded checksum')
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
report = {'version': VERSION, 'passed': len(checks), 'checks': checks,
          'scope': 'Extracted prebuilt server, local only; no public deployment'}
(root / 'review-evidence/next/packaged-server.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
