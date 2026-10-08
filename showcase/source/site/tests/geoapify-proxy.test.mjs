import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('Geoapify geographic gateway uses bounded, private, conservative medical category searches', { timeout: 60000 }, async t => {
  const root = process.cwd(), output = path.resolve('.test-build/geoapify-proxy.mjs'), reportPath = '.test-build/geoapify-proxy-tests.json';
  await mkdir('.test-build', { recursive: true }); await rm(reportPath, { force: true });
  globalThis.__geoapifyBindings = {};
  const bundle = await build({ stdin: { resolveDir: root, loader: 'ts', contents: `export * from './lib/maps/geoapify';export * from './lib/maps/hospital-handler';export * from './lib/maps/rate-limit';export {GET as routeGet,OPTIONS as routeOptions} from './app/api/maps/hospitals/route';export {default as mapsWorker} from './maps-worker/index';` }, outfile: output, bundle: true, platform: 'node', format: 'esm', metafile: true, alias: { '@': root }, plugins: [{ name: 'synthetic-cloud-bindings', setup(builder) { builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'bindings', namespace: 'test' })); builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const env=globalThis.__geoapifyBindings;', loader: 'js' })); } }] });
  assert.equal(Object.keys(bundle.metafile.inputs).some(file => /lib\/pilot\/(?:service|config|providers)|lib\/maps\/neshan/.test(file)), false, 'No health model/session or fallback provider may enter the geographic API');
  const m = await import(pathToFileURL(output).href), checks = [], secret = 'synthetic-geoapify-key-not-a-live-credential';
  const tracked = Object.keys(bundle.metafile.inputs).filter(file => !file.startsWith('test:') && file !== '<stdin>').concat('tests/geoapify-proxy.test.mjs','maps-worker/migrations/0001_maps_rate_limits.sql','wrangler.maps.example.jsonc').sort();
  const hash = value => createHash('sha256').update(value).digest('hex');
  async function sourceHashes() { return Object.fromEntries(await Promise.all(tracked.map(async file => [file, hash(await readFile(file))]))); }
  const sourceFiles = await sourceHashes();
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-05-15', d1Databases: ['DB'] }));
  const db = await mf.getD1Database('DB'); await db.prepare(await readFile('maps-worker/migrations/0001_maps_rate_limits.sql','utf8')).run();
  t.after(async () => { await mf.dispose(); delete globalThis.__geoapifyBindings; });
  async function check(name, fn) { await t.test(name, async () => { await fn(); checks.push(name); }); }
  const request = (query = 'city=تهران&province=تهران', headers = {}, method = 'GET') => new Request('https://gateway.test/api/maps/hospitals?' + query, { method, headers });
  const center = { latitude: 35.7, longitude: 51.4 }, city = { city: 'تهران', province: 'تهران', county: '' };
  const geocode = (extra = {}) => ({ country_code: 'ir', result_type: 'city', state: 'استان تهران', county: 'شهرستان تهران', city: 'تهران', lat: 35.7, lon: 51.4, ...extra });
  const feature = (name = 'بیمارستان آزمون', categories = ['healthcare.hospital'], extra = {}) => ({ type: 'Feature', properties: { name, categories, formatted: 'نشانی ساختگی آزمون', lat: 35.701, lon: 51.401, place_id: name, ...extra } });
  const places = (features = [feature()]) => ({ type: 'FeatureCollection', features });
  const json = value => Response.json(value);
  function provider(calls = [], data = {}) { return async (input, init) => { const url = new URL(input); calls.push({ url, init }); return url.pathname === '/v1/geocode/search' ? json(data.geocode || { results: [geocode()] }) : json(data.places || places()); }; }
  const options = (extra = {}) => ({ apiKey: secret, limit: async () => {}, fetcher: provider(), ...extra });

  await check('missing key or durable limiter is explicit and makes no upstream request', async () => {
    let calls = 0; const fetcher = async () => { calls++; throw Error('must not fetch'); };
    for (const extra of [{ apiKey: '' }, { limit: undefined }]) { const r = await m.handleHospitalLookup(request(), options({ fetcher, ...extra })); assert.equal(r.status, 503); assert.deepEqual(await r.json(), { error: 'GEOAPIFY_NOT_CONFIGURED' }); }
    assert.equal(calls, 0);
  });
  await check('bounded administrative inputs reject duplicate and unrelated data; canonical city IDs own labels', async () => {
    let calls = 0; const fetcher = async () => { calls++; throw Error('must not fetch'); };
    for (const query of ['', 'city=تهران&city=شیراز', 'city=تهران&categories=pharmacy', 'city=تهران&answers=urgent', 'city=تهران&url=https://evil.test', 'cityId=unknown', 'city=' + 'a'.repeat(101), 'city=https://evil.test']) assert.equal((await m.handleHospitalLookup(request(query), options({ fetcher }))).status, 400, query);
    assert.equal((await m.handleHospitalLookup(request('city=تهران', {}, 'POST'), options({ fetcher }))).status, 405); assert.equal(calls, 0);
    const canonical = m.requestCity(new URL('https://gateway.test/?cityId=ir-tehran&city=شیراز&province=فارس')); assert.equal(canonical.city, 'تهران'); assert.equal(canonical.province, 'تهران');
  });
  await check('exact-origin CORS rejects impostor/null origins before quota and never permits credentials', async () => {
    let limits = 0; const o = options({ allowedOrigins: ['https://review.example', '*'], limit: async () => { limits++; } });
    for (const origin of ['https://gateway.test', 'https://ourgemeniprostudent-png.github.io', 'https://review.example']) { const r = await m.handleHospitalLookup(request(undefined, { origin }), o); assert.equal(r.status, 200); assert.equal(r.headers.get('access-control-allow-origin'), origin); assert.equal(r.headers.has('access-control-allow-credentials'), false); assert.equal(r.headers.get('vary'), 'Origin'); }
    for (const origin of ['https://evil.test', 'https://review.example.evil.test', 'null']) { const r = await m.handleHospitalLookup(request(undefined, { origin }), o); assert.equal(r.status, 403); assert.equal(r.headers.has('access-control-allow-origin'), false); }
    assert.equal(limits, 3);
    const preflight = await m.handleHospitalLookup(request('', { origin: 'https://review.example', 'access-control-request-method': 'GET' }, 'OPTIONS'), o); assert.equal(preflight.status, 204); assert.equal(limits, 3);
  });
  await check('fixed provider requests transmit only administrative query and server key; no patient auth or health payload', async () => {
    const calls = []; let limits = 0;
    const r = await m.handleHospitalLookup(request(undefined, { cookie: 'private-session', authorization: 'private-auth', 'x-csrf-token': 'private-csrf' }), options({ fetcher: provider(calls), limit: async () => { limits++; assert.equal(calls.length, 0); } }));
    assert.equal(r.status, 200); const result = await r.json(); assert.equal(limits, 1); assert.equal(calls.length, 2);
    assert.equal(calls[0].url.pathname, '/v1/geocode/search'); assert.equal(calls[0].url.searchParams.get('text'), 'تهران، ایران'); assert.equal(calls[0].url.searchParams.get('format'), 'json'); assert.equal(calls[0].url.searchParams.get('lang'), 'fa');
    assert.equal(calls[1].url.pathname, '/v2/places'); assert.equal(calls[1].url.searchParams.get('categories'), 'healthcare.hospital,healthcare.clinic_or_praxis'); assert.equal(calls[1].url.searchParams.get('filter'), 'circle:51.4,35.7,10000'); assert.equal(calls[1].url.searchParams.get('limit'), '20');
    for (const { url, init } of calls) { assert.equal(url.origin, 'https://api.geoapify.com'); assert.equal(init.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error'); assert.deepEqual(init.headers, { Accept: 'application/json' }); assert.equal(url.searchParams.get('apiKey'), secret); assert.equal(init.body, undefined); assert.doesNotMatch(url.href, /private-|urgent/); }
    assert.equal(result.provider, 'geoapify'); assert.equal(result.basis, 'city-radius'); assert.equal(result.classification, 'provider-category-unverified'); assert.equal(result.radiusMeters, 10000); assert.deepEqual(result.center, center); assert.ok(Date.parse(result.retrievedAt)); assert.doesNotMatch(JSON.stringify(result), /synthetic-geoapify-key|private-/);
  });
  await check('city identity and administrative prefixes are checked; wrong, missing or ambiguous settlements cannot default', async () => {
    const target = { city: 'صفادشت', province: 'تهران', county: 'ملارد' }, match = geocode({ city: 'صفادشت', county: 'شهرستان ملارد' });
    assert.deepEqual(m.parseGeoapifyGeocode({ results: [match] }, target), center);
    for (const wrong of [{ city: 'صفادشت جدید' }, { state: 'استان البرز' }, { county: 'شهرستان کرج' }, { country_code: 'us' }, { result_type: 'street' }, { lat: 0 }, { lat: '35.7' }, { county: undefined }]) assert.throws(() => m.parseGeoapifyGeocode({ results: [{ ...match, ...wrong }] }, target), e => e.code === 'GEOAPIFY_LOCATION_UNCONFIRMED');
    assert.throws(() => m.parseGeoapifyGeocode({ results: [match, { ...match, lat: 35.9 }] }, target), e => e.code === 'GEOAPIFY_LOCATION_UNCONFIRMED');
    assert.throws(() => m.parseGeoapifyGeocode({ results: [] }, target), e => e.code === 'GEOAPIFY_LOCATION_UNCONFIRMED');
    assert.throws(() => m.parseGeoapifyGeocode({ features: [] }, target), e => e.code === 'GEOAPIFY_UNSUPPORTED_RESPONSE');
    const calls = []; const r = await m.handleHospitalLookup(request(), options({ fetcher: provider(calls, { geocode: { results: [geocode({ city: 'کرج' })] } }) })); assert.equal(r.status, 422); assert.equal(calls.length, 1);
  });
  await check('primary list excludes unnamed, specialty, dental, maternity, addiction and non-care listings without claiming suitability', async () => {
    const clinic = ['healthcare.clinic_or_praxis'], general = [...clinic, 'healthcare.clinic_or_praxis.general'];
    const rows = [feature('بیمارستان دکتر شریعتی'), feature('درمانگاه شبانه روزی آزمون', clinic), feature('مرکز سلامت آزمون', general), feature('', ['healthcare.hospital']), feature('دندانپزشکی نمونه', clinic), feature('مرکز ترک اعتیاد نمونه', clinic), feature('مطب مامایی نمونه', general), feature('مرکز تصویربرداری نمونه', general), feature('دکتر نمونه', general), feature('درمانگاه نمونه', [...clinic, 'healthcare.clinic_or_praxis.cardiology']), feature('درمانگاه دندان نمونه', general), feature('داروخانه بیمارستان نمونه'), feature('ایستگاه بیمارستان نمونه'), feature('ساختمان ناشناس', clinic), feature('کلینیک آزمون', ['healthcare.dentist'])];
    const parsed = m.parseGeoapifyPlaces(places(rows), center, 10000); assert.equal(parsed.facilities.length, 3); assert.equal(parsed.filteredCount, 12); assert.deepEqual(new Set(parsed.facilities.map(r => r.kind)), new Set(['hospital', 'clinic'])); assert.ok(parsed.facilities.every(r => r.classification === 'provider-category-unverified'));
    assert.deepEqual(m.parseGeoapifyPlaces(places([]), center, 10000), { facilities: [], filteredCount: 0 });
    const names = [feature('بیمارستان شیروان'), feature('درمانگاه چشمه', general), feature('بیمارستان زنان و زایمان'), feature('مرکز مامائی', general), feature('درمانگاه روان پزشکی', general), feature('درمانگاه قلب', clinic), feature('علی احمدی', general)];
    const named = m.parseGeoapifyPlaces(places(names), center, 10000); assert.deepEqual(new Set(named.facilities.map(row => row.name)), new Set(['بیمارستان شیروان', 'درمانگاه چشمه'])); assert.equal(named.filteredCount, 5);
    // Public provider records observed during the separate city snapshot review;
    // coordinates/category values below are synthetic, not preserved live payloads.
    const specialtyTitles = ['کلینیک کاشت مو و ابرو پدیده', 'کلینیک تخصصی تغذیه و لاغری دکتر نازیلا درویشی', 'مرکز پزشکی هسته ای دکتر درخشان', 'مرکز فوق تخصصی زنان و نازایی رویانا', 'کلینیک خواب دکتر خامنه پور', 'بیمارستان زنان و زایمان شبیه خوانی', 'کلینیک تخصصی دیابت نور', 'کلینیک تخصصی آزمون', 'درمانگاه آلرژی', 'بیمارستان کودکان', 'درمانگاه اطفال', 'درمانگاه قلب و عروق', 'کلینیک زخم', 'درمانگاه گوارش و کبد'];
    for (const title of specialtyTitles) assert.equal(m.parseGeoapifyPlaces(places([feature(title, title.startsWith('بیمارستان') ? ['healthcare.hospital'] : general)]), center, 10000).facilities.length, 0, title);
    assert.equal(m.parseGeoapifyPlaces(places([feature('بیمارستان فوق تخصصی آزمون')]), center, 10000).facilities.length, 1, 'A general hospital is not excluded solely by a multi-specialty adjective');
    const finalObservedTitles = ['کلینیک جراحی دکتر شیرویه', 'کلینیک تشخیص اختلالات ژنتیکی', 'گروه تشخیصی فرجاد', 'مرکز مدیریت حوادث و فوریت‌های پزشکی استان', 'کلینیک درد دکتر قدرت اخوان اکبری', 'مرکز جراحی محدود امام علی (ع)', 'کلینیک تغدیه و رژیم درمانی رویا اقمشه', 'کلینیک طب سوزنی دکتر شهریار بهنام فر', 'پایگاه انتقال خون'];
    for (const title of finalObservedTitles) for (const categories of [['healthcare.hospital'], general]) assert.equal(m.parseGeoapifyPlaces(places([feature(title, categories)]), center, 10000).facilities.length, 0, 'Provider hospital tag cannot bypass title exclusions: ' + title);
    for (const title of ['مجتمع بیمارستان امام رضا', 'مرکز آموزشی درمانی آزمون', 'مرکز آموزشی و درمانی آزمون', 'Test Hospital']) assert.equal(m.parseGeoapifyPlaces(places([feature(title)]), center, 10000).facilities.length, 1, title);
    assert.equal(m.parseGeoapifyPlaces(places([feature('مرکز خدمات نمونه')]), center, 10000).facilities.length, 0, 'An unexplained hospital tag alone is insufficient');
  });
  await check('radius bounds, numeric coordinates, deduplication and six-card cap are independently enforced', async () => {
    const rows = Array.from({ length: 9 }, (_, i) => feature('بیمارستان آزمون ' + i, ['healthcare.hospital'], { lat: 35.7 + i / 1000 }));
    rows.push(rows[0], feature('بیمارستان دور', ['healthcare.hospital'], { lat: 36.7 }), feature('بیمارستان خراب', ['healthcare.hospital'], { lat: '35.7' }), { ...feature('بیمارستان ناسازگار'), geometry: { type: 'Point', coordinates: [52.5, 36.5] } });
    const parsed = m.parseGeoapifyPlaces(places(rows), center, 10000); assert.equal(parsed.facilities.length, 6); assert.equal(parsed.filteredCount, 3); assert.equal(new Set(parsed.facilities.map(row => row.id)).size, 6);
    assert.ok(parsed.facilities.every(r => m.distanceMeters(r, center) <= 10000));
    for (const payload of [{ features: [] }, { type: 'FeatureCollection', features: {} }, places([{ type: 'Feature', properties: {} }]), places(Array.from({ length: 21 }, () => feature()))]) assert.throws(() => m.parseGeoapifyPlaces(payload, center, 10000), e => e.code === 'GEOAPIFY_UNSUPPORTED_RESPONSE');
  });
  await check('20km expansion is at most one call, only after zero eligible 10km results, without unbounded pagination', async () => {
    const calls = []; const fetcher = async (input, init) => { const url = new URL(input); calls.push({ url, init }); if (url.pathname.endsWith('/search')) return json({ results: [geocode()] }); return json(places(url.searchParams.get('filter').endsWith(',10000') ? [feature('دندانپزشکی', ['healthcare.clinic_or_praxis'])] : [feature('بیمارستان وسیع', ['healthcare.hospital'], { lat: 35.82 })])); };
    const result = await m.searchGeoapifyHospitals(city, options({ fetcher })); assert.equal(calls.length, 3); assert.equal(result.radiusMeters, 20000); assert.equal(result.facilities.length, 1);
    const emptyCalls = []; const empty = await m.searchGeoapifyHospitals(city, options({ fetcher: provider(emptyCalls, { places: places([]) }) })); assert.equal(emptyCalls.length, 3); assert.equal(empty.radiusMeters, 20000); assert.deepEqual(empty.facilities, []);
    let failures = 0; await assert.rejects(m.searchGeoapifyHospitals(city, options({ fetcher: async input => { if (new URL(input).pathname.endsWith('/search')) return json({ results: [geocode()] }); failures++; return new Response('failure', { status: 503 }); } })), e => e.code === 'GEOAPIFY_UNAVAILABLE'); assert.equal(failures, 1);
  });
  await check('upstream errors, raw URLs and key echoes never escape; public fields remain bounded', async () => {
    for (const fetcher of [async () => new Response(secret, { status: 401 }), async () => { throw Error('https://api.geoapify.com/?apiKey=' + secret); }, async () => new Response(secret)]) { const r = await m.handleHospitalLookup(request(), options({ fetcher })); assert.equal(r.status, 502); assert.doesNotMatch(await r.text(), new RegExp(secret)); }
    const row = feature('بیمارستان ' + secret + 'x'.repeat(200), ['healthcare.hospital', 'untrusted-extra-category'], { formatted: secret + 'a'.repeat(600), place_id: secret + 'i'.repeat(220) });
    const result = m.parseGeoapifyPlaces(places([row]), center, 10000, secret); assert.equal(result.facilities.length, 1); const item = result.facilities[0]; assert.equal(item.name.length, 180); assert.equal(item.address.length, 500); assert.equal(item.id.length, 200); assert.deepEqual(item.categories, ['healthcare.hospital']); assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
  });
  await check('response size and latency bounds cover announced bytes, streaming and ignored abort signals', async () => {
    for (const response of [new Response('small', { headers: { 'content-length': '9999' } }), new Response('x'.repeat(120))]) { const r = await m.handleHospitalLookup(request(), options({ maxBytes: 100, fetcher: async () => response })); assert.equal(r.status, 502); assert.deepEqual(await r.json(), { error: 'GEOAPIFY_RESPONSE_TOO_LARGE' }); }
    let signal; const r = await m.handleHospitalLookup(request(), options({ timeoutMs: 20, fetcher: (_url, init) => { signal = init.signal; return new Promise(() => {}); } })); assert.equal(r.status, 504); assert.equal(signal.aborted, true); assert.deepEqual(await r.json(), { error: 'GEOAPIFY_TIMEOUT' });
  });
  await check('atomic quota ordering caps concurrent callers and prevents denied IPs from exhausting shared budget', async () => {
    let now = 100000; const limit = m.createGeoapifyRateLimit(db, secret, { now: () => now, perIpMinute: 2, globalMinute: 100, globalDay: 100 });
    const req = request(undefined, { 'cf-connecting-ip': '192.0.2.88', 'x-forwarded-for': 'do-not-trust' });
    const results = await Promise.allSettled([limit(req), limit(req), limit(req)]); assert.equal(results.filter(r => r.status === 'fulfilled').length, 2); assert.equal(results.filter(r => r.status === 'rejected' && r.reason.code === 'GEOAPIFY_RATE_LIMITED').length, 1);
    const rows = (await db.prepare('SELECT key FROM pilot_rate_limits').all()).results; assert.doesNotMatch(JSON.stringify(rows), /192\.0\.2\.88|do-not-trust|synthetic-geoapify-key/); assert.ok(rows.some(row => /^geoapify:ip:[a-f0-9]{64}$/.test(row.key)));
    let calls = 0; const blocked = await m.handleHospitalLookup(req, options({ limit, fetcher: async () => { calls++; return json({}); } })); assert.equal(blocked.status, 429); assert.equal(blocked.headers.get('retry-after'), '60'); assert.equal(calls, 0);
    for(let i=0;i<5;i++) await assert.rejects(limit(req),e=>e.code==='GEOAPIFY_RATE_LIMITED');
    const globalQuota = await db.prepare("SELECT count FROM pilot_rate_limits WHERE key='geoapify:global:day'").first(); assert.equal(globalQuota.count, 2);
    now += 60001; await limit(req);
    const broken = m.createGeoapifyRateLimit({ prepare() { throw Error('private database detail'); } }, secret); const notReady = await m.handleHospitalLookup(request(), options({ limit: broken })); assert.equal(notReady.status, 503); assert.deepEqual(await notReady.json(), { error: 'GEOAPIFY_NOT_CONFIGURED' });
    await db.prepare("UPDATE pilot_rate_limits SET count=800 WHERE key='geoapify:global:day'").run();
    const defaultBudget = m.createGeoapifyRateLimit(db, secret, { now: () => now });
    await assert.rejects(defaultBudget(request(undefined, { 'cf-connecting-ip': '192.0.2.90' })), e => e.code === 'GEOAPIFY_RATE_LIMITED', 'The 801st lookup must be blocked by the default daily budget');
    await db.prepare("UPDATE pilot_rate_limits SET count=3 WHERE key='geoapify:global:day'").run();
  });
  await check('Cloudflare route and isolated Worker read only geographic bindings and reject patient endpoints', async () => {
    const unavailable = await m.mapsWorker.fetch(request(undefined, { origin: 'https://ourgemeniprostudent-png.github.io' }), {}); assert.equal(unavailable.status, 503); assert.equal(unavailable.headers.get('access-control-allow-origin'), 'https://ourgemeniprostudent-png.github.io');
    assert.equal((await m.mapsWorker.fetch(new Request('https://gateway.test/api/pilot/record'), {})).status, 404);
    const preflight = await m.mapsWorker.fetch(request('', { origin: 'https://ourgemeniprostudent-png.github.io', 'access-control-request-method': 'GET' }, 'OPTIONS'), {}); assert.equal(preflight.status, 204);
    Object.assign(globalThis.__geoapifyBindings, { GEOAPIFY_API_KEY: secret, DB: db, GEOAPIFY_ALLOWED_ORIGINS: 'https://review.example' });
    const oldFetch = globalThis.fetch; globalThis.fetch = provider();
    try { const r = await m.routeGet(request(undefined, { origin: 'https://review.example', 'cf-connecting-ip': '192.0.2.99' })); assert.equal(r.status, 200); assert.equal(r.headers.get('access-control-allow-origin'), 'https://review.example'); assert.doesNotMatch(await r.text(), /synthetic-geoapify-key/); } finally { globalThis.fetch = oldFetch; }
  });
  assert.equal(checks.length, 12, 'Evidence is emitted only after all twelve subtests pass'); assert.deepEqual(await sourceHashes(), sourceFiles);
  await writeFile(reportPath, JSON.stringify({ status: 'passed', completedAt: new Date().toISOString(), individualPassed: checks.length, checks, sourceFiles, sourceSha256: hash(JSON.stringify(sourceFiles)), limitations: 'Synthetic Geoapify responses and ephemeral Miniflare D1 only. This report does not validate live coverage, clinical suitability, emergency capacity, opening hours, public gateway hosting, or publication. Category-based records remain explicitly unverified. Separate real provider checks/snapshots require separate dated evidence.' }, null, 2) + '\n');
});
