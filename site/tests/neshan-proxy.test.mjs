import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('Neshan public gateway preserves server secrets and fails closed without configuration', { timeout: 60000 }, async t => {
  const root = process.cwd(), output = path.resolve('.test-build/neshan-proxy.mjs'), reportPath = '.test-build/neshan-proxy-tests.json';
  await mkdir('.test-build', { recursive: true }); await rm(reportPath, { force: true });
  globalThis.__neshanBindings = {};
  const bundle = await build({ stdin: { resolveDir: root, loader: 'ts', contents: `export * from './lib/maps/neshan';export * from './lib/maps/hospital-handler';export * from './lib/maps/rate-limit';export {GET as routeGet,OPTIONS as routeOptions} from './app/api/maps/hospitals/route';export {default as mapsWorker} from './maps-worker/index';` }, outfile: output, bundle: true, platform: 'node', format: 'esm', metafile: true, alias: { '@': root }, plugins: [{ name: 'synthetic-cloud-bindings', setup(builder) { builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'bindings', namespace: 'test' })); builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const env=globalThis.__neshanBindings;', loader: 'js' })); } }] });
  assert.equal(Object.keys(bundle.metafile.inputs).some(file => /lib\/pilot\/(?:service|config|providers)/.test(file)), false, 'The geographic API must not import health auth or provider settings');
  const m = await import(pathToFileURL(output).href), checks = [], secret = 'synthetic-neshan-key-never-a-live-credential';
  const tracked = Object.keys(bundle.metafile.inputs).filter(file => !file.startsWith('test:') && file !== '<stdin>').concat('tests/neshan-proxy.test.mjs','maps-worker/migrations/0001_maps_rate_limits.sql','wrangler.maps.example.jsonc').sort();
  const hash = value => createHash('sha256').update(value).digest('hex');
  async function sourceHashes() { return Object.fromEntries(await Promise.all(tracked.map(async file => [file, hash(await readFile(file))]))); }
  const sourceFiles = await sourceHashes();
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-05-15', d1Databases: ['DB'] }));
  const db = await mf.getD1Database('DB'); await db.prepare(await readFile('maps-worker/migrations/0001_maps_rate_limits.sql','utf8')).run();
  t.after(async () => { await mf.dispose(); delete globalThis.__neshanBindings; });
  async function check(name, fn) { await t.test(name, async () => { await fn(); checks.push(name); }); }
  const request = (query = 'city=تهران&province=تهران', headers = {}, method = 'GET') => new Request('https://gateway.test/api/maps/hospitals?' + query, { method, headers });
  const item = (title, x = 51.4, y = 35.7, extra = {}) => ({ title, address: 'نشانی ساختگی آزمون', type: 'poi', category: 'unknown-test-category', location: { x, y }, ...extra });
  const json = value => Response.json(value);
  function provider(calls = []) { return async (input, init) => { const url = new URL(input); calls.push({ url, init }); return url.pathname === '/geocoding/v1' ? json({ lat: 35.7, lng: 51.4 }) : json({ count: 1, items: [item(url.searchParams.get('term') === 'درمانگاه' ? 'درمانگاه نمونه آزمون' : 'بیمارستان نمونه آزمون')] }); }; }
  const options = (extra = {}) => ({ apiKey: secret, limit: async () => {}, fetcher: provider(), ...extra });

  await check('missing key or durable limiter is explicitly not configured and makes no upstream request', async () => {
    let calls = 0; const fetcher = async () => { calls++; throw Error('must not fetch'); };
    for (const extra of [{ apiKey: '' }, { limit: undefined }]) { const r = await m.handleHospitalLookup(request(), options({ fetcher, ...extra })); assert.equal(r.status, 503); assert.deepEqual(await r.json(), { error: 'NESHAN_NOT_CONFIGURED' }); }
    assert.equal(calls, 0);
  });
  await check('input is bounded, duplicate and unrelated parameters are rejected, and city IDs own canonical labels', async () => {
    let calls = 0; const fetcher = async () => { calls++; throw Error('must not fetch'); };
    for (const query of ['', 'city=تهران&city=شیراز', 'city=تهران&term=pharmacy', 'city=تهران&answers=urgent', 'city=تهران&url=https://evil.test', 'cityId=unknown', 'city=' + 'a'.repeat(101), 'city=https://evil.test']) {
      assert.equal((await m.handleHospitalLookup(request(query), options({ fetcher }))).status, 400, query);
    }
    assert.equal((await m.handleHospitalLookup(request('city=تهران', {}, 'POST'), options({ fetcher }))).status, 405);
    assert.equal(calls, 0);
    const city = m.requestCity(new URL('https://gateway.test/?cityId=ir-tehran&city=شیراز&province=فارس'));
    assert.equal(city.city, 'تهران'); assert.equal(city.province, 'تهران');
  });
  await check('CORS permits exact same/public/configured origins without credentials and blocks other origins before quota', async () => {
    let limits = 0; const o = options({ allowedOrigins: ['https://review.example', '*'], limit: async () => { limits++; } });
    for (const origin of ['https://gateway.test', 'https://ourgemeniprostudent-png.github.io', 'https://review.example']) { const r = await m.handleHospitalLookup(request(undefined, { origin }), o); assert.equal(r.status, 200); assert.equal(r.headers.get('access-control-allow-origin'), origin); assert.equal(r.headers.has('access-control-allow-credentials'), false); assert.equal(r.headers.get('vary'), 'Origin'); }
    for (const origin of ['https://evil.test', 'https://review.example.evil.test', 'null']) { const r = await m.handleHospitalLookup(request(undefined, { origin }), o); assert.equal(r.status, 403); assert.equal(r.headers.has('access-control-allow-origin'), false); }
    assert.equal(limits, 3);
    const preflight = await m.handleHospitalLookup(request('', { origin: 'https://review.example', 'access-control-request-method': 'GET' }, 'OPTIONS'), o);
    assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, OPTIONS'); assert.equal(limits, 3);
  });
  await check('fixed geocode and hospital/clinic searches expose only administrative location and the server key header', async () => {
    const calls = []; let limits = 0;
    const r = await m.handleHospitalLookup(request('city=گلوگاه&province=مازندران&county=بابل', { cookie: 'private-session', authorization: 'private-auth', 'x-csrf-token': 'private-csrf' }), options({ fetcher: provider(calls), limit: async () => { limits++; assert.equal(calls.length, 0); } }));
    assert.equal(r.status, 200); const result = await r.json(); assert.equal(limits, 1); assert.equal(calls.length, 3);
    assert.deepEqual(JSON.parse(calls[0].url.searchParams.get('json')), { address: 'ایران، مازندران، بابل، گلوگاه' });
    assert.deepEqual(calls.slice(1).map(c => c.url.searchParams.get('term')).sort(), ['بیمارستان', 'درمانگاه'].sort());
    for (const { url, init } of calls) { assert.equal(url.origin, 'https://api.neshan.org'); assert.equal(init.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error'); assert.deepEqual(Object.keys(init.headers).sort(), ['Accept', 'Api-Key']); assert.equal(init.headers['Api-Key'], secret); assert.equal(init.body, undefined); assert.doesNotMatch(url.href, /private-|urgent|synthetic-neshan-key/); }
    assert.equal(result.provider, 'neshan'); assert.equal(result.basis, 'city-search'); assert.equal(result.classification, 'name-match-unverified'); assert.equal(result.facilities.length, 2); assert.equal(result.facilities[0].classification, 'name-match-unverified'); assert.ok(Date.parse(result.retrievedAt)); assert.doesNotMatch(JSON.stringify(result), /synthetic-neshan-key|private-/);
    const mixed = await m.searchNeshanHospitals({ city: 'تهران', province: '', county: '' }, options({ fetcher: async input => { const url = new URL(input); return url.pathname === '/geocoding/v1' ? json({ lat: 35.7, lng: 51.4 }) : json({ items: url.searchParams.get('term') === 'درمانگاه' ? [item('درمانگاه آزمون')] : Array.from({ length: 6 }, (_, index) => item('بیمارستان آزمون ' + index, 51.4 + index / 100)) }); } }));
    assert.equal(mixed.facilities.length, 6); assert.ok(mixed.facilities.some(f => f.name.startsWith('درمانگاه')));
  });
  await check('unsupported schemas and coordinates fail explicitly; name matching never upgrades roads to verified care', async () => {
    for (const payload of [{}, { location: { x: 51.4, y: 35.7 } }, { lat: null, lng: 51.4 }, { lat: '35.7', lng: 51.4 }, { lat: 0, lng: 0 }]) assert.throws(() => m.parseNeshanGeocode(payload), e => e.code === 'NESHAN_UNSUPPORTED_RESPONSE');
    assert.deepEqual(m.parseNeshanGeocode({ latitude: 35.7, longitude: 51.4 }), { latitude: 35.7, longitude: 51.4 });
    for (const payload of [{}, { items: {} }, { items: [{ name: 'unknown schema' }] }, { items: [item('بیمارستان آزمون', 200)] }]) assert.throws(() => m.parseNeshanSearch(payload), e => e.code === 'NESHAN_UNSUPPORTED_RESPONSE');
    const result = m.parseNeshanSearch({ items: [item('بیمارستان نمونه'), item('بیمارستان نمونه'), item('بیمارستان خیابان', 51.4, 35.7, { type: 'street' }), item('درمانگاه ایستگاه', 51.4, 35.7, { category: 'bus_stop' }), item('رستوران نمونه'), item('داروخانه بیمارستان نمونه'), item('ایستگاه بیمارستان نمونه'), item('بیمارستان نمونه - پارکینگ'), item('بیمارستان نمونه pharmacy'), item('درمانگاه نمونه', 51.41)] });
    assert.equal(result.length, 2); assert.ok(result.every(row => row.classification === 'name-match-unverified'));
    assert.deepEqual(m.parseNeshanSearch({ items: [] }), []);
  });
  await check('upstream status errors and malformed JSON never echo provider secrets or raw errors', async () => {
    for (const fetcher of [async () => new Response(secret, { status: 401 }), async () => { throw Error(secret); }, async () => new Response(secret, { status: 200 })]) { const r = await m.handleHospitalLookup(request(), options({ fetcher })); assert.equal(r.status, 502); assert.doesNotMatch(await r.text(), new RegExp(secret)); }
    const unsupported = await m.handleHospitalLookup(request(), options({ fetcher: async () => json({ unexpected: 'schema' }) })); assert.deepEqual(await unsupported.json(), { error: 'NESHAN_UNSUPPORTED_RESPONSE' });
  });
  await check('announced and streamed upstream responses are bounded before parsing', async () => {
    for (const response of [new Response('small', { headers: { 'content-length': '9999' } }), new Response('x'.repeat(120))]) { const r = await m.handleHospitalLookup(request(), options({ maxBytes: 100, fetcher: async () => response })); assert.equal(r.status, 502); assert.deepEqual(await r.json(), { error: 'NESHAN_RESPONSE_TOO_LARGE' }); }
  });
  await check('hung providers time out, abort, and leave emergency guidance independent', async () => {
    let signal; const r = await m.handleHospitalLookup(request(), options({ timeoutMs: 20, fetcher: (_url, init) => { signal = init.signal; return new Promise(() => {}); } }));
    assert.equal(r.status, 504); assert.equal(signal.aborted, true); assert.deepEqual(await r.json(), { error: 'NESHAN_TIMEOUT' });
  });
  await check('durable atomic quotas limit concurrent callers and store only hashed IP buckets', async () => {
    let now = 100000; const limit = m.createNeshanRateLimit(db, secret, { now: () => now, perIpMinute: 2, globalMinute: 100, globalDay: 100 });
    const req = request(undefined, { 'cf-connecting-ip': '192.0.2.88', 'x-forwarded-for': 'do-not-trust' });
    const results = await Promise.allSettled([limit(req), limit(req), limit(req)]); assert.equal(results.filter(r => r.status === 'fulfilled').length, 2); assert.equal(results.filter(r => r.status === 'rejected' && r.reason.code === 'NESHAN_RATE_LIMITED').length, 1);
    const rows = (await db.prepare('SELECT key FROM pilot_rate_limits').all()).results; assert.doesNotMatch(JSON.stringify(rows), /192\.0\.2\.88|do-not-trust|synthetic-neshan-key/); assert.ok(rows.some(row => /^neshan:ip:[a-f0-9]{64}$/.test(row.key)));
    let calls = 0; const blocked = await m.handleHospitalLookup(req, options({ limit, fetcher: async () => { calls++; return json({}); } })); assert.equal(blocked.status, 429); assert.equal(blocked.headers.get('retry-after'), '60'); assert.equal(calls, 0);
    for(let index=0;index<5;index++)await assert.rejects(limit(req),e=>e.code==='NESHAN_RATE_LIMITED');
    const globalQuota=await db.prepare("SELECT count FROM pilot_rate_limits WHERE key='neshan:global:day'").first();assert.equal(globalQuota.count,2,'Repeated over-quota requests from one IP must not spend global daily allowance');
    now += 60001; await limit(req);
    const broken = m.createNeshanRateLimit({ prepare() { throw Error('private database detail'); } }, secret); const notReady = await m.handleHospitalLookup(request(), options({ limit: broken })); assert.equal(notReady.status, 503); assert.deepEqual(await notReady.json(), { error: 'NESHAN_NOT_CONFIGURED' });
  });
  await check('Cloudflare app route and isolated Worker read server bindings without clinical readiness or patient routes', async () => {
    const workerUnavailable=await m.mapsWorker.fetch(request(undefined,{origin:'https://ourgemeniprostudent-png.github.io'}),{});assert.equal(workerUnavailable.status,503);assert.equal(workerUnavailable.headers.get('access-control-allow-origin'),'https://ourgemeniprostudent-png.github.io');
    const wrongPath=await m.mapsWorker.fetch(new Request('https://gateway.test/api/pilot/record'),{});assert.equal(wrongPath.status,404);
    const workerPreflight=await m.mapsWorker.fetch(request('',{origin:'https://ourgemeniprostudent-png.github.io','access-control-request-method':'GET'},'OPTIONS'),{});assert.equal(workerPreflight.status,204);
    Object.assign(globalThis.__neshanBindings, { NESHAN_API_KEY: secret, DB: db, NESHAN_ALLOWED_ORIGINS: 'https://review.example' });
    const oldFetch = globalThis.fetch; globalThis.fetch = provider();
    try { const r = await m.routeGet(request(undefined, { origin: 'https://review.example', 'cf-connecting-ip': '192.0.2.99' })); assert.equal(r.status, 200); assert.equal(r.headers.get('access-control-allow-origin'), 'https://review.example'); assert.doesNotMatch(await r.text(), /synthetic-neshan-key/); } finally { globalThis.fetch = oldFetch; }
  });
  assert.equal(checks.length, 10, 'Passing evidence requires all ten subtests'); assert.deepEqual(await sourceHashes(), sourceFiles);
  await writeFile(reportPath, JSON.stringify({ status: 'passed', completedAt: new Date().toISOString(), individualPassed: checks.length, checks, sourceFiles, sourceSha256: hash(JSON.stringify(sourceFiles)), limitations: 'Synthetic provider responses and ephemeral Miniflare D1 only. No live Neshan key, current response schema, medical-category coverage, capacity, ranking, gateway hosting or publication has been validated. Search results are explicitly name-matched, not verified facility types.' }, null, 2) + '\n');
});
