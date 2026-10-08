import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { demoBindings } from './bundle.mjs';
import { navigateProduct } from './journey-test-helpers.mjs';

// Measure element geometry and viewport scroll explicitly: the Layout Instability
// API excludes shifts shortly after input, precisely where these regressions occur.
const baseline = process.env.LAYOUT_BASELINE === '1';
test('Layout stability during feedback and interaction', { timeout: 240000 }, async t => {
  await mkdir('.test-build', { recursive: true });
  const release = JSON.parse(await readFile('dist-demo/release.json', 'utf8'));
  await build({ stdin: { contents: "export {createDemoBackend} from './demo/backend';", resolveDir: process.cwd(), loader: 'ts' }, outfile: '.test-build/layout-driver.js', bundle: true, format: 'iife', globalName: 'LayoutDriver', platform: 'browser', loader: { '.sql': 'text' }, define: { 'process.env.NODE_ENV': '"production"' }, plugins: [demoBindings(process.cwd())] });
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://local'), file = path.resolve('dist-demo', '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(path.resolve('dist-demo') + path.sep)) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream' }).end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const origin = `http://127.0.0.1:${server.address().port}`, errors = [], measurements = [], checks = [];
  let page;
  async function start(width) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
    page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin); await page.locator('.p-demo-account').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return context;
  }
  async function driver() {
    await page.addScriptTag({ path: '.test-build/layout-driver.js' });
    await page.evaluate(async () => {
      window.layoutBackend = await window.LayoutDriver.createDemoBackend();
      window.layoutRequest = async (route, body, method) => {
        const actor = await (await window.layoutBackend.fetch('/api/pilot/me')).json();
        const response = await window.layoutBackend.fetch('/api/pilot/' + route, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': actor.csrf || '' }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, data: await response.json() };
      };
    });
  }
  async function requestCode(phone) {
    await page.getByLabel('شماره همراه', { exact: true }).fill(phone);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await page.locator('.p-sample-code b').waitFor();
    return page.locator('.p-sample-code b').innerText();
  }
  async function login(phone) {
    const code = await requestCode(phone);
    await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)').fill(code);
    await page.getByRole('button', { name: 'ورود', exact: true }).click();
    await page.getByRole('button', { name: 'خروج', exact: true }).waitFor(); await driver();
  }
  async function frames() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
  async function bounds(anchors) {
    await frames();
    const view = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    const boxes = {};
    for (const [name, locator] of Object.entries(anchors)) {
      const box = await locator.boundingBox(); assert.ok(box, `Missing geometry anchor ${name}`);
      boxes[name] = { ...box, documentX: box.x + view.x, documentY: box.y + view.y };
    }
    return { view, boxes };
  }
  function stable(label, before, after, { allowScroll = false } = {}) {
    const deltas = {};
    for (const key of Object.keys(before.boxes)) {
      deltas[key] = Object.fromEntries(['x', 'y', 'width', 'height', 'documentX', 'documentY'].map(axis => [axis, +(after.boxes[key][axis] - before.boxes[key][axis]).toFixed(3)]));
    }
    const shift = { label, width: before.view.width, scrollDelta: { x: after.view.x - before.view.x, y: after.view.y - before.view.y }, deltas };
    measurements.push(shift);
    assert.ok(after.view.documentWidth <= after.view.width, `Horizontal overflow: ${label}`);
    if (baseline) return;
    for (const [key, delta] of Object.entries(deltas)) for (const axis of allowScroll ? ['x', 'width', 'height', 'documentX', 'documentY'] : ['x', 'y', 'width', 'height', 'documentX', 'documentY']) assert.ok(Math.abs(delta[axis]) <= 2, `${label}: ${key}.${axis} moved ${delta[axis]}px`);
    if (!allowScroll) { assert.ok(Math.abs(shift.scrollDelta.x) <= 2, `${label}: horizontal scroll changed`); assert.ok(Math.abs(shift.scrollDelta.y) <= 2, `${label}: scroll moved ${shift.scrollDelta.y}px`); }
  }
  async function check(name, run) {
    let failure;
    await t.test(name, async () => { try { await run(); checks.push(name); } catch (error) { failure = error; await page.screenshot({ path: '.test-build/layout-failure.png', fullPage: true }); await writeFile('.test-build/layout-failure.txt', await page.locator('body').innerText()); throw error; } });
    if (failure) throw failure;
  }

  for (const width of [320, 390, 1440]) {
    let context = await start(width);
    await check(`${width}: copy success and failure preserve login controls and scroll`, async () => {
      await requestCode('09000000001');
      await page.locator('.p-code-icon').scrollIntoViewIfNeeded();
      const anchors = { code: page.locator('.p-code-copy-actions'), otp: page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)'), submit: page.getByRole('button', { name: 'ورود', exact: true }) };
      const before = await bounds(anchors);
      await page.locator('.p-code-icon').click(); await page.locator('.is-copied').waitFor();
      stable('copy success', before, await bounds(anchors));
      await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Synthetic clipboard denial'); }; document.execCommand = () => false; });
      await page.locator('.p-code-icon').click(); await page.locator('.p-copy-error').waitFor();
      stable('copy failure', before, await bounds(anchors));
    });
    await context.close();
    context = await start(width); await login('09000000001');
    await page.getByRole('button', { name: 'شروع آشنایی', exact: true }).click();
    await page.locator('.consent-intro').waitFor();
    const consent = page.getByRole('checkbox', { name: 'پذیرش قوانین و بررسی پزشک', exact: true });
    const contact = page.getByRole('checkbox', { name: 'تماس کارشناس برای هماهنگی نوبت', exact: true });
    const anchors = { heading: page.locator('.consent-copy h1'), choices: page.locator('.consent-choices'), next: page.getByRole('button', { name: 'موافقم، ادامه بده', exact: true }) };
    await check(`${width}: consent, pending save, delayed save and saved feedback keep the page in place`, async () => {
      await consent.scrollIntoViewIfNeeded();
      const before = await bounds(anchors);
      await page.evaluate(() => {
        window.layoutOriginalRequest = window.Request;
        window.layoutSaveHeld = false;
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        window.layoutReleaseSave = release;
        window.Request = class extends window.layoutOriginalRequest {
          constructor(...args) {
            super(...args);
            if (this.method === 'PUT' && new URL(this.url).pathname === '/api/pilot/record' && !window.layoutSaveHeld) {
              window.layoutSaveHeld = true;
              const reader = this.body.getReader();
              Object.defineProperty(this, 'body', { value: new ReadableStream({ async pull(controller) { await gate; const part = await reader.read(); if (part.done) controller.close(); else controller.enqueue(part.value); } }) });
            }
          }
        };
      });
      await consent.check();
      stable('consent checked and pending', before, await bounds(anchors));
      await page.waitForFunction(() => window.layoutSaveHeld);
      stable('save in flight', before, await bounds(anchors));
      await page.evaluate(() => { window.layoutReleaseSave(); window.Request = window.layoutOriginalRequest; });
      await page.locator('.ux-save-status.saved').waitFor({ state: 'attached' });
      stable('save completed', before, await bounds(anchors));
      await page.screenshot({ path: `.test-build/layout-consent-${width}.png`, fullPage: true });
    });
    await check(`${width}: failed save, retry and long version-conflict feedback do not displace consent content`, async () => {
      await contact.scrollIntoViewIfNeeded();
      const before = await bounds(anchors);
      await page.evaluate(() => {
        window.layoutTransaction = IDBDatabase.prototype.transaction;
        window.layoutFailWrite = true;
        IDBDatabase.prototype.transaction = function (...args) { if (window.layoutFailWrite && args[1] === 'readwrite') { window.layoutFailWrite = false; throw new DOMException('Synthetic storage outage', 'QuotaExceededError'); } return window.layoutTransaction.apply(this, args); };
      });
      await contact.check(); await page.locator('.ux-save-status.failed').waitFor();
      stable('save failed', before, await bounds(anchors));
      await page.evaluate(() => { IDBDatabase.prototype.transaction = window.layoutTransaction; });
      const retry = page.getByRole('button', { name: 'تلاش دوباره برای ذخیره', exact: true });
      await retry.scrollIntoViewIfNeeded();
      const retryBefore = await bounds(anchors);
      await retry.click(); await page.locator('.ux-save-status.saved').waitFor({ state: 'attached' });
      stable('retry completed', retryBefore, await bounds(anchors));
      const advanced = await page.evaluate(async () => { const r = (await window.layoutRequest('record')).data.record; return window.layoutRequest('record', { version: r.version, consent: true, coordination: true, profile: r.profile, answers: r.answers, step: r.step }, 'PUT'); });
      assert.equal(advanced.status, 200);
      await contact.scrollIntoViewIfNeeded(); const conflictBefore = await bounds(anchors);
      await contact.uncheck(); await page.locator('.ux-save-status.conflict').waitFor();
      stable('long version conflict', conflictBefore, await bounds(anchors));
      if (!baseline) {
        // Compact feedback must remain fully readable, without expanding the form.
        const details = page.getByRole('button', { name: 'مشاهده متن کامل پیام', exact: true });
        await details.scrollIntoViewIfNeeded();
        const detailsBefore = await bounds(anchors);
        await details.click();
        const dialog = page.getByRole('dialog', { name: 'جزئیات پیام', exact: true });
        await dialog.waitFor();
        assert.ok((await dialog.locator('.feedback-dialog-body').innerText()).length > 70, 'The full conflict explanation must remain accessible');
        const box = await dialog.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 1000, 'Feedback details fit the viewport');
        stable('long-message dialog open', detailsBefore, await bounds(anchors));
        await page.screenshot({ path: `.test-build/layout-message-dialog-${width}.png` });
        await page.keyboard.press('Escape');
        stable('long-message dialog closed', detailsBefore, await bounds(anchors));
        assert.equal(await details.evaluate(el => el === document.activeElement), true, 'Closing message details restores keyboard focus');
      }
      await page.screenshot({ path: `.test-build/layout-conflict-${width}.png`, fullPage: true });
    });
    await check(`${width}: opening and closing the terms dialog keeps background geometry and scroll`, async () => {
      const link = page.getByRole('button', { name: 'قوانین و حریم خصوصی', exact: true });
      await link.scrollIntoViewIfNeeded(); const before = await bounds(anchors);
      await link.click(); await page.getByRole('dialog').waitFor();
      stable('terms dialog open', before, await bounds(anchors));
      await page.keyboard.press('Escape');
      stable('terms dialog closed', before, await bounds(anchors));
    });
    await context.close();
    context = await start(width); await login('09000000001');
    async function fixture(step, journey) {
      const result = await page.evaluate(async ({ step, journey }) => {
        const r = (await window.layoutRequest('record')).data.record;
        return window.layoutRequest('record', { version: r.version, consent: true, coordination: false, profile: { firstName: 'عضو', lastName: 'آزمون ثبات صفحه', birthDate: '1990-01-01', city: 'تهران', insurance: 'none', goal: 'خواسته ساختگی برای بررسی ثبات صفحه', journey }, answers: {}, step }, 'PUT');
      }, { step, journey });
      assert.equal(result.status, 200);
      await page.reload(); await page.getByRole('button', { name: 'خروج', exact: true }).waitFor();
      await driver(); await navigateProduct(page, 'تکمیل پرونده');
    }
    await check(`${width}: clinical validation and answering a missing question preserve question grid and progress geometry`, async () => {
      await fixture(2, { version: 2, reasons: ['unsure'], primary: 'unsure', context: {}, cursor: 3, ready: true });
      await page.locator('.gi-safety').waitFor(); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      const gridAnchors = { first: page.locator('.gi-question').first(), last: page.locator('.gi-question').last(), progress: page.locator('.gi-completion'), footer: page.locator('.gi-action-bar') };
      const before = await bounds(gridAnchors);
      await page.getByRole('button', { name: 'ذخیره و مرحله بعد ←', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'برای ادامه، پاسخ این پرسش را انتخاب کنید.' }).first().waitFor();
      stable('clinical validation', before, await bounds(gridAnchors));
      await page.getByRole('radio', { name: 'خیر', exact: true }).first().check();
      stable('first missing answer supplied', before, await bounds(gridAnchors));
    });
    await check(`${width}: completing a clinical group does not wrap or resize its navigation tabs`, async () => {
      await page.locator('.ux-save-status.saved').waitFor({ state: 'attached' });
      await page.waitForTimeout(1200);
      await fixture(3, { version: 2, reasons: ['unsure'], primary: 'unsure', context: {}, cursor: 3, ready: true });
      await page.getByRole('radio', { name: 'برای من مطرح نیست', exact: true }).check();
      await page.getByRole('checkbox', { name: 'هیچ‌کدام', exact: true }).check();
      const last = page.getByRole('checkbox', { name: 'هیچ‌کدام/نمی‌دانم', exact: true });
      await last.scrollIntoViewIfNeeded();
      const navAnchors = { firstTab: page.locator('.gi-group-nav button').first(), lastTab: page.locator('.gi-group-nav button').last(), firstQuestion: page.locator('.gi-question').first(), footer: page.locator('.gi-action-bar') };
      const before = await bounds(navAnchors);
      await last.check();
      stable('clinical group completion tick', before, await bounds(navAnchors));
      if (!baseline) assert.equal(await page.locator('.gi-group-nav button').first().getByLabel('کامل شده').getAttribute('aria-hidden'), 'false');
    });
    await check(`${width}: selecting a primary reason preserves radio order and position`, async () => {
      // Let the preceding answer commit before replacing this synthetic fixture.
      await page.locator('.ux-save-status.saved').waitFor({ state: 'attached' });
      await page.waitForTimeout(1200);
      await fixture(1, { version: 2, reasons: ['condition', 'wellbeing'], primary: 'condition', context: {}, cursor: 0, ready: false });
      const first = page.getByRole('radio', { name: 'پیگیری بیماری مشخص', exact: true }), second = page.getByRole('radio', { name: 'حال بهتر در روزمره', exact: true });
      await second.scrollIntoViewIfNeeded();
      const reasonAnchors = { first, second, heading: page.locator('.j-primary legend') };
      const before = await bounds(reasonAnchors);
      await second.check();
      stable('primary reason selection', before, await bounds(reasonAnchors));
    });
    await context.close();
    context = await start(width); await login('09000000013');
    await check(`${width}: staff success feedback preserves metrics, selected case and action position`, async () => {
      await page.locator('.sw-metrics').getByRole('button', { name: /عضو فعال/ }).click();
      await page.locator('.sw-queue .p-queue-row').first().click();
      const save = page.getByRole('button', { name: 'ثبت پزشک مسئول', exact: true });
      await save.scrollIntoViewIfNeeded();
      const staffAnchors = { metrics: page.locator('.sw-metrics'), heading: page.locator('#member-management h2'), save };
      const before = await bounds(staffAnchors);
      await save.click(); await page.getByText('دسترسی و پزشک مسئول عضو ثبت شد.', { exact: true }).waitFor();
      stable('staff success', before, await bounds(staffAnchors));
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  const report = { version: baseline ? `${release.version} baseline` : release.version, builtAssets: release.assets, measuredAt: new Date().toISOString(), status: baseline ? 'baseline measured; geometry assertions intentionally disabled' : 'passed', individualPassed: checks.length, method: 'Direct viewport/document anchor bounds and scroll offsets, tolerance 2 CSS pixels; includes shifts after user input', limitations: 'Fonts are settled before interaction measurements; this suite does not claim zero CLS during initial asset loading.', pageErrors: errors, checks, measurements };
  await writeFile(baseline ? '.test-build/layout-stability-baseline.json' : '../review-evidence/layout-stability-tests.json', JSON.stringify(report, null, 2));
});
