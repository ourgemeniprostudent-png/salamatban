import { build } from 'esbuild';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { demoBindings, publicFontAssets } from './bundle.mjs';

export const mapsFixtureEndpoint = 'https://maps.salamatban.example/api/maps/hospitals';

/** Build only an ignored test variant; the released default-null app is untouched. */
export async function configuredMapsFixture(root, name) {
  const directory = path.join(root, '.test-build', name);
  await mkdir(directory, { recursive: true });
  const result = await build({
    absWorkingDir: root, entryPoints: ['demo/main.tsx'], outdir: directory,
    entryNames: 'app', assetNames: 'assets/[name]-[hash]', bundle: true,
    format: 'esm', platform: 'browser', target: ['es2022'], minify: true,
    define: { 'process.env.NODE_ENV': '"production"', __SALAMATBAN_MAPS_GATEWAY_URL__: JSON.stringify(mapsFixtureEndpoint) },
    metafile: true, loader: { '.sql': 'text', '.woff2': 'file', '.png': 'file' },
    alias: { '@': root }, plugins: [demoBindings(root), publicFontAssets(root)],
  });
  if (Object.keys(result.metafile.inputs).some(file => /(?:^|\/)lib\/maps\//.test(file))) throw new Error('Server provider code entered the browser test fixture');
  const assets = {};
  for (const file of ['app.js', 'app.css']) assets[file] = createHash('sha256').update(await readFile(path.join(directory, file))).digest('hex');
  return {
    evidence: { endpoint: mapsFixtureEndpoint, assets, mockedGateway: true, liveProviderVerified: false, scope: 'Isolated demo bundle differs from the released app only by its public gateway configuration; no provider credential is bundled.' },
    async read(relative, configured = true) {
      const file = relative.replace(/^\/+/, '') || 'index.html';
      const production = path.resolve(root, 'dist-demo', file);
      if (!production.startsWith(path.resolve(root, 'dist-demo') + path.sep)) throw new Error('Asset outside demo root');
      if (configured && (file === 'app.js' || file === 'app.css' || file.startsWith('assets/'))) {
        try { return await readFile(path.join(directory, file)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      return readFile(production);
    },
  };
}
