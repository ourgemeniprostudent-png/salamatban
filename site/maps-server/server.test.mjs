import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { request as httpRequest } from 'node:http';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('portable maps gateway: isolated HTTP, private persistent quotas and trusted proxy', async t => {
  const temp = await mkdtemp(path.join(tmpdir(), 'salamatban-maps-server-'));
  const modulePath = path.join(temp, 'server.mjs');
  await build({ absWorkingDir: root, entryPoints: ['maps-server/server.ts'], outfile: modulePath, bundle: true, platform: 'node', format: 'esm', target: 'node24' });
  const { configFromEnv, createMapsServer, clientAddress } = await import(pathToFileURL(modulePath).href);
  const checks = [], secret = 'synthetic-geoapify-test-key', calls = [];
  const fixtureFetch = async input => {
    const url = new URL(input); calls.push(url);
    assert.equal(url.origin, 'https://api.geoapify.com'); assert.equal(url.searchParams.get('apiKey'), secret);
    return Response.json(url.pathname.includes('/geocode/') ? { results: [{ country_code: 'ir', result_type: 'city', city: 'تهران', state: 'تهران', county: 'تهران', lat: 35.7, lon: 51.4 }] }
      : { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [51.41, 35.71] }, properties: { place_id: 'fixture-hospital', name: 'بیمارستان نمونه', formatted: 'نشانی ساختگی', country_code: 'ir', lat: 35.71, lon: 51.41, categories: ['healthcare.hospital'] } }] });
  };
  const config = { ...configFromEnv({ GEOAPIFY_API_KEY: secret, MAPS_DB_PATH: path.join(temp, 'quotas.sqlite'), MAPS_PUBLIC_ORIGIN: 'https://maps.example' }), provider: { fetcher: fixtureFetch } };
  let active;
  async function start(overrides = {}) {
    active = createMapsServer({ ...config, ...overrides });
    await new Promise(resolve => active.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${active.server.address().port}`;
  }
  const query = '/api/maps/hospitals?cityId=ir-tehran';
  const rawGet = (base, target, headers = {}, body = '') => new Promise((resolve, reject) => {
    const url = new URL(base), req = httpRequest({ hostname: url.hostname, port: url.port, path: target, method: 'GET', headers }, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    }); req.on('error', reject); req.end(body);
  });
  try {
    await t.test('configuration validates origins and never reads secrets into build', () => {
      assert.throws(() => configFromEnv({ MAPS_PUBLIC_ORIGIN: 'https://maps.example/path' }));
      assert.throws(() => configFromEnv({ MAPS_PUBLIC_ORIGIN: 'http://public.example' }));
      assert.throws(() => configFromEnv({ MAPS_TRUST_PROXY: '*' }));
      assert.throws(() => configFromEnv({ MAPS_PORT: 'NaN' }));
      assert.equal(configFromEnv({}).host, '127.0.0.1');
      checks.push('Validated local bind/public origin/proxy settings');
    });
    await t.test('trusted proxy identity cannot be forged by arbitrary forwarded headers', () => {
      assert.equal(clientAddress('::ffff:192.0.2.1', '198.51.100.2', true), '192.0.2.1');
      assert.equal(clientAddress('127.0.0.1', '198.51.100.2', false), '127.0.0.1');
      assert.equal(clientAddress('::1', '198.51.100.2', true), '198.51.100.2');
      assert.equal(clientAddress('::1', '198.51.100.2, 203.0.113.3', true), '::1');
      checks.push('Only explicitly trusted loopback proxy accepts a single valid X-Real-IP');
    });
    await t.test('HTTP boundaries preserve CORS, method validation and provider-only key', async () => {
      const base = await start({ quota: { perIpMinute: 2 } });
      assert.equal((await fetch(base + '/healthz')).status, 200);
      assert.equal((await fetch(base + '/record')).status, 404);
      assert.equal((await fetch(base + query, { method: 'POST' })).status, 405);
      const rejected = await fetch(base + query, { headers: { Origin: 'https://evil.example', Host: 'evil.example' } });
      assert.equal(rejected.status, 403); assert.equal(calls.length, 0);
      const preflight = await fetch(base + query, { method: 'OPTIONS', headers: { Origin: 'https://ourgemeniprostudent-png.github.io', 'Access-Control-Request-Method': 'GET' } });
      assert.equal(preflight.status, 204); assert.equal(calls.length, 0);
      const response = await fetch(base + query, { headers: { Origin: 'https://ourgemeniprostudent-png.github.io', 'CF-Connecting-IP': '203.0.113.2', 'X-Real-IP': '203.0.113.2', 'X-Forwarded-For': '203.0.113.2' } });
      assert.equal(response.status, 200); assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://ourgemeniprostudent-png.github.io');
      const body = await response.text(); assert.ok(!body.includes(secret)); assert.ok(!body.includes('api.geoapify.com')); assert.equal(JSON.parse(body).facilities.length, 1);
      assert.equal(calls.length, 2);
      assert.equal((await fetch(base + query, { headers: { 'CF-Connecting-IP': '203.0.113.3', 'X-Real-IP': '203.0.113.3' } })).status, 200);
      assert.equal((await fetch(base + query, { headers: { 'CF-Connecting-IP': '203.0.113.4' } })).status, 429);
      await active.close(); active = undefined;
      checks.push('CORS ignores forged Host; unknown/method/preflight handled; secrets never in HTTP response; forged IP cannot bypass quota');
    });
    await t.test('per-IP and global counters survive restart without storing raw addresses', async () => {
      const base = await start({ quota: { perIpMinute: 2 } });
      const response = await fetch(base + query); assert.equal(response.status, 429); assert.ok(Number(response.headers.get('Retry-After')) > 0);
      await active.close(); active = undefined;
      const db = new DatabaseSync(config.databasePath);
      const rows = db.prepare('SELECT key,count FROM pilot_rate_limits').all(); db.close();
      assert.equal(rows.find(row => row.key === 'geoapify:global:day').count, 2);
      assert.ok(rows.some(row => /^geoapify:ip:[a-f0-9]{64}$/.test(row.key)));
      assert.ok(!JSON.stringify(rows).includes('127.0.0.1')); assert.ok(!JSON.stringify(rows).includes(secret));
      assert.equal((await stat(config.databasePath)).mode & 0o777, 0o600);
      checks.push('SQLite persists counters across process-server restart; DB contains HMAC identifiers only with mode0600');
    });
    await t.test('raw request targets and chunked GET bodies cannot bypass the geographic boundary', async () => {
      const base = await start({ databasePath: path.join(temp, 'raw-requests.sqlite') }), before = calls.length;
      assert.equal(await rawGet(base, String.raw`/\evil.example/api/maps/hospitals?cityId=ir-tehran`, { Origin: 'https://evil.example' }), 400);
      assert.equal(await rawGet(base, query, { 'Transfer-Encoding': 'chunked' }, 'private-health-test-payload'), 400);
      assert.equal(await rawGet(base, query, { 'Content-Length': '4' }, 'body'), 400);
      assert.equal(calls.length, before);
      await active.close(); active = undefined;
      checks.push('Raw single-backslash authority confusion and body-framed GETs rejected before lookup');
    });
    await t.test('missing provider configuration serves an explicit failure without network', async () => {
      const before = calls.length, base = await start({ apiKey: '', databasePath: path.join(temp, 'unconfigured.sqlite') });
      const response = await fetch(base + query); assert.equal(response.status, 503); assert.equal((await response.json()).error, 'GEOAPIFY_NOT_CONFIGURED'); assert.equal(calls.length, before);
      await active.close(); active = undefined;
      checks.push('Missing key fails closed and does not call provider');
    });
    assert.ok(!(await readFile(modulePath, 'utf8')).includes(secret));
    await mkdir(path.join(root, '.test-build'), { recursive: true });
    await writeFile(path.join(root, '.test-build/maps-server-tests.json'), JSON.stringify({ status: 'passed', completedAt: new Date().toISOString(), individualPassed: checks.length, checks, scope: 'Synthetic provider + local HTTP + persistent local SQLite only; no VPS deployment, TLS reverse-proxy deployment or live account quotas validated.' }, null, 2) + '\n');
  } finally { if (active) await active.close(); await rm(temp, { recursive: true, force: true }); }
});
