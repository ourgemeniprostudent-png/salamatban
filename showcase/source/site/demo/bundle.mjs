import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function demoBindings(root) {
  return { name: 'demo-worker-bindings', setup(b) {
    b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'demo-bindings', namespace: 'demo' }));
    b.onLoad({ filter: /.*/, namespace: 'demo' }, () => ({ contents: 'export const env = {};', loader: 'js' }));
    b.onLoad({ filter: /[\\/]lib[\\/]pilot[\\/]service\.ts$/ }, async ({ path: file }) => ({
      contents: `import { DemoResponse as Response } from ${JSON.stringify(path.join(root, 'demo/response.ts'))};\n` + await readFile(file, 'utf8'),
      loader: 'ts', resolveDir: path.dirname(file),
    }));
  } };
}
