import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({ absWorkingDir: root, entryPoints: ['maps-server/index.ts'], outfile: path.join(root, 'dist-maps-server/server.mjs'), bundle: true, platform: 'node', format: 'esm', target: 'node24' });
console.log('Standalone maps server built. Runtime provider key is not read or embedded by this build.');
