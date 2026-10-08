import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('Public city hospital lookup: source parsing, privacy, cache and request lifecycle', { timeout: 30000 }, async t => {
  await mkdir('.test-build', { recursive: true });
  const output = path.resolve('.test-build/facility-lookup.js');
  await build({ entryPoints: ['app/pilot/facility-lookup.ts'], outfile: output, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
  const checks = [], originalFetch = globalThis.fetch;
  const fixture = { category: 'amenity', type: 'hospital', name: 'بیمارستان نمونه آزمون', display_name: 'خیابان نمونه، تهران، ایران', lat: '35.71', lon: '51.42', osm_type: 'way', osm_id: 42, extratags: { 'contact:phone': '+۹۸ ۲۱ ۱۲۳۴۵۶۷۸' } };
  const response = (items = [fixture]) => new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } });
  let serial = 0;
  const fresh = () => import(`${pathToFileURL(output).href}?case=${++serial}`);
  async function check(name, fn) { await t.test(name, async () => { try { await fn(); checks.push(name); } finally { globalThis.fetch = originalFetch; } }); }
  await check('query contains only selected administrative location and fixed public-map parameters', async () => {
    const m = await fresh(), url = new URL(m.facilitySearchUrl({ city: 'تهران', province: 'تهران', county: 'تهران', cityId: 'internal-id-not-exported' }));
    assert.equal(url.searchParams.get('q'), '[hospital] تهران، ایران');
    assert.equal(url.hostname, 'nominatim.openstreetmap.org');
    assert.deepEqual([...url.searchParams.keys()].sort(), ['q', 'countrycodes', 'format', 'limit', 'addressdetails', 'extratags', 'namedetails', 'accept-language'].sort());
    assert.ok(!url.href.includes('internal-id'));
    assert.match(new URL(m.facilitySearchUrl({ city: 'گلوگاه', county: 'بابل', province: 'مازندران' })).searchParams.get('q'), /گلوگاه، بابل، مازندران/);
    let calls = 0; globalThis.fetch = async () => { calls++; return response(); };
    await assert.rejects(m.lookupFacilities({ city: '' }), e => e.code === 'location');
    assert.equal(calls, 0);
  });
  await check('only named hospital-tagged records with valid coordinates and explicit safe phone tags become cards', async () => {
    const m = await fresh();
    const result = m.parseFacilities([fixture, fixture, { ...fixture, osm_id: 43, category: 'highway', type: 'bus_stop' }, { ...fixture, osm_id: 44, lat: 'NaN' }, { ...fixture, osm_id: 45, lon: '181' }, { ...fixture, osm_id: 46, name: '' }, { ...fixture, osm_id: 47, extratags: { phone: 'javascript:alert(1)' } }, { ...fixture, osm_id: 48, lat: null }, { ...fixture, osm_id: 49, lon: '' }, { ...fixture, osm_id: 50, address: { country_code: 'xx' } }]);
    assert.equal(result.length, 2);
    assert.equal(result[0].phone, '+982112345678');
    assert.equal(result[0].sourceUrl, 'https://www.openstreetmap.org/way/42');
    assert.equal(result[1].phone, undefined);
    assert.throws(() => m.parseFacilities({ message: 'bad response' }), e => e.code === 'invalid');
  });
  await check('simultaneous same-city callers share a request, and one cancellation does not cancel another consumer', async () => {
    const m = await fresh(), a = new AbortController(); let count = 0, resolveFetch, requestSignal;
    globalThis.fetch = (_url, options) => { count++; requestSignal = options.signal; return new Promise(resolve => { resolveFetch = resolve; }); };
    const first = m.lookupFacilities({ city: 'تهران' }, { signal: a.signal });
    const rejected = assert.rejects(first, e => e.name === 'AbortError');
    const second = m.lookupFacilities({ city: 'تهران' });
    while (!resolveFetch) await new Promise(resolve => setTimeout(resolve, 5));
    a.abort(); await rejected; assert.equal(requestSignal.aborted, false);
    resolveFetch(response()); const result = await second;
    assert.equal(result.facilities.length, 1); assert.equal(count, 1);
    assert.deepEqual(await m.lookupFacilities({ city: 'تهران' }), result); assert.equal(count, 1);
  });
  await check('last-consumer cancellation aborts an obsolete city request and it cannot populate the cache', async () => {
    const m = await fresh(), controller = new AbortController(); let resolveFetch, requestSignal, count = 0;
    globalThis.fetch = (_url, options) => { count++; requestSignal = options.signal; return new Promise(resolve => { resolveFetch = resolve; }); };
    const old = m.lookupFacilities({ city: 'تهران' }, { signal: controller.signal });
    const rejected = assert.rejects(old, e => e.name === 'AbortError');
    while (!resolveFetch) await new Promise(resolve => setTimeout(resolve, 5));
    controller.abort(); await rejected; assert.equal(requestSignal.aborted, true); resolveFetch(response());
    await new Promise(resolve => setTimeout(resolve, 10));
    globalThis.fetch = async () => { count++; return response(); };
    await m.lookupFacilities({ city: 'تهران' }); assert.equal(count, 2);
  });
  await check('different-city requests and explicit retries are paced at least 1.1 seconds apart', async () => {
    const m = await fresh(), starts = [];
    globalThis.fetch = async () => { starts.push(Date.now()); return response(); };
    await Promise.all([m.lookupFacilities({ city: 'تهران' }), m.lookupFacilities({ city: 'شیراز' })]);
    assert.ok(starts[1] - starts[0] >= 1090);
    await m.lookupFacilities({ city: 'تهران' }, { refresh: true });
    assert.equal(starts.length, 3); assert.ok(starts[2] - starts[1] >= 1090);
  });
  await check('network failure is retryable and an empty provider result remains honestly empty', async () => {
    const m = await fresh(); let count = 0;
    globalThis.fetch = async () => { count++; if (count === 1) return new Response('', { status: 503 }); return response([]); };
    await assert.rejects(m.lookupFacilities({ city: 'تهران' }), e => e.code === 'unavailable');
    const result = await m.lookupFacilities({ city: 'تهران' });
    assert.equal(count, 2); assert.deepEqual(result.facilities, []); assert.ok(Date.parse(result.retrievedAt));
  });
  await check('a hung provider request is aborted after the timeout and reports a recoverable failure', async () => {
    const m = await fresh(); let aborted = false;
    globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('aborted', 'AbortError')); }, { once: true }));
    await assert.rejects(m.lookupFacilities({ city: 'تهران' }), e => e.code === 'timeout'); assert.equal(aborted, true);
  });
  await writeFile('.test-build/facility-lookup-tests.json', JSON.stringify({ version: '2.3', completedAt: new Date().toISOString(), individualPassed: checks.length, failed: 7 - checks.length, checks, scope: 'Source parsing and lifecycle with synthetic fetch responses; actual provider evidence is separate.' }, null, 2));
});
