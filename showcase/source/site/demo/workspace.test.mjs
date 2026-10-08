import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { demoBindings } from './bundle.mjs';
import { navigateProduct, waitForAsync } from './journey-test-helpers.mjs';

// Real local service and UI, exclusively synthetic demo accounts. The driver is
// used to arrange cases; every action asserted below is exercised through the UI.
test('Actionable role workspaces v2.2.1', { timeout: 240000 }, async t => {
  const root = process.cwd();
  await mkdir('.test-build', { recursive: true });
  await build({
    stdin: { contents: "export {createDemoBackend} from './demo/backend';", resolveDir: root, loader: 'ts' },
    outfile: '.test-build/workspace-driver.js', bundle: true, format: 'iife',
    globalName: 'WorkspaceDriver', platform: 'browser', loader: { '.sql': 'text' },
    define: { 'process.env.NODE_ENV': '"production"' }, plugins: [demoBindings(root)],
  });
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://test').pathname);
      const file = path.resolve('dist-demo', '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(path.resolve('dist-demo') + path.sep)) { res.writeHead(404).end(); return; }
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream' }).end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const pageErrors = [], completed = [], measurements = {};
  page.on('pageerror', error => pageErrors.push(error.message));

  async function driver() {
    await page.addScriptTag({ path: '.test-build/workspace-driver.js' });
    await page.evaluate(async () => {
      window.workspaceBackend = await window.WorkspaceDriver.createDemoBackend();
      window.workspaceRequest = async (route, body, method) => {
        const actor = await (await window.workspaceBackend.fetch('/api/pilot/me')).json();
        const response = await window.workspaceBackend.fetch('/api/pilot/' + route, {
          method: method || (body ? 'POST' : 'GET'),
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': actor.csrf || '' },
          body: body ? JSON.stringify(body) : undefined,
        });
        return { status: response.status, data: await response.json() };
      };
    });
  }
  async function login(phone) {
    await page.getByLabel('شماره همراه', { exact: true }).fill(phone);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)').fill(await page.locator('.p-sample-code b').innerText());
    await page.getByRole('button', { name: 'ورود', exact: true }).click();
    await page.getByRole('button', { name: 'خروج', exact: true }).waitFor();
    await driver();
  }
  async function logout() {
    await page.getByRole('button', { name: 'خروج', exact: true }).click();
    await page.getByRole('heading', { name: 'ورود به پرونده', exact: true }).waitFor();
  }
  async function check(name, run) {
    let failure;
    await t.test(name, async () => {
      try { await run(); completed.push(name); }
      catch (error) {
        failure = error;
        await page.screenshot({ path: '.test-build/workspace-failure.png', fullPage: true });
        await writeFile('.test-build/workspace-failure.txt', await page.locator('body').innerText());
        await writeFile('.test-build/workspace-failure.html', await page.locator('body').innerHTML());
        throw error;
      }
    });
    if (failure) throw failure;
  }
  async function noOverflow() {
    const overflow = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(overflow.document <= overflow.width, `Horizontal overflow: ${JSON.stringify(overflow)}`);
  }
  async function capture(name) {
    await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.screenshot({ path: `.test-build/${name}.png`, fullPage: true });
  }
  async function seedSubmitted() {
    const result = await page.evaluate(async () => {
      const must = result => { if (result.status !== 200) throw new Error(JSON.stringify(result)); return result.data; };
      const record = must(await window.workspaceRequest('record')).record;
      const answers = Object.fromEntries(['urgent_chest_pain', 'urgent_dyspnea', 'urgent_syncope', 'urgent_neuro', 'urgent_bleeding', 'urgent_infection', 'urgent_self_harm'].map(id => [id, 'no']));
      Object.assign(answers, { pregnancy_status: 'not_applicable', known_conditions: ['none'], family_history: ['none'], tobacco: 'never', activity: 'some', sleep: 'good' });
      must(await window.workspaceRequest('record', { version: record.version, consent: true, coordination: true, profile: { firstName: 'عضو', lastName: 'آزمون فضای کار', birthDate: '1990-01-01', city: 'تهران', goal: 'هدف ساختگی برای آزمون گردش کار', insurance: 'none' }, answers, step: 5 }, 'PUT'));
      const order = must(await window.workspaceRequest('payment', {}));
      must(await window.workspaceRequest('payment/demo', { id: order.id, result: 'paid' }));
      const current = must(await window.workspaceRequest('record')).record;
      return await window.workspaceRequest('record/submit', { version: current.version });
    });
    assert.equal(result.status, 200, JSON.stringify(result));
  }

  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await login('09000000001');
  await seedSubmitted();
  await logout();
  await login('09000000002');
  await seedSubmitted();
  await logout();
  await login('09000000011');
  const prepared = await page.evaluate(async () => {
    const record = (await window.workspaceRequest('record?user=demo-member-02')).data.record;
    return await window.workspaceRequest('staff/review', { userId: 'demo-member-02', version: record.version, action: 'request_information', note: 'برای آزمون صف، اطلاعات ساختگی تکمیل شود.' });
  });
  assert.equal(prepared.status, 200);
  await page.getByRole('button', { name: 'تازه‌سازی', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.sw-metrics button')].some(el => el.textContent.includes('منتظر پاسخ عضو') && el.querySelector('strong')?.textContent === '۱'));

  const metric = name => page.locator('.sw-metrics').getByRole('button', { name: new RegExp(name) });
  const rows = page.locator('.sw-queue .p-queue-row');
  const doctorNote = 'لطفاً هدف ساختگی خود را روشن‌تر بنویسید؛ یک توضیح کافی است.';
  const teamTitle = 'هماهنگی نوبت ساختگی فضای کار';
  const memberTitle = 'پیگیری قدم ساختگی عضو';
  const completion = 'انجام نوبت ساختگی با عضو بررسی و ثبت شد.';

  await check('doctor metrics are keyboard-operable filters; counts and actual cases agree and changing filter clears stale detail', async () => {
    await metric('همهٔ پرونده‌های من').waitFor();
    assert.match(await metric('همهٔ پرونده‌های من').innerText(), /۲/);
    assert.match(await metric('در انتظار بررسی').innerText(), /۱/);
    assert.match(await metric('منتظر پاسخ عضو').innerText(), /۱/);
    await metric('در انتظار بررسی').focus();
    assert.equal(await metric('در انتظار بررسی').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    await page.keyboard.press('Enter');
    assert.equal(await metric('در انتظار بررسی').getAttribute('aria-pressed'), 'true');
    assert.equal(await rows.count(), 1);
    assert.match(await rows.first().innerText(), /کاربر نمونه اول/);
    await rows.first().click();
    await page.getByRole('navigation', { name: 'بخش‌های بررسی پرونده', exact: true }).waitFor();
    await page.getByText('اقدام بعدی: ثبت نتیجه بررسی', { exact: true }).waitFor();
    await metric('منتظر پاسخ عضو').click();
    assert.equal(await rows.count(), 1);
    assert.match(await rows.first().innerText(), /کاربر نمونه دوم/);
    assert.equal(await page.getByRole('navigation', { name: 'بخش‌های بررسی پرونده', exact: true }).count(), 0);
    await metric('هشدارِ بررسی‌نشده').click();
    assert.equal(await rows.count(), 0);
    await page.getByText('پرونده‌ای با این جست‌وجو پیدا نشد.', { exact: true }).waitFor();
    await metric('همهٔ پرونده‌های من').click();
    assert.equal(await rows.count(), 2);
    for (const width of [1920, 390, 320]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      await noOverflow();
      await capture(`workspace-doctor-queue-${width}`);
      if (width === 390) {
        const firstCase = await rows.first().boundingBox();
        measurements.doctorFirstCaseOnPhone = { viewport: '390×844', top: firstCase.y, bottom: firstCase.y + firstCase.height, maximumAllowedTop: 700 };
        assert.ok(firstCase.y <= 700, `The first case must be discoverable in the initial phone viewport, found y=${firstCase.y}`);
      }
    }
  });

  await check('a queue failure after a new case loads cannot leave the previous selected identity attached to the new record', async () => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await metric('همهٔ پرونده‌های من').click();
    await rows.filter({ hasText: 'کاربر نمونه دوم' }).click();
    await page.getByText('منتظر تکمیل و ارسال دوباره کاربر', { exact: true }).waitFor();
    await page.evaluate(() => {
      window.workspaceOriginalRequest = window.Request;
      window.workspacePartialTrace = [];
      window.workspaceFailQueue = true;
      window.Request = class extends window.workspaceOriginalRequest {
        constructor(...args) {
          super(...args);
          const route = new URL(this.url);
          if (route.pathname === '/api/pilot/record' && route.searchParams.get('user') === 'demo-member-01') window.workspacePartialTrace.push('new-record-request');
          if (route.pathname === '/api/pilot/staff/queue' && window.workspaceFailQueue) {
            window.workspaceFailQueue = false;
            window.workspacePartialTrace.push('queue-request-failed');
            throw new Error('Synthetic queue outage after the new record response');
          }
        }
      };
    });
    try {
      await rows.filter({ hasText: 'کاربر نمونه اول' }).click();
      await page.locator('.p-alert.danger[role="alert"]').waitFor();
      assert.deepEqual(await page.evaluate(() => window.workspacePartialTrace), ['new-record-request', 'queue-request-failed']);
      assert.equal(await page.locator('.sw-queue .p-queue-row[aria-current="true"]').count(), 0);
      assert.equal(await page.getByRole('navigation', { name: 'بخش‌های بررسی پرونده', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'تأیید و انتشار برای کاربر', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'بازگرداندن برای تکمیل', exact: true }).count(), 0);
    } finally {
      await page.evaluate(() => { window.Request = window.workspaceOriginalRequest; });
    }
    await rows.filter({ hasText: 'کاربر نمونه اول' }).click();
    await page.getByText('اقدام بعدی: ثبت نتیجه بررسی', { exact: true }).waitFor();
    assert.match(await page.locator('.sw-queue .p-queue-row[aria-current="true"]').innerText(), /کاربر نمونه اول/);
    assert.equal(await page.locator('.p-alert.danger[role="alert"]').count(), 0);
  });

  await check('doctor opens one case on mobile and the information-to-decision path offers an explicit request-information action', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await metric('در انتظار بررسی').click();
    await rows.first().click();
    await page.getByRole('button', { name: 'ادامه به ثبت نتیجه', exact: false }).waitFor();
    assert.equal(await page.locator('.sw-queue').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'تأیید و انتشار برای کاربر', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'ادامه به ثبت نتیجه', exact: false }).click();
    await page.getByRole('button', { name: /اطلاعات بیشتری لازم است/ }).click();
    const note = page.getByLabel('یادداشت بررسی یا درخواست تکمیل', { exact: true });
    await note.fill(doctorNote);
    const focus = await note.evaluate(el => ({ outline: getComputedStyle(el).outlineStyle, border: getComputedStyle(el).borderWidth, shadow: getComputedStyle(el).boxShadow }));
    assert.deepEqual(focus, { outline: 'none', border: '1px', shadow: 'none' });
    await note.scrollIntoViewIfNeeded();
    assert.equal(await note.evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.right - 24, r.top + 24) === el; }), true, 'The typing area must not be covered by its action bar');
    await noOverflow();
    await capture('workspace-doctor-decision-390');
    await page.getByRole('button', { name: 'بازگرداندن برای تکمیل', exact: true }).click();
    await page.getByText('منتظر تکمیل و ارسال دوباره کاربر', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'تأیید و انتشار برای کاربر', exact: true }).count(), 0);
    await waitForAsync(page, async () => (await window.workspaceRequest('record?user=demo-member-01')).data.record.status === 'needs_information');
  });

  await check('member sees the exact requested clarification and a direct next action, resubmitting without a second payment', async () => {
    await logout(); await login('09000000001');
    await page.getByRole('heading', { name: 'پزشک به توضیح شما نیاز دارد', exact: true }).waitFor();
    await page.getByText(doctorNote, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'تکمیل توضیح و ارسال دوباره', exact: true }).click();
    await page.getByRole('button', { name: 'ارسال برای بررسی پزشک', exact: true }).click();
    await page.getByRole('heading', { name: 'پاسخ‌ها رسید؛ حالا نوبت پزشک است', exact: true }).waitFor();
    const result = await page.evaluate(async () => (await window.workspaceRequest('record')).data);
    assert.equal(result.orders.length, 1);
    assert.equal(result.record.status, 'submitted');
    await noOverflow();
    await capture('workspace-member-waiting-390');
  });

  await check('doctor publishes member and team actions from the decision pane; tracking shows one automatic team handoff', async () => {
    await logout(); await login('09000000011');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await metric('در انتظار بررسی').click(); await rows.first().click();
    await page.getByRole('button', { name: 'ادامه به ثبت نتیجه', exact: false }).click();
    await page.getByLabel('جمع‌بندی قابل نمایش به کاربر', { exact: true }).fill('جمع‌بندی ساختگی برای آزمون برنامه و پیگیری دو مسئول متفاوت.');
    await page.getByLabel('عنوان', { exact: true }).fill(memberTitle);
    await page.getByLabel('دلیل', { exact: true }).fill('قدم ساختگی با گزارش خود عضو');
    const due = new Date(Date.now() + 7 * 86400000);
    const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).formatToParts(due).map(part => [part.type, part.value]));
    const persianDue = `${dateParts.year}/${dateParts.month}/${dateParts.day}`;
    await page.getByLabel('موعد (شمسی)', { exact: true }).fill(persianDue);
    await page.getByRole('button', { name: 'افزودن اقدام', exact: true }).click();
    await page.getByLabel('عنوان', { exact: true }).nth(1).fill(teamTitle);
    await page.getByLabel('دلیل', { exact: true }).nth(1).fill('آزمون هماهنگی ساختگی با کارشناس');
    await page.getByLabel('موعد (شمسی)', { exact: true }).nth(1).fill(persianDue);
    await page.getByRole('combobox', { name: 'مسئول', exact: true }).nth(1).click();
    await page.getByRole('option', { name: 'تیم هماهنگی', exact: true }).click();
    await noOverflow();
    await capture('workspace-doctor-program-1920');
    await page.getByRole('button', { name: 'تأیید و انتشار برای کاربر', exact: true }).click();
    await page.getByText('برنامه با نام شما منتشر شد.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('navigation', { name: 'بخش‌های بررسی پرونده', exact: true }).getByRole('button', { name: /برنامه و هماهنگی/ }).getAttribute('aria-current'), 'page');
    const result = await page.evaluate(async () => (await window.workspaceRequest('record?user=demo-member-01')).data);
    assert.equal(result.plans.length, 1);
    assert.equal(result.plans[0].actions.length, 2);
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0].status, 'requested');
  });

  await check('coordinator queue metrics open a request and expose only the current stage, with restricted clinical access', async () => {
    await logout(); await login('09000000012');
    await metric('درخواست تازه').click();
    assert.equal(await rows.count(), 1);
    assert.match(await rows.first().innerText(), new RegExp(teamTitle));
    await rows.first().click();
    await page.getByText('اقدام بعدی: تماس با کاربر', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('مرکز', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'تأیید نوبت', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'ثبت انجام نوبت', exact: true }).count(), 0);
    assert.equal((await page.evaluate(() => window.workspaceRequest('record?user=demo-member-01'))).status, 404);
    assert.equal((await page.locator('body').innerText()).includes('هدف ساختگی برای آزمون گردش کار'), false);
    for (const width of [1920, 390, 320]) {
      await page.setViewportSize({ width, height: 960 }); await noOverflow();
      await capture(`workspace-coordinator-contact-${width}`);
    }
    await page.getByLabel('یادداشت قابل نمایش', { exact: true }).fill('تماس ساختگی انجام شد؛ هماهنگی زمان در جریان است.');
    await page.getByRole('button', { name: 'ثبت تماس و شروع هماهنگی', exact: true }).click();
    await page.getByText('اقدام بعدی: تأیید مرکز و زمان نوبت', { exact: true }).waitFor();
    await page.getByLabel('مرکز', { exact: true }).fill('مرکز ساختگی فضای کار');
    await page.getByLabel('زمان نوبت', { exact: true }).fill('فردا ساعت ۱۰، نمونهٔ آزمون');
    await page.getByLabel('کد تأیید', { exact: true }).fill('SYNTHETIC-WORKSPACE');
    await page.getByRole('checkbox', { name: /رضایت انتقال اطلاعات لازم/ }).check();
    await page.getByRole('button', { name: 'تأیید نوبت', exact: true }).click();
    await page.getByText('اقدام بعدی: پیگیری انجام نوبت و ثبت نتیجه', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('مرکز', { exact: true }).isDisabled(), true);
    await page.setViewportSize({ width: 1440, height: 960 });
    await capture('workspace-coordinator-confirmed-1440');
    await page.getByLabel('یادداشت قابل نمایش', { exact: true }).fill(completion);
    await page.getByRole('button', { name: 'ثبت انجام نوبت', exact: true }).click();
    await page.getByText('انجام نوبت ثبت شد', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'ثبت انجام نوبت', exact: true }).count(), 0);
    const task = await page.evaluate(async () => (await window.workspaceRequest('staff/queue')).data.tasks[0]);
    assert.equal(task.status, 'completed');
    assert.equal(task.note, completion);
  });

  await check('member sees the remaining personal step and the completed team result; member cannot change team completion', async () => {
    await logout(); await login('09000000001');
    await page.getByRole('heading', { name: memberTitle, exact: true }).waitFor();
    await page.getByText(completion, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'مشاهده و ثبت انجام', exact: true }).click();
    const personal = page.getByRole('checkbox', { name: memberTitle, exact: true });
    const team = page.getByRole('checkbox', { name: teamTitle, exact: true });
    assert.equal(await personal.isChecked(), false);
    assert.equal(await personal.isEnabled(), true);
    assert.equal(await team.isChecked(), true);
    assert.equal(await team.isDisabled(), true);
    // This controlled checkbox commits only after the local service accepts it.
    await personal.click();
    await waitForAsync(page, async () => (await window.workspaceRequest('record')).data.updates.filter(u => u.evidence === 'گزارش کاربر').some(u => u.done));
    assert.equal(await personal.isChecked(), true);
    await navigateProduct(page, 'پشتیبانی');
    await page.getByLabel('متن درخواست', { exact: true }).fill('درخواست ساختگی بررسی فضای کار و پاسخ مدیر');
    await page.getByRole('button', { name: 'ثبت درخواست', exact: true }).click();
    await page.getByText('درخواست ثبت شد.', { exact: true }).waitFor();
    const deletion = await page.evaluate(() => window.workspaceRequest('feedback', { kind: 'deletion', message: 'درخواست ساختگی حذف اطلاعات، نیازمند اقدام واقعی', page: 'support' }));
    assert.equal(deletion.status, 200);
  });

  await check('admin metrics route to active, suspended, support and payment lists; list selection makes its action explicit without clinical access', async () => {
    await logout(); await login('09000000013');
    await metric('عضو فعال').click();
    assert.equal(await rows.count(), 2);
    await rows.first().click();
    await page.getByRole('button', { name: 'ثبت پزشک مسئول', exact: true }).waitFor();
    assert.equal((await page.evaluate(() => window.workspaceRequest('record?user=demo-member-01'))).status, 404);
    assert.equal((await page.locator('body').innerText()).includes('هدف ساختگی برای آزمون گردش کار'), false);
    await metric('دسترسی معلق').click();
    assert.equal(await rows.count(), 0);
    await page.getByText('عضوی با این فیلتر پیدا نشد.', { exact: true }).waitFor();
    await metric('پرداخت نیازمند بررسی').click();
    await page.getByRole('heading', { name: 'پرداخت نامشخصی باقی نمانده', exact: true }).waitFor();
    await metric('درخواست باز').click();
    assert.equal(await rows.count(), 2);
    assert.match(await metric('درخواست باز').innerText(), /۲/);
    await rows.filter({ hasText: 'درخواست ساختگی بررسی فضای کار و پاسخ مدیر' }).click();
    await page.getByLabel('پاسخ', { exact: true }).fill('پاسخ ساختگی؛ درخواست بررسی و نتیجه ثبت شد.');
    for (const width of [1920, 390, 320]) {
      await page.setViewportSize({ width, height: 960 }); await noOverflow();
      await capture(`workspace-admin-response-${width}`);
    }
    await page.getByRole('button', { name: 'ثبت پاسخ و پایان رسیدگی', exact: true }).click();
    await page.locator('#support-management .p-tag.resolved').waitFor();
    await page.getByLabel('پاسخ', { exact: true }).fill('پاسخ ساختگی ویرایش شد؛ کار انجام‌شده همچنان بسته است.');
    await page.getByRole('button', { name: 'ویرایش پاسخ ثبت‌شده', exact: true }).click();
    await page.getByText('پاسخ ویرایش شد؛ وضعیت رسیدگی‌شده حفظ شد.', { exact: true }).waitFor();
    assert.equal((await page.evaluate(async () => (await window.workspaceRequest('staff/queue')).data.feedback)).find(f => f.kind === 'issue').status, 'resolved');
    await metric('درخواست باز').click();
    assert.equal(await rows.count(), 1);
    assert.match(await rows.first().innerText(), /درخواست ساختگی حذف اطلاعات/);
    await rows.first().click();
    assert.equal(await page.getByRole('button', { name: 'ثبت پاسخ و پایان رسیدگی', exact: true }).count(), 0);
    await page.getByLabel('پاسخ', { exact: true }).fill('پاسخ ساختگی؛ درخواست برای اقدام واقعی هنوز باز می‌ماند.');
    await page.getByRole('button', { name: 'ثبت پاسخ', exact: true }).click();
    await page.getByText('پاسخ ثبت شد؛ درخواست تا انجام واقعی باز می‌ماند.', { exact: true }).waitFor();
    const feedback = await page.evaluate(async () => (await window.workspaceRequest('staff/queue')).data.feedback);
    assert.equal(feedback.find(f => f.kind === 'issue').status, 'resolved');
    assert.equal(feedback.find(f => f.kind === 'deletion').status, 'open');
  });

  assert.deepEqual(pageErrors, []);
  const report = { version: '2.2.1', completedAt: new Date().toISOString(), status: 'passed', individualPassed: completed.length, data: 'synthetic local demo accounts only', pageErrors, measurements, checks: completed };
  await writeFile('.test-build/workspace-tests.json', JSON.stringify(report, null, 2));
  await writeFile('../review-evidence/workspace-tests.json', JSON.stringify(report, null, 2));
});
