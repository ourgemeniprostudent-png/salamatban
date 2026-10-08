import { navigateProduct, completeDiscovery, profileField, waitForAsync } from './journey-test-helpers.mjs';
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
  const screenshots = path.join(root, '.test-build', 'visual-review');
  await mkdir(screenshots, { recursive: true });
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
    const relative = pathname.slice(prefix.length) + (pathname.endsWith('/') ? 'index.html' : '');
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
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);

  const pageErrors = [], unexpectedRequests = [];
  page.on('pageerror', error => { pageErrors.push(error.message); console.error('Page error:', error.message); });
  page.on('request', request => {
    if (!request.url().startsWith(origin + prefix) && !request.url().startsWith('blob:')) unexpectedRequests.push(request.url());
  });
  page.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
  page.on('response', response => { if (response.status() >= 400) console.error('HTTP asset failure:', response.status(), response.url()); });
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
  async function selectValue(control, value) {
    if (await control.evaluate(el => el.tagName === 'SELECT')) return control.selectOption(value);
    await control.click();
    const dialog = page.locator('.cs-dialog[open]');
    const search = dialog.getByRole('searchbox');
    if (await search.count()) await search.fill(value);
    await dialog.locator(`[role="option"][data-value="${value}"]`).click();
  }
  async function logout() {
    await page.getByRole('button', { name: 'خروج', exact: true }).click();
    await page.getByRole('heading', { name: 'ورود به پرونده', exact: true }).waitFor();
  }
  async function navigate(name) {return navigateProduct(page,name);}
  async function screenshot(name) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(screenshots, name), fullPage: true });
  }
  async function assertLayout(target = page) {
    const dimensions = await target.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(dimensions.content <= dimensions.viewport, `Horizontal overflow: ${JSON.stringify(dimensions)}`);
  }
  async function assertPeyda(target, selector = 'body') {
    const font = await target.locator(selector).evaluate(async element => {
      const faces = await document.fonts.load('400 16px Peyda', 'سلامت‌بان ۱۲۳');
      return { family: getComputedStyle(element).fontFamily, faces: faces.map(face => ({ family: face.family, status: face.status })) };
    });
    assert.match(font.family, /Peyda/);
    assert.ok(font.faces.some(face => face.family === 'Peyda' && face.status === 'loaded'), JSON.stringify(font));
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
    await assertPeyda(page, '.pilot');
    await page.waitForFunction(() => { const photo = document.querySelector('.login-scene-photo'); return photo?.complete && photo.naturalWidth > 0; });
    assert.doesNotMatch(await page.locator('body').innerText(), /همیار[\s‌]*سلامت/);
    await assertLayout();
    await screenshot('login-1440.png');
    await login('09000000001');
    await page.getByRole('button',{name:'شروع آشنایی',exact:true}).waitFor();assert.equal(await page.locator('.p-sidebar').count(),0);
    await driver();
  });
  await check('Persian birth-date picker supports mobile selection, invalid input and ISO persistence', async () => {
    await navigate('تکمیل پرونده');
    await page.getByRole('checkbox', { name: 'پذیرش قوانین و بررسی پزشک', exact: true }).check();
    await page.getByRole('button', { name: 'موافقم، ادامه بده', exact: true }).click();
    await completeDiscovery(page);await profileField(page,'birthDate');
    const birth = page.getByLabel('تاریخ تولد (شمسی)', { exact: true });
    await birth.waitFor();
    await profileField(page,'name');await page.getByLabel('نام', { exact: true }).fill('آزمون');
    await page.getByLabel('نام خانوادگی', { exact: true }).fill('تقویم');
    await profileField(page,'city');await page.getByLabel('شهر', { exact: true }).fill('شهر ساختگی');
    await profileField(page,'insurance');await selectValue(page.getByRole('combobox', { name: /^بیمه/ }), 'none');
    await profileField(page,'goal');await page.getByLabel('هدف شما از همراهی', { exact: true }).fill('بررسی تاریخ شمسی با اطلاعات ساختگی');
    await profileField(page,'birthDate');await birth.fill('۱۳۷۰/۰۱/۰۱');
    await birth.fill('۱۴۰۰/۱۲/۳۰');
    await page.getByRole('button', { name: 'ذخیره و مرحله بعد ←', exact: true }).click();
    // The date picker owns one reserved error slot. Its specific parse error
    // takes precedence over the former duplicate parent validation message.
    await page.locator('.p-date-error').filter({ hasText: /^تاریخ شمسی معتبر وارد کنید؛ مانند ۱۳۷۰\/۰۱\/۰۱\.$/ }).waitFor();
    assert.equal(await birth.getAttribute('aria-invalid'), 'true');
    assert.equal(await birth.inputValue(), '۱۴۰۰/۱۲/۳۰', 'The invalid text remains editable');
    assert.equal(await page.getByRole('heading', { name: 'علائم مهم', exact: true }).count(), 0, 'An impossible date must not advance the intake');
    await waitForAsync(page, async () => !(await window.demoRequest('record')).data.record.profile.birthDate);
    const invalidSave = await page.evaluate(async () => (await window.demoRequest('record')).data.record.profile.birthDate);
    assert.ok(!invalidSave, 'Editing a valid date to an impossible date must not silently save the old value');
    assert.equal(await page.locator('input[type="date"]').count(), 0);
    await page.setViewportSize({ width: 320, height: 740 });
    const opener = page.getByRole('button', { name: 'باز کردن تقویم تاریخ تولد (شمسی)', exact: true });
    await opener.click();
    const calendar = page.getByRole('dialog', { name: 'تقویم تاریخ تولد (شمسی)', exact: true });
    const yearControl = calendar.getByLabel('سال', { exact: true });
    const originalYear = await yearControl.innerText();
    await yearControl.click();
    const optionsDialog = page.locator('.cs-dialog[open]');
    const optionsBox = await optionsDialog.boundingBox();
    assert.ok(optionsBox.x >= 0 && optionsBox.x + optionsBox.width <= 320 && optionsBox.y >= 0 && optionsBox.y + optionsBox.height <= 740);
    assert.ok((await optionsDialog.getByRole('listbox').boundingBox()).height <= 265, 'Long year lists must scroll inside a bounded surface');
    await optionsDialog.getByRole('searchbox').fill('۱۳۷۰');
    assert.equal(await optionsDialog.getByRole('option').count(), 1);
    await page.screenshot({ path: path.join(screenshots, 'compact-year-select-320.png') });
    await page.keyboard.press('Escape');
    assert.equal(await calendar.isVisible(), true, 'Escape closes the choices, not the parent calendar');
    assert.equal(await yearControl.innerText(), originalYear, 'Cancelling must preserve the selected year');
    assert.equal(await yearControl.evaluate(el => el === document.activeElement), true);
    await selectValue(calendar.getByLabel('سال', { exact: true }), '1370');
    await selectValue(calendar.getByLabel('ماه', { exact: true }), '1');
    await assertLayout();
    assert.match(await calendar.innerText(), /فروردین/);
    assert.doesNotMatch(await calendar.innerText(), /Select date|October|Cancel/);
    const box = await calendar.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 320 && box.y >= 0 && box.y + box.height <= 740, JSON.stringify(box));
    await page.screenshot({ path: path.join(screenshots, 'persian-calendar-320.png') });
    await page.keyboard.press('Escape');
    assert.equal(await calendar.isVisible(), false);
    assert.equal(await opener.evaluate(element => element === document.activeElement), true);
    await opener.click();
    await selectValue(calendar.getByLabel('سال', { exact: true }), '1404');
    await selectValue(calendar.getByLabel('ماه', { exact: true }), '1');
    await calendar.getByRole('button', { name: '۱ فروردین ۱۴۰۴', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await calendar.getByRole('button', { name: '۳۰ اسفند ۱۴۰۳', exact: true }).evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await calendar.getByRole('button', { name: '۱ فروردین ۱۴۰۴', exact: true }).evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    assert.equal(await birth.inputValue(), '۱۴۰۳/۱۲/۳۰');
    await page.getByRole('button', { name: 'ذخیره و مرحله بعد ←', exact: true }).click();
    await page.getByText('سن قابل پذیرش از ۱۸ تا ۱۱۹ سال است.', { exact: false }).waitFor();
    await opener.click();
    await selectValue(calendar.getByLabel('سال', { exact: true }), '1370');
    await selectValue(calendar.getByLabel('ماه', { exact: true }), '1');
    await calendar.getByRole('button', { name: '۱ فروردین ۱۳۷۰', exact: true }).click();
    assert.equal(await birth.inputValue(), '۱۳۷۰/۰۱/۰۱');
    await page.getByRole('button', { name: 'ذخیره و مرحله بعد ←', exact: true }).click();
    await page.getByRole('heading', { name: 'علائم مهم', exact: true }).waitFor();
    const storedDate = await page.evaluate(async () => (await window.demoRequest('record')).data.record.profile.birthDate);
    assert.equal(storedDate, '1991-03-21');
    await page.reload();
    await page.getByRole('button', { name: 'خروج', exact: true }).waitFor();
    await navigate('تکمیل پرونده');
    await page.getByRole('button', { name: 'قبلی', exact: true }).click();
    await profileField(page,'birthDate');await birth.waitFor();
    assert.equal(await birth.inputValue(), '۱۳۷۰/۰۱/۰۱');
    await page.setViewportSize({ width: 1440, height: 1000 });
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
  await check('new member views show persisted health/profile data and support actual document upload/download', async () => {
    await navigate('تصویر سلامت');
    await page.getByRole('heading', { name: 'جمع‌بندی پزشک', exact: true }).waitFor();
    assert.equal(await page.locator('.mv-goal-card p').innerText(), 'نمایش روند نرم‌افزار با داده ساختگی');
    assert.ok((await page.locator('.mv-answer-list').allTextContents()).join(' ').includes('خیر'));
    await navigate('حساب و حریم خصوصی');
    await page.getByRole('heading', { name: 'مشخصات فردی', exact: true }).waitFor();
    assert.equal(await page.locator('.mv-profile-card h2').innerText(), 'آزمون نمایشی');
    assert.equal(await page.locator('.mv-profile-details > div').filter({ has: page.getByText('شهر', { exact: true }) }).locator('dd').innerText(), 'شهر ساختگی');
    await navigate('مدارک پزشکی');
    await page.getByRole('heading', { name: 'مدارک من', exact: true }).waitFor();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.mv-files').getByRole('link', { name: /^demo\.pdf/ }).click();
    assert.equal((await downloadPromise).suggestedFilename(), 'demo.pdf');
    await page.getByLabel('انتخاب مدرک', { exact: true }).setInputFiles({ name: 'second-demo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nsecond-synthetic-report') });
    await page.getByText('مدرک ذخیره شد.', { exact: true }).waitFor();
    await page.locator('.mv-files').getByRole('link', { name: /^second-demo\.pdf/ }).waitFor();
    assert.equal(await page.locator('.mv-files .p-file').count(), 2);
    await page.reload();
    await page.getByRole('button', { name: 'خروج', exact: true }).waitFor();
    await navigate('مدارک پزشکی');
    await page.locator('.mv-files').getByRole('link', { name: /^second-demo\.pdf/ }).waitFor();
    assert.equal(await page.locator('.mv-files .p-file').count(), 2);
    await driver();
    await screenshot('documents-1440.png');
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
    await page.getByLabel('جست‌وجوی پرونده', {exact:true}).fill('نامی که وجود ندارد');
    await page.getByText('پرونده‌ای با این جست‌وجو پیدا نشد.', {exact:true}).waitFor();
    assert.match(await page.locator('.ux-filter-summary').innerText(), /۰ نتیجه/);
    await page.getByRole('button', {name:'پاک‌کردن فیلترها',exact:true}).click();
    assert.equal(await page.getByLabel('جست‌وجوی پرونده',{exact:true}).inputValue(),'');
    await page.locator('.p-queue-row').first().click();
    await page.getByRole('button',{name:'ثبت نتیجه بررسی',exact:false}).click();
    await page.getByLabel('جمع‌بندی قابل نمایش به کاربر', { exact: true }).fill('این جمع‌بندی صرفاً برای نمایش نرم‌افزار و با اطلاعات کاملاً ساختگی است.');
    await page.getByLabel('عنوان', { exact: true }).fill('اقدام ساختگی برای نمایش');
    await page.getByLabel('دلیل', { exact: true }).fill('بررسی روند پیگیری در نسخه نمایشی');
    const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).formatToParts(new Date(due + 'T12:00:00Z')).map(part => [part.type, part.value]));
    const dueInput = page.getByLabel('موعد (شمسی)', { exact: true });
    await dueInput.fill('۱۳۷۰/۰۱/۰۱');
    assert.equal(await dueInput.getAttribute('aria-invalid'), 'true', 'Past action dates are rejected');
    await dueInput.fill('۱۴۹۹/۰۱/۰۱');
    assert.equal(await dueInput.getAttribute('aria-invalid'), 'true', 'Action dates beyond the server window are rejected');
    await dueInput.fill(`${parts.year}/${parts.month}/${parts.day}`);
    assert.equal(await dueInput.getAttribute('aria-invalid'), 'false');
    await page.getByRole('button', { name: 'تأیید و انتشار برای کاربر', exact: true }).click();
    await page.getByText('برنامه با نام شما منتشر شد.', { exact: true }).waitFor();
    const publishedDue = await page.evaluate(async () => {
      const queue = (await window.demoRequest('staff/queue')).data;
      const record = (await window.demoRequest('record?user=' + queue.members[0].id)).data;
      return record.plans[0].actions[0].due;
    });
    assert.equal(publishedDue, due, 'Jalali action date must reach the API as the same Gregorian ISO day');
    await assertLayout();
    await screenshot('doctor-selected-case-1440.png');
  });
  await check('member sees plan, records progress and requests coordination', async () => {
    await logout(); await login('09000000001');
    await page.getByRole('button', { name: 'دیدن برنامه و قدم‌های من', exact: true }).click();
    await page.getByRole('heading', { name: 'برنامه پیگیری شما' }).waitFor();
    await page.getByRole('heading', { name: 'نقشه مسیر پیگیری', exact: true }).waitFor();
    assert.equal(await page.locator('.mv-timeline-action .care-action-check strong').innerText(), 'اقدام ساختگی برای نمایش');
    const result = await page.evaluate(async () => {
      const plan = (await window.demoRequest('record')).data.plans[0];
      const updated = await window.demoRequest('actions', { planId: plan.id, actionId: plan.actions[0].id, done: true, evidence: 'نمایش' });
      const booking = await window.demoRequest('booking', { title: 'خدمت ساختگی', preferred: 'هفته آینده، شهر ساختگی', consent: true });
      return { updated: updated.status, booking: booking.status };
    });
    assert.deepEqual(result, { updated: 200, booking: 200 });
    await page.getByRole('button', { name: 'تازه‌سازی', exact: true }).click();
    await page.getByText('۱ از ۱ اقدام انجام شده', { exact: true }).waitFor();
    await navigate('نوبت‌ها و هماهنگی');
    await page.getByRole('heading', { name: 'خدمت ساختگی', exact: true }).waitFor();
    await navigate('تصویر سلامت');
    await page.getByText('این جمع‌بندی صرفاً برای نمایش نرم‌افزار و با اطلاعات کاملاً ساختگی است.', { exact: true }).waitFor();
    await screenshot('health-1440.png');
  });
  await check('coordinator confirms the requested appointment through the UI and member sees the confirmed details', async () => {
    await logout(); await login('09000000012');
    await page.getByRole('heading', { name: 'درخواست‌های هماهنگی', exact: true }).waitFor();
    await page.getByText('خدمت ساختگی', { exact: false }).first().waitFor();
    const forbidden = await page.evaluate(id => window.demoRequest('files/' + id), fileId);
    assert.equal(forbidden.status, 404);
    await page.locator('.sw-queue .p-queue-row').filter({hasText:'خدمت ساختگی'}).click();
    const task = page.locator('.p-task').filter({ has: page.getByRole('heading', { name: /خدمت ساختگی/ }) });
    await task.getByRole('button', { name: 'ثبت تماس و شروع هماهنگی', exact: true }).click();
    await task.getByLabel('مرکز', { exact: true }).fill('مرکز ساختگی برای نمایش');
    await task.getByLabel('زمان نوبت', { exact: true }).fill('۱۴۰۵/۰۸/۱۰ ساعت ۱۰:۰۰');
    await task.getByLabel('کد تأیید', { exact: true }).fill('DEMO-CONFIRMED-001');
    await task.getByLabel('یادداشت قابل نمایش', { exact: true }).fill('هماهنگی ساختگی برای بررسی مسیر نرم‌افزار');
    await task.getByRole('checkbox', { name: 'رضایت انتقال اطلاعات لازم به همین مرکز از کاربر گرفته شد.', exact: true }).check();
    await task.getByRole('button', { name: 'تأیید نوبت', exact: true }).click();
    await task.locator('.p-tag.confirmed').waitFor();
    await selectValue(page.getByRole('combobox', { name: /^وضعیت هماهنگی/ }), 'confirmed');
    await page.locator('.sw-queue .p-queue-row').filter({hasText:'خدمت ساختگی'}).click();
    await task.waitFor();
    await assertLayout();
    await screenshot('coordinator-1440.png');
    await logout(); await login('09000000001');
    await navigate('نوبت‌ها و هماهنگی');
    const memberTask = page.locator('.p-task').filter({ has: page.getByRole('heading', { name: 'خدمت ساختگی', exact: true }) });
    await memberTask.locator('.p-tag.confirmed').waitFor();
    assert.match(await memberTask.innerText(), /مرکز ساختگی برای نمایش/);
    assert.match(await memberTask.innerText(), /۱۴۰۵\/۰۸\/۱۰ ساعت ۱۰:۰۰/);
    assert.match(await memberTask.innerText(), /DEMO-CONFIRMED-001/);
    await screenshot('appointments-1440.png');
  });
  await check('320/360/1440px layout, mobile navigation and independent browser storage', async () => {
    await page.setViewportSize({ width: 320, height: 740 });
    await assertLayout();
    await navigate('خانه سلامت');
    await page.getByRole('button', { name: 'دیدن برنامه و قدم‌های من', exact: true }).waitFor();
    await assertLayout();
    assert.equal(await page.locator('.p-sidebar').count(),0);
    await navigate('تصویر سلامت');
    await page.getByRole('heading', { name: 'تصویر سلامت', exact: true }).waitFor();
    await assertLayout();
    await screenshot('health-320.png');
    await navigate('خانه سلامت');
    await page.getByRole('button', { name: 'دیدن برنامه و قدم‌های من', exact: true }).waitFor();
    await screenshot('home-320.png');
    for (const width of [360, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await assertLayout();
      for (const view of ['مدارک پزشکی', 'برنامه پیگیری', 'حساب و حریم خصوصی', 'خانه سلامت']) {
        await navigate(view);
      // A published member now lands on the illustrated care overview.
      await page.locator('.mv-view, .mv-plan-timeline, .j-home, .cv-overview').first().waitFor();
        await assertLayout();
      }
      await screenshot(`home-${width}.png`);
    }
    const isolated = await browser.newContext({ viewport: { width: 320, height: 740 } });
    const other = await isolated.newPage();
    await other.goto(origin + prefix);
    await other.getByRole('heading', { name: 'ورود به پرونده', exact: true }).waitFor();
    assert.equal(await other.getByRole('button', { name: 'خروج', exact: true }).count(), 0);
    await assertLayout(other);
    await isolated.close();
  });
  await check('admin overview and membership page load with role restrictions', async () => {
    await logout(); await login('09000000013');
    await page.locator('.sw-metrics').waitFor();
    await assertLayout();
    await screenshot('admin-1440.png');
    await navigate('اعضا و دسترسی‌ها');
    await page.getByText('افزودن عضو دعوتی', { exact: true }).click();await page.getByLabel('نام نمایشی', { exact: true }).waitFor();
  });
  await check('public brand guide, nine supplied Peyda weights and logo downloads work under the same subdirectory', async () => {
    await logout();
    await page.getByRole('link', { name: 'هویت سلامت‌بان', exact: true }).click();
    await page.getByRole('heading', { name: 'یک نشان، سه معنا.', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, prefix + 'brand/index.html');
    await assertPeyda(page);
    const weights = await page.evaluate(async () => Promise.all([100, 200, 300, 400, 500, 600, 700, 800, 900].map(async weight => ({ weight, loaded: (await document.fonts.load(`${weight} 16px Peyda`, 'سلامت‌بان ۱۲۳')).some(face => Number(face.weight) === weight && face.status === 'loaded') }))));
    assert.ok(weights.every(weight => weight.loaded), JSON.stringify(weights));
    assert.equal(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'دریافت SVG رنگی', exact: false }).click();
    assert.equal((await downloadPromise).suggestedFilename(), 'logo.svg');
    await assertLayout();
    await screenshot('brand-1440.png');
    await page.setViewportSize({ width: 320, height: 740 });
    await assertLayout();
    assert.doesNotMatch(await page.locator('body').innerText(), /همیار[\s‌]*سلامت/);
    assert.deepEqual(unexpectedRequests, []);
    assert.deepEqual(pageErrors, []);
  });
});
