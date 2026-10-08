import { navigateProduct } from './journey-test-helpers.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { demoBindings } from './bundle.mjs';

test('Role workflow v2.1', {timeout:180000}, async t=>{
 const root=process.cwd();await mkdir('.test-build',{recursive:true});
 await build({stdin:{contents:`export {createDemoBackend} from './demo/backend';import initSql from 'sql.js';import {openStore} from './demo/storage';export async function legacySnapshot(){const store=await openStore('salamatban-presentation-v1:'+new URL('.',document.baseURI).pathname);const saved=await store.read();const SQL=await initSql({locateFile:()=>new URL('sql-wasm.wasm',document.baseURI).href});const db=new SQL.Database(saved.database);db.run('DROP TABLE pilot_booking_locations');await store.write({...saved,database:db.export()});db.close();}`,resolveDir:root,loader:'ts'},outfile:'.test-build/workflow-driver.js',bundle:true,format:'iife',globalName:'UXDriver',platform:'browser',loader:{'.sql':'text'},define:{'process.env.NODE_ENV':'"production"'},plugins:[demoBindings(root)]});
 const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://test').pathname);const file=path.resolve('dist-demo','.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(path.resolve('dist-demo')+path.sep)){res.writeHead(404).end();return;}const data=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(12000);
 const failures=[];page.on('pageerror',e=>failures.push(e.message));
 async function driver(){await page.addScriptTag({path:'.test-build/workflow-driver.js'});await page.evaluate(async()=>{window.backend=await window.UXDriver.createDemoBackend();window.request=async(route,body,method)=>{const actor=await(await window.backend.fetch('/api/pilot/me')).json();const r=await window.backend.fetch('/api/pilot/'+route,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json','X-CSRF-Token':actor.csrf||''},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};});}
 async function login(phone){await page.getByLabel('شماره همراه',{exact:true}).fill(phone);await page.getByRole('button',{name:'دریافت کد ورود',exact:true}).click();const code=await page.locator('.p-sample-code b').innerText();await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)').fill(code);await page.getByRole('button',{name:'ورود',exact:true}).click();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();await driver();}
 async function nav(name){return navigateProduct(page,name);}
 async function check(name,fn){await t.test(name,async()=>{try{await fn();}catch(e){console.error(await page.locator('body').innerText());await page.screenshot({path:'.test-build/workflow-failure.png',fullPage:true});throw e;}});}
 async function logout(){await page.getByRole('button',{name:'خروج',exact:true}).click();await page.getByRole('heading',{name:'ورود به پرونده',exact:true}).waitFor();}
 await page.goto(origin);await login('09000000001');
 await check('a paid member submits a synthetic case to the assigned doctor',async()=>{
  const result=await page.evaluate(async()=>{const r=(await window.request('record')).data.record;const answers=Object.fromEntries(['urgent_chest_pain','urgent_dyspnea','urgent_syncope','urgent_neuro','urgent_bleeding','urgent_infection','urgent_self_harm'].map(id=>[id,'no']));Object.assign(answers,{pregnancy_status:'not_applicable',known_conditions:['none'],family_history:['none'],tobacco:'never',activity:'some',sleep:'good'});
  await window.request('record',{version:r.version,consent:true,coordination:true,profile:{firstName:'عضو',lastName:'آزمون گردش کار',birthDate:'1990-01-01',city:'تهران',goal:'آزمون گردش کار با داده ساختگی',insurance:'none'},answers,step:5},'PUT');const order=await window.request('payment',{});await window.request('payment/demo',{id:order.data.id,result:'paid'});return order.status;});assert.equal(result,200);
  await page.getByRole('button',{name:'تازه‌سازی',exact:true}).click();await nav('تکمیل پرونده');await page.getByRole('button',{name:'ارسال برای بررسی پزشک',exact:true}).click();await page.getByText('پاسخ‌ها رسید؛ حالا نوبت پزشک است',{exact:false}).first().waitFor();await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'.test-build/visual-waiting.png',fullPage:true});await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('doctor can request more information from an actionable case, then member resubmits without repaying',async()=>{
  await logout();await login('09000000011');await page.setViewportSize({width:390,height:844});await page.locator('.p-queue-row').first().click();
  await page.getByText('اقدام بعدی: ثبت نتیجه بررسی',{exact:true}).waitFor();assert.equal(await page.locator('.ux-clinical-answers').first().getAttribute('open'),null);
  await page.getByLabel('یادداشت بررسی یا درخواست تکمیل').fill('لطفاً هدف پرونده ساختگی را روشن‌تر بنویسید.');await page.getByRole('button',{name:'بازگرداندن برای تکمیل',exact:true}).click();await page.getByText('منتظر تکمیل و ارسال دوباره کاربر',{exact:true}).waitFor();
  await logout();await login('09000000001');await nav('تکمیل پرونده');await page.getByRole('button',{name:'ارسال برای بررسی پزشک',exact:true}).click();assert.equal((await page.evaluate(async()=>(await window.request('record')).data.orders)).length,1);await page.setViewportSize({width:1280,height:900});
 });
 await check('doctor publishes a team action which enters the coordinator queue exactly once',async()=>{
  await logout();await login('09000000011');await page.locator('.p-queue-row').first().click();
  await page.getByLabel('جمع‌بندی قابل نمایش به کاربر',{exact:true}).fill('جمع‌بندی ساختگی برای بررسی روند ارجاع به تیم هماهنگی.');await page.getByLabel('عنوان',{exact:true}).fill('هماهنگی نوبت آزمایشی');await page.getByLabel('دلیل',{exact:true}).fill('برای آزمون عملکرد نرم‌افزار');
  const due=new Date(Date.now()+86400000*7);const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}).formatToParts(due).map(p=>[p.type,p.value]));await page.getByLabel('موعد (شمسی)',{exact:true}).fill(`${parts.year}/${parts.month}/${parts.day}`);
  await page.getByRole('combobox',{name:'مسئول',exact:true}).click();await page.getByRole('option',{name:'تیم هماهنگی',exact:true}).click();await page.getByRole('button',{name:'تأیید و انتشار برای کاربر',exact:true}).click();await page.getByText('برنامه با نام شما منتشر شد.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'ارجاع اقدامات تیم به کارشناس',exact:true}).click();await page.getByText('ارجاع اقدامات تیم ثبت شد؛ ارجاع تکراری ساخته نمی‌شود.',{exact:true}).waitFor();await page.screenshot({path:'.test-build/ux-doctor-workflow.png',fullPage:true});
 });
 await check('coordinator handles the physician referral and persisted completion reaches the member',async()=>{
  await logout();await login('09000000012');const task=page.locator('.p-task').filter({has:page.getByRole('heading',{name:/هماهنگی نوبت آزمایشی/})});assert.equal(await task.count(),1);
  await task.getByRole('button',{name:'ثبت تماس و شروع هماهنگی',exact:true}).click();await task.locator('.p-tag.contacted').waitFor();await task.getByLabel('مرکز',{exact:true}).fill('مرکز ساختگی');await task.getByLabel('زمان نوبت',{exact:true}).fill('فردا ساعت ۱۰؛ ساختگی');await task.getByLabel('کد تأیید',{exact:true}).fill('DEMO-FLOW');await task.getByRole('checkbox').check();await task.getByRole('button',{name:'تأیید نوبت',exact:true}).click();await task.locator('.p-tag.confirmed').waitFor();
  await page.reload();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();await driver();assert.equal(await task.getByLabel('مرکز',{exact:true}).inputValue(),'مرکز ساختگی');await task.getByLabel('یادداشت قابل نمایش',{exact:true}).fill('کاربر انجام نوبت ساختگی را تأیید کرد.');await task.getByRole('button',{name:'ثبت انجام نوبت',exact:true}).click();await task.locator('.p-tag.completed').waitFor();await page.screenshot({path:'.test-build/ux-coordinator-workflow.png',fullPage:true});
  await logout();await login('09000000001');await page.locator('.care-published').waitFor();for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.test-build/visual-home-'+width+'.png',fullPage:true});}await page.setViewportSize({width:1280,height:900});await nav('برنامه پیگیری');await page.screenshot({path:'.test-build/visual-program.png',fullPage:true});await page.emulateMedia({reducedMotion:'no-preference'});const action=page.getByRole('checkbox',{name:'هماهنگی نوبت آزمایشی',exact:true});assert.equal(await action.isChecked(),true);assert.equal(await action.isDisabled(),true);
  await nav('پشتیبانی');await page.getByLabel('متن درخواست',{exact:true}).fill('آزمون درخواست پشتیبانی گردش کار');await page.getByRole('button',{name:'ثبت درخواست',exact:true}).click();await page.getByText('درخواست ثبت شد.',{exact:true}).waitFor();
 });
 await check('admin resolves an ordinary support issue without clinical access',async()=>{
  await logout();await login('09000000013');await nav('پیام‌ها و درخواست‌ها');const task=page.locator('.p-task').filter({hasText:'آزمون درخواست پشتیبانی گردش کار'});await task.getByLabel('پاسخ',{exact:true}).fill('پاسخ ساختگی؛ مشکل نرم‌افزاری برطرف شد.');await task.getByRole('button',{name:'ثبت پاسخ و پایان رسیدگی',exact:true}).click();await task.locator('.p-tag.resolved').waitFor();
  const result=await page.evaluate(()=>window.request('record?user=demo-member-01'));assert.equal(result.status,404);
 });
 await check('member can request a program review, recheck current safety and return to the doctor without losing the plan or paying twice',async()=>{
  await logout();await page.evaluate(()=>{const originalNow=Date.now;Date.now=()=>originalNow()+601000;});await login('09000000001');await nav('برنامه پیگیری');
  await page.getByRole('button',{name:'گفت‌وگوی دوباره دربارهٔ برنامه',exact:true}).click();await page.getByRole('radio',{name:'انجام یکی از قدم‌ها برایم سخت است',exact:true}).check();await page.getByLabel('پیام بازبینی برای پزشک',{exact:true}).fill('برای انجام این اقدام ساختگی، زمان مناسب پیدا نکرده‌ام.');await page.getByRole('button',{name:'ادامهٔ بازبینی پرونده',exact:true}).click();
  await page.getByRole('heading',{name:'علائم مهم',exact:true}).waitFor();assert.equal(await page.getByRole('radio',{name:'خیر',exact:true}).isChecked(),false);
  for(let i=0;i<7;i++){await page.getByRole('radio',{name:'خیر',exact:true}).check();await page.getByRole('button',{name:i===6?'ذخیره و مرحله بعد ←':'پرسش بعدی ←',exact:true}).click();}
  for(let i=0;i<8;i++){const next=page.getByRole('button',{name:i===7?'ذخیره و مرحله بعد ←':i===2||i===3?'ادامه بدون پاسخ':'پرسش بعدی ←',exact:true});await next.click();}
  await page.getByRole('heading',{name:'مدارک',exact:true}).waitFor();await page.getByRole('button',{name:'ذخیره و مرحله بعد ←',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'شروع پرداخت نمایشی',exact:true}).count(),0);await page.getByRole('button',{name:'ارسال برای بررسی پزشک',exact:true}).click();await page.getByRole('heading',{name:'پاسخ‌ها رسید؛ حالا نوبت پزشک است',exact:true}).waitFor();
  const d=await page.evaluate(async()=>(await window.request('record')).data);assert.equal(d.orders.length,1);assert.equal(d.plans.length,1);assert.equal(d.record.profile.followup.kind,'barrier');
  await logout();await login('09000000011');await page.locator('.p-queue-row').first().click();await page.getByRole('heading',{name:'پیام تازهٔ کاربر برای بازبینی',exact:true}).waitFor();await page.getByText('برای انجام این اقدام ساختگی، زمان مناسب پیدا نکرده‌ام.',{exact:true}).waitFor();
 });
 assert.deepEqual(failures,[]);await writeFile('.test-build/workflow-tests.json',JSON.stringify({completedAt:new Date().toISOString(),pageErrors:failures,scope:'UI doctor request-information, member resubmit, publish/team handoff, coordinator completion, member progress, admin resolution'},null,2));
});
