import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Match the public font URLs used by Next, the demo and isolated UI harnesses. */
export function publicFontAssets(root, { bundle = false } = {}) {
  return { name: 'public-font-assets', setup(builder) {
    builder.onResolve({ filter: /^\/fonts\/[^/]+\.woff2$/ }, ({ path: fontPath }) => bundle
      ? { path: path.join(root, 'public', fontPath.slice(1)) }
      // The complete demo copies public/fonts next to app.css. Relative URLs
      // preserve the same request in preload/CSS under a hosting subdirectory.
      : { path: `.${fontPath}`, external: true });
  } };
}

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
