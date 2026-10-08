/** Refresh the public demo's dated medical-place snapshot using server-only code.
 * Node 24: node --use-env-proxy scripts/refresh-care-snapshot.mjs [--resume]
 * GEOAPIFY_API_KEY must be supplied through the environment, never an argument.
 * A bounded, sequential collection (at most 3 provider calls per selected city).
 * Does not crawl Google, collect patient locations, or publish any credentials.
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiKey = process.env.GEOAPIFY_API_KEY;
if (!apiKey) { console.error('GEOAPIFY_API_KEY is required in the environment.'); process.exit(2); }
const scratch = path.join(site, '.test-build');
await mkdir(scratch, { recursive: true });
const modulePath = path.join(scratch, 'care-snapshot-provider.mjs');
await build({ stdin: { contents: "export { cities } from './lib/data/cities'; export { searchGeoapifyHospitals, GeoapifyError } from './lib/maps/geoapify';", resolveDir: site, loader: 'ts' }, outfile: modulePath, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const { cities, searchGeoapifyHospitals, GeoapifyError } = await import(pathToFileURL(modulePath).href);
const additional = [
  ['صفادشت','تهران'], ['ملارد','تهران'], ['شهریار','تهران'], ['اندیشه','تهران'],
  ['فردیس','البرز'], ['ماهدشت','البرز'], ['کرج','البرز'], ['کیش','هرمزگان'],
  ['کاشان','اصفهان'], ['آمل','مازندران'], ['بابل','مازندران'], ['رامسر','مازندران'],
  ['بندرانزلی','گیلان'], ['نیشابور','خراسان رضوی'], ['نجف آباد','اصفهان'],
];
const compact = value => value.replace(/[\s‌-]/g, '').replace(/ي/g,'ی').replace(/ك/g,'ک');
const selected = new Map();
for (const [name, province] of additional) {
  const found = cities.filter(city => compact(city.name) === compact(name) && city.province === province);
  if (found.length !== 1) throw new Error(`The selected city is not unique in the catalog: ${name}`);
  selected.set(found[0].id, found[0]);
}
for (const city of cities.slice(0,31)) selected.set(city.id, city);
const progressPath = path.join(scratch, 'care-snapshot-progress.json');
const providerRevision = createHash('sha256').update(await readFile(path.join(site,'lib/maps/geoapify.ts'))).update(await readFile(path.join(site,'lib/data/cities.ts'))).digest('hex');
let records = {};
if (process.argv.includes('--resume')) {
  try { const saved=JSON.parse(await readFile(progressPath,'utf8')); if(saved.providerRevision===providerRevision) records=saved.records||{}; } catch { /* New collection. */ }
}
for (const city of selected.values()) {
  if (records[city.id]?.result) continue;
  try {
    const result = await searchGeoapifyHospitals({ cityId:city.id, city:city.name, province:city.province, county:city.county || '' }, { apiKey, timeoutMs:15000 });
    if (JSON.stringify(result).includes(apiKey)) throw new Error('Credential leak prevented');
    records[city.id] = { result };
    console.log(JSON.stringify({ city:city.name, state:'collected', facilities:result.facilities.length, radiusMeters:result.radiusMeters }));
  } catch (error) {
    const code = error instanceof GeoapifyError ? error.code : 'COLLECTION_FAILED';
    records[city.id] = { error:code, city:city.name };
    console.log(JSON.stringify({ city:city.name, state:'omitted', code }));
  }
  await writeFile(progressPath, JSON.stringify({ providerRevision, records }, null, 2) + '\n');
  await new Promise(resolve => setTimeout(resolve, 350));
}
const entries = [...selected.keys()].flatMap(id => records[id]?.result ? [records[id].result] : []);
if (!entries.some(entry => compact(entry.city) === 'صفادشت' && entry.facilities.length)) throw new Error('Safadasht coverage is required; previous public snapshot was not replaced.');
const snapshot = {
  schemaVersion:1, provider:'geoapify', mode:'snapshot', generatedAt:new Date().toISOString(),
  providerRevision,
  attribution:{ provider:'Geoapify', providerUrl:'https://www.geoapify.com/', data:'© OpenStreetMap contributors', licenseUrl:'https://www.openstreetmap.org/copyright' },
  coverage:{ selectedCities:selected.size, includedCities:entries.length, omittedCities:selected.size-entries.length },
  entries,
};
const publicData = path.join(site,'public/data');
await mkdir(publicData,{recursive:true});
await writeFile(path.join(publicData,'care-facilities.geoapify.json'),JSON.stringify(snapshot,null,2)+'\n');
console.log(JSON.stringify({ state:'snapshot_written', cities:entries.length, facilities:entries.reduce((sum,entry)=>sum+entry.facilities.length,0), failed:selected.size-entries.length }));
