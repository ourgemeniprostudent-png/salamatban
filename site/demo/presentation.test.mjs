import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { demoBindings } from './bundle.mjs';

test('static presentation works under a shared-hosting subdirectory', { timeout: 120000 }, async (t) => {
  const root = process.cwd();
  await mkdir('.test-build', { recursive: true });
  await build({
    entryPoints: ['demo/backend.ts'], outfile: '.test-build/demo-driver.js',
    bundle: true, format: 'iife', globalName: 'DemoTestDriver', platform: 'browser',
    loader: { '.sql': 'text' }, define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [demoBindings(root)],
  });
  const prefix = '/salamatban-demo/';
  const mime = { '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.html': 'text/html' };
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const relative = pathname.slice(prefix.length) || 'index.html';
    const file = path.resolve(root, 'dist-demo', relative);
    if (!file.startsWith(path.join(root, 'dist-demo') + path.sep)) { response.writeHead(404).end(); return; }
    try {
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);

  const pageErrors = [], unexpectedRequests = [];
  page.on('pageerror', error => { pageErrors.push(error.message); console.error('Page error:', error.message); });
  page.on('request', request => {
    if (!request.url().startsWith(origin + prefix) && !request.url().startsWith('blob:')) unexpectedRequests.push(request.url());
  });
  page.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
  async function driver() {
    await page.addScriptTag({ path: path.join(root, '.test-build/demo-driver.js') });
    await page.evaluate(async () => {
      window.demoDriver = await window.DemoTestDriver.createDemoBackend();
      window.demoRequest = async (route, body, method = body ? 'POST' : 'GET') => {
        const actorResponse = await window.demoDriver.fetch('/api/pilot/me');
        const actor = await actorResponse.json();
        const headers = { 'Content-Type': 'application/json' };
        if (actor.csrf) headers['X-CSRF-Token'] = actor.csrf;
        const response = await window.demoDriver.fetch('/api/pilot/' + route, {
          method, headers, body: method === 'GET' ? undefined : JSON.stringify(body),
        });
        return { status: response.status, data: await response.json() };
      };
    });
  }
  async function login(phone) {
    await page.getByLabel('شماره همراه', { exact: true }).fill(phone);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    const code = await page.locator('.p-sample-code b').innerText();
    await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)', { exact: true }).fill(code);
    await page.getByRole('button', { name: 'ورود', exact: true }).click();
    await page.getByRole('button', { name: 'خروج', exact: true }).waitFor();
  }
  async function logout() {
    await page.getByRole('button', { name: 'خروج', exact: true }).click();
    await page.getByRole('heading', { name: 'ورود به پرونده', exact: true }).waitFor();
  }
  async function check(name, fn) {
    let failure;
    await t.test(name, async () => { try { await fn(); } catch (error) { failure = error; console.error('Failing UI:', await page.locator('body').innerText()); await page.screenshot({path: '.test-build/demo-last-page.png', fullPage: true}); throw error; } });
    if (failure) throw failure;
  }
  let fileId;
  await check('loads without a server API, logs in through the actual UI', async () => {
    await page.goto(origin + prefix);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).waitFor();
    await login('09000000001');
    await page.getByText('پرونده شخصی', { exact: true }).waitFor();
    await driver();
  });
  await check('saves consent/intake and keeps uploaded document in browser storage', async () => {
    const result = await page.evaluate(async () => {
      const r = (await window.demoRequest('record')).data.record;
      const answers = Object.fromEntries(['urgent_chest_pain','urgent_dyspnea','urgent_syncope','urgent_neuro','urgent_bleeding','urgent_infection','urgent_self_harm'].map(key => [key, 'no']));
      Object.assign(answers, { pregnancy_status: 'not_applicable', known_conditions: ['none'], family_history: ['none'], tobacco: 'never', activity: 'some', sleep: 'good' });
      const saved = await window.demoRequest('record', {
        version: r.version, consent: true, coordination: true, answers, step: 5,
        profile: { firstName: 'آزمون', lastName: 'نمایشی', birthDate: '1990-01-01', city: 'شهر ساختگی', goal: 'نمایش روند نرم‌افزار با داده ساختگی', insurance: 'none' },
      }, 'PUT');
      const me = (await window.demoRequest('me')).data;
      const form = new FormData();
      form.append('file', new File(['%PDF-1.4\nsynthetic-demo-test'], 'demo.pdf', { type: 'application/pdf' }));
      const response = await window.demoDriver.fetch('/api/pilot/files', { method: 'POST', headers: { 'X-CSRF-Token': me.csrf }, body: form });
      return { saved, file: { status: response.status, data: await response.json() } };
    });
    assert.equal(result.saved.status, 200, JSON.stringify(result));
    assert.equal(result.file.status, 200, JSON.stringify(result));
    fileId = result.file.data.id;
  });
  await check('reload retains identity, SQL record and downloadable file', async () => {
    await page.reload();
    await page.getByRole('button', { name: 'خروج', exact: true }).waitFor();
    await driver();
    const result = await page.evaluate(async (id) => {
      const record = await window.demoRequest('record');
      const file = await window.demoDriver.fetch('/api/pilot/files/' + id);
      return { name: record.data.record.profile.firstName, files: record.data.files.length, text: await file.text(), status: file.status };
    }, fileId);
    assert.deepEqual(result, { name: 'آزمون', files: 1, text: '%PDF-1.4\nsynthetic-demo-test', status: 200 });
    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(id => window.demoDriver.downloadFile(id, 'demo.pdf'), fileId);
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'demo.pdf');
  });
  await check('simulated payment and submission use the original service rules', async () => {
    const result = await page.evaluate(async () => {
      const order = await window.demoRequest('payment', {});
      const paid = await window.demoRequest('payment/demo', { id: order.data.id, result: 'paid' });
      const record = (await window.demoRequest('record')).data.record;
      const submitted = await window.demoRequest('record/submit', { version: record.version });
      return { order: order.status, paid: paid.status, submitted: submitted.status, state: (await window.demoRequest('record')).data.record.status };
    });
    assert.deepEqual(result, { order: 200, paid: 200, submitted: 200, state: 'submitted' });
  });
  await check('doctor sees the same case and publishes through the UI', async () => {
    await logout(); await login('09000000011');
    await page.locator('.p-queue-row').first().click();
    await page.getByLabel('جمع‌بندی قابل نمایش به کاربر', { exact: true }).fill('این جمع‌بندی صرفاً برای نمایش نرم‌افزار و با اطلاعات کاملاً ساختگی است.');
    await page.getByLabel('عنوان', { exact: true }).fill('اقدام ساختگی برای نمایش');
    await page.getByLabel('دلیل', { exact: true }).fill('بررسی روند پیگیری در نسخه نمایشی');
    await page.getByLabel('موعد (میلادی)', { exact: true }).fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'تأیید و انتشار برای کاربر', exact: true }).click();
    await page.getByText('برنامه با نام شما منتشر شد.', { exact: true }).waitFor();
  });
  await check('member sees plan, records progress and requests coordination', async () => {
    await logout(); await login('09000000001');
    await page.getByRole('button', { name: 'دیدن برنامه', exact: false }).click();
    await page.getByRole('heading', { name: 'برنامه پیگیری شما' }).waitFor();
    const result = await page.evaluate(async () => {
      const plan = (await window.demoRequest('record')).data.plans[0];
      const updated = await window.demoRequest('actions', { planId: plan.id, actionId: plan.actions[0].id, done: true, evidence: 'نمایش' });
      const booking = await window.demoRequest('booking', { title: 'خدمت ساختگی', preferred: 'هفته آینده، شهر ساختگی', consent: true });
      return { updated: updated.status, booking: booking.status };
    });
    assert.deepEqual(result, { updated: 200, booking: 200 });
  });
  await check('coordinator and admin pages load with role restrictions', async () => {
    await logout(); await login('09000000012');
    await page.getByRole('heading', { name: 'درخواست‌های هماهنگی', exact: true }).waitFor();
    await page.getByText('خدمت ساختگی', { exact: false }).first().waitFor();
    const forbidden = await page.evaluate(id => window.demoRequest('files/' + id), fileId);
    assert.equal(forbidden.status, 404);
    await logout(); await login('09000000013');
    await page.getByRole('heading', { name: 'افزودن عضو دعوتی', exact: true }).waitFor();
    await logout();
  });
  await check('320px layout, independent browsers and no backend network calls', async () => {
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const isolated = await browser.newContext();
    const other = await isolated.newPage();
    await other.goto(origin + prefix);
    await other.getByRole('heading', { name: 'ورود به پرونده', exact: true }).waitFor();
    assert.equal(await other.getByRole('button', { name: 'خروج', exact: true }).count(), 0);
    await isolated.close();
    assert.deepEqual(unexpectedRequests, []);
    assert.deepEqual(pageErrors, []);
  });
});
