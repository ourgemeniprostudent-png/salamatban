#!/usr/bin/env python3
"""Run the included static demonstration. Python 3 standard library only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse, webbrowser
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8765)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent / 'website'
if not (root / 'index.html').is_file():
    raise SystemExit('Extract the entire ZIP before starting the demonstration.')
class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.wasm': 'application/wasm', '.js': 'text/javascript', '.woff2': 'font/woff2'}
server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(root)))
url = f'http://127.0.0.1:{server.server_port}/'
print('Salamatban demo: ' + url, flush=True)
print('Keep this window open. Press Ctrl+C to stop.', flush=True)
if not args.no_browser:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
