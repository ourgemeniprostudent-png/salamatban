import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { demoBindings } from './bundle.mjs';
import { navigateProduct, waitForAsync } from './journey-test-helpers.mjs';
import { configuredMapsFixture, mapsFixtureEndpoint } from './maps-fixture-harness.mjs';

test('Reference-inspired entry and contextual emergency assistance', { timeout: 240000 }, async t => {
  await mkdir('.test-build', { recursive: true });
  const release = JSON.parse(await readFile('dist-demo/release.json', 'utf8'));
  const configured = await configuredMapsFixture(process.cwd(), 'reference-maps-app');
  await build({ stdin: { contents: "export {createDemoBackend} from './demo/backend';", resolveDir: process.cwd(), loader: 'ts' }, outfile: '.test-build/reference-driver.js', bundle: true, format: 'iife', globalName: 'ReferenceDriver', platform: 'browser', loader: { '.sql': 'text' }, define: { 'process.env.NODE_ENV': '"production"' }, plugins: [demoBindings(process.cwd())] });
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://local'), released = url.pathname.startsWith('/release/');
      const file = (released ? url.pathname.slice('/release/'.length) : url.pathname.slice(1)) || 'index.html';
      res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' }).end(await configured.read(file, !released));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const checks = [], measurements = [], pageErrors = [], externalRequests = [];
  let page, context;
  async function start(width = 1440, height = 900, released = false) {
    if (context) await context.close();
    context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
    await context.addInitScript(() => {
      window.referenceGeoCalls = 0;
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition() { window.referenceGeoCalls++; throw new Error('Emergency facility lookup must not request GPS'); }, watchPosition() { window.referenceGeoCalls++; throw new Error('Emergency facility lookup must not watch GPS'); } } });
    });
    page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => { if (!request.url().startsWith(origin) && /^https?:/.test(request.url())) externalRequests.push({ url: request.url(), method: request.method(), body: request.postData() || '' }); });
    // Every external request is synthetic in this suite. Provider fixtures are
    // installed below, so no patient's city or clinical data leaves the browser.
    await page.route(url => /^https?:/.test(url.protocol) && url.origin !== origin, route => externalRoute(route));
    await page.goto(origin + (released ? '/release/' : '/')); await page.locator('.p-demo-account').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  let facilityMode = 'ready';
  const heldLookups = new Map();
  function hospitals(city, province = '', county = '') {
    return { provider: 'geoapify', city, province, county, retrievedAt: new Date().toISOString(), center:{latitude:35.7,longitude:51.4},radiusMeters:10000,filteredCount:0,basis: 'city-radius', classification: 'provider-category-unverified', facilities: [
      { id: `synthetic-${city}`, name: `بیمارستان ساختگی ${city}`, latitude: 35.7, longitude: 51.4, address: `نشانی ساختگی، ${city}، ایران`,kind:'hospital',categories:['healthcare.hospital'], classification: 'provider-category-unverified' },
    ] };
  }
  const externalRoute = async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(mapsFixtureEndpoint).origin || url.pathname !== '/api/maps/hospitals') { await route.abort(); return; }
    const city = url.searchParams.get('city') || ({ tehran: 'تهران', shiraz: 'شیراز', ardabil: 'اردبیل' })[url.searchParams.get('cityId')] || 'شهر انتخابی';
    const payload = hospitals(city, url.searchParams.get('province') || '', url.searchParams.get('county') || '');
    const headers = { 'access-control-allow-origin': '*' };
    if (facilityMode === 'hold' || facilityMode === 'stale' && city === 'شیراز') {
      await new Promise(resolve => heldLookups.set(city, resolve));
      await route.fulfill({ contentType: 'application/json', headers, body: JSON.stringify(payload) }).catch(() => {});
    } else if (facilityMode === 'failed') await route.fulfill({ status: 503, contentType: 'application/json', headers, body: '{"error":"GEOAPIFY_UNAVAILABLE"}' });
    // Playwright supplies a permissive origin when the header is absent. An
    // explicitly wrong origin exercises Chromium's actual CORS rejection.
    else if (facilityMode === 'cors') await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': 'https://unrelated.example' }, body: JSON.stringify(payload) });
    else if (facilityMode === 'not-configured') await route.fulfill({ status: 503, contentType: 'application/json', headers, body: '{"error":"GEOAPIFY_NOT_CONFIGURED"}' });
    else if (facilityMode === 'invalid') await route.fulfill({contentType:'application/json',headers,body:JSON.stringify({...payload,radiusMeters:50000})});
    else if (facilityMode === 'rate-limited') await route.fulfill({status:429,contentType:'application/json',headers:{...headers,'retry-after':'2','access-control-expose-headers':'Retry-After'},body:'{"error":"GEOAPIFY_RATE_LIMITED"}'});
    else if (facilityMode === 'location-unconfirmed') await route.fulfill({status:422,contentType:'application/json',headers,body:'{"error":"GEOAPIFY_LOCATION_UNCONFIRMED"}'});
    else if (facilityMode === 'clinic') await route.fulfill({contentType:'application/json',headers,body:JSON.stringify({...payload,facilities:[{...payload.facilities[0],kind:'clinic',name:'درمانگاه ساختگی عمومی',categories:['healthcare.clinic_or_praxis','healthcare.clinic_or_praxis.general']}]})});
    else await route.fulfill({ contentType: 'application/json', headers, body: JSON.stringify({ ...payload, ...(facilityMode === 'empty' ? { facilities: [] } : {}) }) });
  };
  async function driver() {
    await page.addScriptTag({ path: '.test-build/reference-driver.js' });
    await page.evaluate(async () => {
      window.referenceBackend = await window.ReferenceDriver.createDemoBackend();
      window.referenceRequest = async (route, body, method) => {
        const actor = await (await window.referenceBackend.fetch('/api/pilot/me')).json();
        const response = await window.referenceBackend.fetch('/api/pilot/' + route, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': actor.csrf || '' }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, data: await response.json() };
      };
    });
  }
  async function codeFor(phone) {
    await page.getByLabel('شماره همراه', { exact: true }).fill(phone);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await page.locator('.p-sample-code b').waitFor();
    return page.locator('.p-sample-code b').innerText();
  }
  async function login(phone = '09000000001') {
    const code = await codeFor(phone);
    await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)', { exact: true }).fill(code);
    await page.getByRole('button', { name: 'ورود', exact: true }).click();
    await page.getByRole('button', { name: 'خروج', exact: true }).waitFor(); await driver();
  }
  async function noOverflow() { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow'); }
  async function check(name, run) {
    let failure;
    await t.test(name, async () => {
      try { await run(); checks.push(name); }
      catch (error) { failure = error; await page.screenshot({ path: '.test-build/reference-failure.png', fullPage: true }); await writeFile('.test-build/reference-failure.txt', await page.locator('body').innerText()); throw error; }
    });
    if (failure) throw failure;
  }
  async function geometry(anchors) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const view = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const boxes = {};
    for (const [name, locator] of Object.entries(anchors)) { boxes[name] = await locator.boundingBox(); assert.ok(boxes[name], `Missing geometry anchor: ${name}`); }
    return { view, boxes };
  }
  function stable(label, before, after) {
    const deltas = {};
    for (const key of Object.keys(before.boxes)) {
      deltas[key] = Object.fromEntries(['x', 'y', 'width', 'height'].map(axis => [axis, +(after.boxes[key][axis] - before.boxes[key][axis]).toFixed(3)]));
      for (const [axis, delta] of Object.entries(deltas[key])) assert.ok(Math.abs(delta) <= 2, `${label}: ${key}.${axis} moved ${delta}px`);
    }
    const scrollDelta = { x: after.view.x - before.view.x, y: after.view.y - before.view.y };
    assert.ok(Math.abs(scrollDelta.x) <= 2 && Math.abs(scrollDelta.y) <= 2, `${label}: background scroll moved`);
    measurements.push({ label, deltas, scrollDelta });
  }
  const accounts = [{ phone: '09000000001', role: 'member' }, { phone: '09000000002', role: 'member' }, { phone: '09000000011', role: 'clinician' }, { phone: '09000000012', role: 'coordinator' }, { phone: '09000000013', role: 'admin' }];
  for (const width of [1440, 390, 320]) {
    await start(width);
    await check(`${width}: five named sample accounts preserve phone selection, OTP and both copy controls`, async () => {
      assert.equal(await page.locator('.p-demo-account').count(), 5);
      assert.equal(await page.locator('.login-scene').count(), 1);
      for (const account of accounts) {
        const sample = page.locator('.p-demo-account').filter({ hasText: account.phone });
        assert.ok((await sample.locator('strong').innerText()).trim().length > 1, 'Each sample has a human-readable name');
        await sample.click();
        assert.equal(await page.getByLabel('شماره همراه', { exact: true }).inputValue(), account.phone);
        assert.equal(await sample.getAttribute('aria-pressed'), 'true');
      }
      await page.locator('.p-demo-account').filter({ hasText: accounts[0].phone }).click();
      if (width === 1440) {
        const samples = await page.locator('.p-demo-accounts').boundingBox(), form = await page.locator('.p-login-form').boundingBox(), scene = await page.locator('.login-scene').boundingBox();
        assert.ok(samples.x + samples.width <= form.x + 2 && form.x + form.width <= scene.x + 2, 'Named accounts sit left of the login form, with artwork on the right');
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `.test-build/reference-login-initial-${width}.png`, fullPage: true });
      const code = await codeFor(accounts[0].phone);
      await page.locator('.p-code-value').click();
      await page.locator('.is-copied').waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), code);
      await page.evaluate(() => navigator.clipboard.writeText(''));
      await page.locator('.p-code-icon').click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), code);
      assert.match(await page.locator('.p-copy-tooltip').innerText(), /کپی شد/);
      await noOverflow(); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `.test-build/reference-login-${width}.png`, fullPage: true });
      await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)', { exact: true }).fill(code);
      await page.getByRole('button', { name: 'ورود', exact: true }).click();
      await page.getByRole('button', { name: 'خروج', exact: true }).waitFor(); await driver();
      assert.equal((await page.evaluate(() => window.referenceRequest('me'))).data.user.role, 'member');
      if (width === 1440) for (const account of accounts.slice(1)) {
        await page.getByRole('button', { name: 'خروج', exact: true }).click();
        await page.locator('.p-demo-account').filter({ hasText: account.phone }).click();
        await login(account.phone);
        assert.equal((await page.evaluate(() => window.referenceRequest('me'))).data.user.role, account.role);
      }
    });
  }
  await start(); await login();
  await check('welcome starts directly below its header and spans the available canvas at phone and wide widths', async () => {
    for (const width of [1920, 1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      const header = await page.locator('.p-header').boundingBox(), hero = await page.locator('.arrival').boundingBox();
      assert.ok(hero.y - header.y - header.height <= 32, `Unnecessary welcome header gap: ${hero.y - header.y - header.height}px at ${width}`);
      const canvas = await page.evaluate(() => document.documentElement.getBoundingClientRect().width);
      assert.ok(Math.abs(hero.width - canvas) <= 2, 'Welcome fills the available canvas');
      assert.equal(await page.locator('.p-sidebar').count(), 0);
      await noOverflow(); await page.screenshot({ path: `.test-build/reference-welcome-${width}.png`, fullPage: true });
    }
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  const symptoms = [
    ['urgent_chest_pain', /قفسه.?سینه|قفسهٔ سینه|درد.*سینه/],
    ['urgent_dyspnea', /تنگی نفس/],
    ['urgent_syncope', /بیهوش|سنکوپ/],
    ['urgent_neuro', /ضعف.*طرف|گفتار|عصبی/],
    ['urgent_bleeding', /خونریزی/],
    ['urgent_infection', /تب|عفونت/],
    ['urgent_self_harm', /آسیب.*خود|آسیب.*دیگری/],
  ];
  const completeAnswers = { ...Object.fromEntries(symptoms.map(([id]) => [id, 'no'])), pregnancy_status: 'not_applicable', known_conditions: ['none'], family_history: ['none'], tobacco: 'never', activity: 'some', sleep: 'good' };
  async function fixture(answers = completeAnswers, city = 'تهران', step = 2) {
    const result = await page.evaluate(async ({ answers, city, step }) => {
      const record = (await window.referenceRequest('record')).data.record;
      return window.referenceRequest('record', { version: record.version, consent: true, coordination: false, step, profile: { firstName: 'عضو ساختگی', lastName: 'آزمون محرمانگی', birthDate: '1991-03-21', city, insurance: 'none', goal: 'نشانگر محرمانه آزمون', journey: { version: 2, reasons: ['unsure'], primary: 'unsure', context: {}, cursor: 3, ready: true } }, answers }, 'PUT');
    }, { answers, city, step });
    assert.equal(result.status, 200);
    await page.reload(); await page.getByRole('button', { name: 'خروج', exact: true }).waitFor(); await driver();
    await navigateProduct(page, 'تکمیل پرونده'); await page.locator('.gi-safety').waitFor();
  }
  const assistance = () => page.locator('dialog.urgent-assistance');
  const radio = (id, name) => page.locator(`[data-question="${id}"]`).getByRole('radio', { name, exact: true });
  const scripts = new Set();
  for (const [id, phrase] of symptoms) await check(`${id}: 115 script reflects this answer without inventing a diagnosis, onset or exact location`, async () => {
    await fixture();
    await radio(id, 'بله').check(); await assistance().waitFor();
    assert.equal(await assistance().getByRole('link', { name: 'تماس با اورژانس ۱۱۵', exact: true }).getAttribute('href'), 'tel:115');
    const selected = assistance().locator('.urgent-assistance-selected li');
    assert.equal(await selected.count(), 1);
    assert.equal(await selected.first().getAttribute('data-question-id'), id);
    const script = await assistance().locator('.urgent-assistance-spoken').innerText();
    assert.match(script, phrase); scripts.add(script);
    assert.doesNotMatch(script, /سکته کرده|حمله قلبی دار|تشخیص.*قطعی|امروز ساعت [۰-۹0-9]/);
    assert.equal(await page.evaluate(() => window.referenceGeoCalls), 0);
    await waitForAsync(page, async id => { const r = (await window.referenceRequest('record')).data.record; return r.answers[id] === 'yes' && r.urgent === 1; }, id);
    await assistance().getByRole('button', { name: 'راهنما را خواندم؛ به پاسخ‌ها برمی‌گردم', exact: true }).click();
    const stored = (await page.evaluate(() => window.referenceRequest('record'))).data.record;
    assert.equal(stored.urgent, 1); assert.ok(!stored.urgent_resolved_at);
  });
  assert.equal(scripts.size, symptoms.length, 'Each symptom produces its own spoken script');

  await check('several affirmative answers contribute once each; correcting them leaves a historical review flag without claiming current illness', async () => {
    await fixture({ ...completeAnswers, urgent_dyspnea: 'yes', urgent_bleeding: 'yes', urgent_self_harm: 'yes' });
    await page.getByRole('button', { name: 'راهنمای کمک فوری', exact: true }).click(); await assistance().waitFor();
    assert.equal(await assistance().getAttribute('data-current-symptoms'), 'true');
    const selected = await assistance().locator('.urgent-assistance-selected li').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-question-id')));
    assert.deepEqual(new Set(selected), new Set(['urgent_dyspnea', 'urgent_bleeding', 'urgent_self_harm']));
    assert.equal(selected.length, 3);
    const spoken = await assistance().locator('.urgent-assistance-spoken').innerText();
    for (const phrase of [/تنگی نفس/, /خونریزی/, /آسیب.*خود/]) assert.match(spoken, phrase);
    assert.equal(await assistance().locator('[data-guidance-for="urgent_self_harm"]').count(), 1);
    await page.keyboard.press('Escape');
    await fixture();
    const record = (await page.evaluate(() => window.referenceRequest('record'))).data.record;
    assert.equal(record.urgent, 1); assert.ok(!record.urgent_resolved_at);
    await page.getByRole('button', { name: 'راهنمای کمک فوری', exact: true }).click(); await assistance().waitFor();
    assert.equal(await assistance().getAttribute('data-current-symptoms'), 'false');
    await assistance().getByRole('heading', { name: 'راهنمای هشدار ثبت‌شده', exact: true }).waitFor();
    assert.equal(await assistance().locator('.urgent-assistance-selected li').count(), 0);
    assert.match(await assistance().locator('.urgent-assistance-spoken').innerText(), /اکنون علامتی ندارم/);
    assert.doesNotMatch(await assistance().locator('.urgent-assistance-spoken').innerText(), /تنگی نفس.*دارم|خونریزی.*دارم|آسیب‌زدن.*فکر/);
    await page.keyboard.press('Escape');
  });
  await check('wide urgent guidance uses three columns without unnecessary body scrolling; call and exit stay reachable on phones', async () => {
    await fixture(); await radio('urgent_dyspnea', 'بله').check(); await assistance().waitFor();
    await assistance().locator('.nearby-care-card').waitFor();
    for (const [width, height] of [[1440, 900], [1920, 900], [390, 844], [320, 844]]) {
      await page.setViewportSize({ width, height }); await noOverflow();
      const modal = await assistance().boundingBox();
      assert.ok(modal.x >= 0 && modal.y >= 0 && modal.x + modal.width <= width + 1 && modal.y + modal.height <= height + 1);
      const call = await assistance().getByRole('link', { name: 'تماس با اورژانس ۱۱۵', exact: true }).boundingBox();
      const close = await assistance().getByRole('button', { name: 'راهنما را خواندم؛ به پاسخ‌ها برمی‌گردم', exact: true }).boundingBox();
      assert.ok(call.y >= 0 && call.y + call.height <= height && close.y >= 0 && close.y + close.height <= height);
      if (width >= 1440) {
        assert.ok(modal.width >= 1200, `Wide urgent content should use the screen, found ${modal.width}px`);
        const body = await assistance().locator('.urgent-assistance-body').evaluate(el => ({ height: el.clientHeight, scroll: el.scrollHeight }));
        assert.ok(body.scroll <= body.height + 2, `Default desktop content unnecessarily scrolls: ${JSON.stringify(body)}`);
        const columns = await assistance().locator('.urgent-assistance-column').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { y: r.y, x: r.x, height: node.clientHeight, scroll: node.scrollHeight }; }));
        assert.equal(columns.length, 3); assert.ok(Math.max(...columns.map(c => c.y)) - Math.min(...columns.map(c => c.y)) < 2);
        for (const column of columns) assert.ok(column.scroll <= column.height + 2, `Default desktop column unnecessarily scrolls: ${JSON.stringify(column)}`);
      }
      measurements.push({ label: 'urgent viewport', width, height, modal });
      await page.screenshot({ path: `.test-build/reference-urgent-${width}.png` });
    }
    await page.keyboard.press('Escape'); await page.setViewportSize({ width: 1440, height: 900 });
    await waitForAsync(page, async () => (await window.referenceRequest('record')).data.record.answers.urgent_dyspnea === 'yes');
  });
  await check('city hospitals appear automatically and loading, failure, retry and empty results retain one fixed result panel', async () => {
    facilityMode = 'hold'; heldLookups.clear();
    await fixture(); await radio('urgent_dyspnea', 'بله').check(); await assistance().waitFor();
    await page.waitForFunction(() => document.querySelector('.nearby-care-results')?.getAttribute('aria-busy') === 'true');
    const anchors = { results: assistance().locator('.nearby-care-results'), title: assistance().locator('.nearby-care-header'), retry: assistance().locator('.nearby-care-source button'), call: assistance().locator('.urgent-assistance-call'), footer: assistance().locator('.urgent-assistance-footer') };
    const loading = await geometry(anchors);
    const deadline = Date.now() + 12000;
    while (!heldLookups.has('تهران') && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(heldLookups.has('تهران'), 'Opening the guide with a profile city starts lookup automatically');
    heldLookups.get('تهران')(); facilityMode = 'ready';
    await assistance().getByRole('heading', { name: 'بیمارستان ساختگی تهران', exact: true }).waitFor();
    assert.equal(await assistance().locator('.nearby-care-card').count(), 1, 'The validated gateway result is rendered once');
    stable('automatic facility results', loading, await geometry(anchors));
    assert.equal(await page.evaluate(() => window.referenceGeoCalls), 0);
    assert.ok(externalRequests.every(request => new URL(request.url).origin === new URL(mapsFixtureEndpoint).origin), 'Only the configured application gateway receives lookup requests');
    assert.equal(await assistance().locator('.nearby-care-directions:not([href^="https://nshn.ir/"])').count(),0,'Every destination opens in Neshan');assert.equal(await assistance().getByRole('link',{name:'Geoapify',exact:true}).getAttribute('href'),'https://www.geoapify.com/');assert.equal(await assistance().getByRole('link',{name:'© مشارکت‌کنندگان OpenStreetMap',exact:true}).getAttribute('href'),'https://www.openstreetmap.org/copyright');
    const directions = assistance().getByRole('link', { name: 'بازکردن بیمارستان ساختگی تهران در نشان و مسیریابی', exact: true });
    const destination = new URL(await directions.getAttribute('href'));
    assert.equal(destination.origin, 'https://nshn.ir');
    assert.equal(destination.searchParams.get('lat'), '35.7'); assert.equal(destination.searchParams.get('lng'), '51.4');
    facilityMode = 'failed';
    await assistance().getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
    await assistance().getByText('فهرست مرکزها دریافت نشد.', { exact: true }).waitFor();
    stable('facility network failure', loading, await geometry(anchors));
    assert.equal(await assistance().locator('.nearby-care-card').count(), 0, 'Failed refresh must not leave a stale result under a fresh status');
    assert.equal(await assistance().getByRole('link', { name: 'تماس با اورژانس ۱۱۵', exact: true }).getAttribute('href'), 'tel:115');
    facilityMode = 'ready';
    await assistance().getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
    await assistance().locator('.nearby-care-card').waitFor();
    stable('facility retry succeeds', loading, await geometry(anchors));
    facilityMode = 'cors';
    await assistance().getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
    await assistance().getByText('فهرست مرکزها دریافت نشد.', { exact: true }).waitFor();
    stable('facility CORS failure', loading, await geometry(anchors));
    facilityMode = 'empty';
    await assistance().getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
    await assistance().getByText('در این جست‌وجو مرکزی پیدا نشد.', { exact: true }).waitFor();
    stable('empty facility search', loading, await geometry(anchors));
    assert.match(await assistance().locator('.nearby-care-note').innerText(), /فاصله از شما.*تأیید نشده است/);
    assert.match(await assistance().locator('.nearby-care-date').innerText(),/جست‌وجوی زنده/);assert.match(await assistance().locator('.nearby-care-date').innerText(),/شعاع ۱۰ کیلومتر از مرکز شهر/);
    facilityMode='invalid';await assistance().getByRole('button',{name:'تلاش دوباره',exact:true}).click();await assistance().getByText('اطلاعات دریافت‌شده قابل نمایش نیست.',{exact:true}).waitFor();stable('invalid provider result',loading,await geometry(anchors));
    facilityMode='rate-limited';await assistance().getByRole('button',{name:'تلاش دوباره',exact:true}).click();await assistance().getByText('درخواست‌های جست‌وجو زیاد شده است.',{exact:true}).waitFor();assert.equal(await assistance().getByRole('button',{name:'تلاش دوباره',exact:true}).isDisabled(),true);stable('rate limited provider result',loading,await geometry(anchors));
    await page.waitForFunction(()=>!document.querySelector('.nearby-care-source button')?.disabled);
    facilityMode='location-unconfirmed';await assistance().getByRole('button',{name:'تلاش دوباره',exact:true}).click();await assistance().getByText('موقعیت این شهر تأیید نشد.',{exact:true}).waitFor();stable('unconfirmed provider city',loading,await geometry(anchors));
    facilityMode='clinic';await assistance().getByRole('button',{name:'تلاش دوباره',exact:true}).click();await assistance().getByRole('heading',{name:'درمانگاه ساختگی عمومی',exact:true}).waitFor();assert.equal(await assistance().locator('.nearby-care-kind').innerText(),'درمانگاه / کلینیک · برچسب نقشه');assert.equal(await assistance().locator('.nearby-care-card').count(),1);stable('general clinic provider label',loading,await geometry(anchors));
  });
  await check('changing the current search city cancels stale results and sends no health data or device location', async () => {
    facilityMode = 'stale'; heldLookups.clear();
    await assistance().locator('.urgent-assistance-centers summary').click();
    const city = assistance().getByLabel('شهر محل حضور', { exact: true });
    await city.fill('شیراز');
    await assistance().getByRole('option',{name:'شیراز استان فارس',exact:true}).click();
    await assistance().getByRole('button', { name: 'نمایش مراکز', exact: true }).click();
    const deadline = Date.now() + 12000;
    while (!heldLookups.has('شیراز') && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(heldLookups.has('شیراز'), 'The first city request must be in flight for the stale-response test');
    await city.fill('اردبیل');
    await assistance().getByRole('option',{name:'اردبیل استان اردبیل',exact:true}).click();
    await assistance().getByRole('button', { name: 'نمایش مراکز', exact: true }).click();
    await assistance().getByRole('heading', { name: 'بیمارستان ساختگی اردبیل', exact: true }).waitFor();
    heldLookups.get('شیراز')();
    await page.waitForTimeout(180);
    assert.equal(await assistance().getByRole('heading', { name: 'بیمارستان ساختگی شیراز', exact: true }).count(), 0);
    assert.match(await assistance().locator('.nearby-care-header').innerText(), /اردبیل/);
    assert.equal(await page.evaluate(() => window.referenceGeoCalls), 0);
    for (const request of externalRequests) {
      const url = new URL(request.url);
      assert.equal(url.origin, new URL(mapsFixtureEndpoint).origin); assert.equal(url.pathname, '/api/maps/hospitals');
      assert.equal(request.method, 'GET'); assert.equal(request.body, '');
      assert.ok([...url.searchParams.keys()].every(key => ['cityId', 'city', 'province', 'county'].includes(key)));
      assert.doesNotMatch(decodeURIComponent(url.href), /090000|1991-03-21|عضو ساختگی|آزمون محرمانگی|نشانگر محرمانه|urgent_|تنگی نفس|خونریزی|آسیب/);
      assert.ok(url.searchParams.get('city') || url.searchParams.get('cityId'));
    }
    const stored = (await page.evaluate(() => window.referenceRequest('record'))).data.record;
    assert.equal(stored.profile.city, 'تهران', 'Temporary facility lookup does not overwrite the profile city');
    assert.equal(stored.answers.urgent_dyspnea, 'yes'); assert.equal(stored.urgent, 1); assert.ok(!stored.urgent_resolved_at);
    await page.screenshot({ path: '.test-build/reference-city-results.png' });
    await page.keyboard.press('Escape');
  });
  await check('a missing profile city keeps 115 available and performs no lookup until the current city is entered', async () => {
    facilityMode = 'ready';
    await fixture(completeAnswers, '');
    const requestCount = externalRequests.length;
    await radio('urgent_chest_pain', 'بله').check(); await assistance().waitFor();
    await assistance().getByText('ابتدا شهر محل حضور را مشخص کنید.', { exact: true }).waitFor();
    assert.equal(externalRequests.length, requestCount);
    assert.equal(await assistance().getByRole('link', { name: 'تماس با اورژانس ۱۱۵', exact: true }).getAttribute('href'), 'tel:115');
    assert.equal(await page.evaluate(() => window.referenceGeoCalls), 0);
    await assistance().locator('.urgent-assistance-centers summary').click();
    await assistance().getByLabel('شهر محل حضور', { exact: true }).fill('تهران');
    await assistance().getByRole('option',{name:'تهران استان تهران',exact:true}).click();
    await assistance().getByRole('button', { name: 'نمایش مراکز', exact: true }).click();
    await assistance().getByRole('heading', { name: 'بیمارستان ساختگی تهران', exact: true }).waitFor();
    await page.keyboard.press('Escape');
  });
  await check('a configured gateway reporting absent provider credentials is distinct from empty results and a retryable outage', async () => {
    facilityMode = 'not-configured';
    await fixture();
    const before = externalRequests.length;
    await radio('urgent_dyspnea', 'بله').check(); await assistance().waitFor();
    await assistance().getByText('فهرست مراکز درمانی در این نسخه هنوز متصل نشده است.', { exact: true }).waitFor();
    assert.ok(externalRequests.length > before, 'This case reaches the configured gateway');
    assert.equal(await assistance().getByRole('button', { name: 'تلاش دوباره', exact: true }).count(), 0);
    assert.equal(await assistance().getByText('در این جست‌وجو مرکزی پیدا نشد.', { exact: true }).count(), 0);
    assert.equal(await assistance().locator('.nearby-care-card').count(), 0);
    assert.equal(await assistance().getByRole('link', { name: 'تماس با اورژانس ۱۱۵', exact: true }).getAttribute('href'), 'tel:115');
    await page.keyboard.press('Escape');
  });
  await check('the released demo shows its real dated local snapshot without any API request and separates unsupported cities', async () => {
    assert.equal(release.maps.gatewayConfigured, false);
    assert.equal(release.maps.provider,'geoapify');assert.equal(release.maps.mode,'snapshot');
    const snapshot=JSON.parse(await readFile('dist-demo/data/care-facilities.geoapify.json','utf8')),entry=snapshot.entries.find(item=>item.city==='صفادشت'&&item.province==='تهران'&&item.county==='ملارد');assert.ok(entry?.facilities.length,'Release includes collected Safadasht facilities');
    const before = externalRequests.length;
    await start(1440, 900, true); await login(); await fixture(completeAnswers,'صفادشت');
    const network=[];page.on('request',request=>network.push(request.url()));
    await radio('urgent_dyspnea', 'بله').check(); await assistance().waitFor();
    await assistance().getByRole('heading',{name:entry.facilities[0].name,exact:true}).waitFor();
    assert.equal(externalRequests.length, before, 'The snapshot demo makes no external provider or gateway request');
    assert.equal(network.filter(url=>url.includes('/data/care-facilities.geoapify.json')).length,1);assert.ok(network.every(url=>!url.includes('/api/maps/')&&!url.includes('api.geoapify.com')));
    assert.match(await assistance().locator('.nearby-care-date').innerText(),/فهرست ذخیره‌شدهٔ نمایشی/);assert.equal(await assistance().locator('.nearby-care-date time').getAttribute('datetime'),entry.retrievedAt);
    assert.match(await assistance().locator('.nearby-care-date').innerText(),new RegExp(`شعاع ${new Intl.NumberFormat('fa-IR').format(entry.radiusMeters/1000)} کیلومتر از مرکز شهر`));
    assert.equal(await assistance().getByText('در این جست‌وجو مرکزی پیدا نشد.', { exact: true }).count(), 0);
    assert.equal(await assistance().locator('.nearby-care-card').count(), entry.facilities.length);
    assert.equal(await page.evaluate(() => window.referenceGeoCalls), 0);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 }); await noOverflow();
      const call = assistance().getByRole('link', { name: 'تماس با اورژانس ۱۱۵', exact: true });
      assert.equal(await call.getAttribute('href'), 'tel:115');
      assert.equal(await assistance().locator('.nearby-care-directions:not([href^="https://nshn.ir/"])').count(),0);assert.equal(await assistance().getByRole('link',{name:'© مشارکت‌کنندگان OpenStreetMap',exact:true}).getAttribute('href'),'https://www.openstreetmap.org/copyright');
      await page.screenshot({ path: `.test-build/reference-urgent-released-${width}.png` });
      if(width===390){await assistance().locator('.nearby-care').scrollIntoViewIfNeeded();await page.screenshot({path:'.test-build/reference-urgent-released-facilities-390.png'});}
    }
    await assistance().locator('.urgent-assistance-centers summary').click();await assistance().getByLabel('شهر محل حضور',{exact:true}).fill('شهر خارج از پوشش نسخه');await assistance().getByRole('button',{name:'نمایش مراکز',exact:true}).click();
    await assistance().getByText('برای این شهر فهرست نمایشی تهیه نشده است.',{exact:true}).waitFor();assert.equal(await assistance().locator('.nearby-care-card').count(),0);assert.equal(await assistance().getByText('در این جست‌وجو مرکزی پیدا نشد.',{exact:true}).count(),0);assert.equal(await assistance().getByRole('button',{name:'تلاش دوباره',exact:true}).count(),0);assert.equal(externalRequests.length,before);
    await assistance().getByLabel('شهر محل حضور',{exact:true}).fill('محمودآباد');await assistance().getByRole('button',{name:'نمایش مراکز',exact:true}).click();await assistance().getByText('موقعیت این شهر تأیید نشد.',{exact:true}).waitFor();assert.equal(await assistance().locator('.nearby-care-card').count(),0);assert.equal(externalRequests.length,before);
    await assistance().getByLabel('شهر محل حضور',{exact:true}).focus();await assistance().getByRole('option',{name:'محمودآباد استان مازندران',exact:true}).click();await assistance().getByRole('button',{name:'نمایش مراکز',exact:true}).click();
    await assistance().getByText('برای این شهر فهرست نمایشی تهیه نشده است.',{exact:true}).waitFor();assert.equal(await assistance().getByText('موقعیت این شهر تأیید نشد.',{exact:true}).count(),0,'Selecting the province resolves the duplicate city without inventing coverage');
    await assistance().getByLabel('شهر محل حضور',{exact:true}).fill('صفادشت');await assistance().getByRole('option',{name:'صفادشت استان تهران',exact:true}).click();await assistance().getByRole('button',{name:'نمایش مراکز',exact:true}).click();await assistance().getByRole('heading',{name:entry.facilities[0].name,exact:true}).waitFor();
    assert.equal(network.filter(url=>url.includes('/data/care-facilities.geoapify.json')).length,1,'City recovery reuses the already validated local snapshot');assert.equal(externalRequests.length,before);const stored=(await page.evaluate(()=>window.referenceRequest('record'))).data.record;assert.equal(stored.profile.city,'صفادشت','Temporary city selection never edits the medical profile');
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:900});const cityInput=assistance().getByLabel('شهر محل حضور',{exact:true});await cityInput.scrollIntoViewIfNeeded();await cityInput.focus();
      const anchors={city:cityInput,submit:assistance().getByRole('button',{name:'نمایش مراکز',exact:true}),close:assistance().getByRole('button',{name:'راهنما را خواندم؛ به پاسخ‌ها برمی‌گردم',exact:true})},beforeQuery=await geometry(anchors);
      await cityInput.fill('محمودآباد');await assistance().getByRole('option',{name:'محمودآباد استان مازندران',exact:true}).waitFor();stable(`${width}: city suggestions preserve correction controls`,beforeQuery,await geometry(anchors));await noOverflow();await page.screenshot({path:`.test-build/reference-urgent-released-city-picker-${width}.png`});
      await assistance().getByRole('option',{name:'محمودآباد استان مازندران',exact:true}).click();await anchors.submit.click();await assistance().getByText('برای این شهر فهرست نمایشی تهیه نشده است.',{exact:true}).waitFor();
      await cityInput.fill('صفادشت');await assistance().getByRole('option',{name:'صفادشت استان تهران',exact:true}).click();await anchors.submit.click();await assistance().getByRole('heading',{name:entry.facilities[0].name,exact:true}).waitFor();
    }
  });
  assert.deepEqual(pageErrors, []);
  await writeFile('../review-evidence/reference-experience-tests.json', JSON.stringify({ version: release.version, builtAssets: release.assets, configuredFixture: configured.evidence, completedAt: new Date().toISOString(), status: 'passed', individualPassed: checks.length, pageErrors, checks, measurements, externalRequests, limitations: 'Configured gateway responses are controlled synthetic Geoapify-contract fixtures. Released app uses the real collected local snapshot, tested separately without external lookups; release screenshots show dated stored data, not live availability. No clinical suitability or complete coverage is claimed.' }, null, 2));
});
