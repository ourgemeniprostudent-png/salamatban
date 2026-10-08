import { waitForAsync, navigateProduct } from './journey-test-helpers.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { demoBindings } from './bundle.mjs';

test('Grouped journey v2.2.1', {timeout:180000}, async t=>{
 const root=process.cwd();await mkdir('.test-build',{recursive:true});
 await build({stdin:{contents:`export {createDemoBackend} from './demo/backend';import initSql from 'sql.js';import {openStore} from './demo/storage';export async function legacySnapshot(){const store=await openStore('salamatban-presentation-v1:'+new URL('.',document.baseURI).pathname);const saved=await store.read();const SQL=await initSql({locateFile:()=>new URL('sql-wasm.wasm',document.baseURI).href});const db=new SQL.Database(saved.database);db.run('DROP TABLE pilot_booking_locations');await store.write({...saved,database:db.export()});db.close();}`,resolveDir:root,loader:'ts'},outfile:'.test-build/journey-driver.js',bundle:true,format:'iife',globalName:'UXDriver',platform:'browser',loader:{'.sql':'text'},define:{'process.env.NODE_ENV':'"production"'},plugins:[demoBindings(root)]});
 const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://test').pathname);const file=path.resolve('dist-demo','.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(path.resolve('dist-demo')+path.sep)){res.writeHead(404).end();return;}const data=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 let context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});let page=await context.newPage();page.setDefaultTimeout(12000);
 const failures=[];page.on('pageerror',e=>failures.push(e.message));
 async function driver(){await page.addScriptTag({path:'.test-build/journey-driver.js'});await page.evaluate(async()=>{window.backend=await window.UXDriver.createDemoBackend();window.request=async(route,body,method)=>{const actor=await(await window.backend.fetch('/api/pilot/me')).json();const r=await window.backend.fetch('/api/pilot/'+route,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json','X-CSRF-Token':actor.csrf||''},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};});}
 async function login(phone){await page.getByLabel('شماره همراه',{exact:true}).fill(phone);await page.getByRole('button',{name:'دریافت کد ورود',exact:true}).click();const code=await page.locator('.p-sample-code b').innerText();await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)').fill(code);await page.getByRole('button',{name:'ورود',exact:true}).click();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();await driver();}
 async function nav(name){return navigateProduct(page,name);}
 async function check(name,fn){let failed;await t.test(name,async()=>{try{await fn();}catch(e){failed=e;console.error(e);await page.screenshot({path:'.test-build/journey-failure.png',fullPage:true});throw e;}});if(failed)throw failed;}

 await page.goto(origin);await login('09000000001');
 await check('first arrival has no sidebar, empty counters or premature program; responsive welcome and reduced motion',async()=>{
  await page.getByRole('button',{name:'شروع آشنایی',exact:true}).waitFor();
  assert.equal(await page.locator('.p-sidebar,.j-member-nav,.p-metrics').count(),0);
  for(const width of [1920,1440,768,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const hero=await page.locator('.arrival').boundingBox();assert.ok(Math.abs(hero.width-width)<2,`hero should use the entire viewport at ${width}`);assert.equal(await page.locator('.arrival-start').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(52, 110, 209)');await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:`.test-build/journey-welcome-${width}.png`,fullPage:true});await page.emulateMedia({reducedMotion:'no-preference'});}
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.living-scene canvas')?.dataset.motion==='reduced');assert.equal(await page.locator('.living-core').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.querySelector('.living-scene canvas')?.dataset.motion==='running');
  const frame=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(180);assert.notEqual(await page.locator('canvas').evaluate(c=>c.toDataURL()),frame);
  await page.getByRole('button',{name:'توقف حرکت گرافیکی',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.motion==='paused');const still=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(180);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),still);
  await page.getByRole('button',{name:'پخش حرکت گرافیکی',exact:true}).click();
  await page.getByRole('button',{name:'شروع آشنایی',exact:true}).click();await page.locator('.arrival-launching').waitFor();await page.locator('.consent-intro').waitFor();
  const consent=page.getByRole('checkbox',{name:'پذیرش قوانین و بررسی پزشک',exact:true});assert.equal(await consent.isChecked(),false);assert.ok(await page.getByRole('button',{name:'موافقم، ادامه بده',exact:true}).isDisabled());
  await page.getByRole('button',{name:'قوانین و حریم خصوصی',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await consent.isChecked(),false);assert.match(await page.locator('.consent-document').innerText(),/این پایلوت/);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByRole('button',{name:'قوانین و حریم خصوصی',exact:true}).evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.getByRole('checkbox',{name:'تماس کارشناس برای هماهنگی نوبت',exact:true}).isChecked(),false);
  await page.screenshot({path:'.test-build/visual-consent-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'بازگشت',exact:true}).click();
  await page.setViewportSize({width:1280,height:900});await nav('تکمیل پرونده');await page.getByRole('button',{name:'خروج',exact:true}).click();await page.getByRole('heading',{name:'ورود به پرونده',exact:true}).waitFor();await login('09000000001');await nav('تکمیل پرونده');await page.getByRole('checkbox',{name:'پذیرش قوانین و بررسی پزشک',exact:true}).check();await page.getByRole('button',{name:'موافقم، ادامه بده'}).click();
 });
 const reasons=[['condition','پیگیری بیماری مشخص'],['symptom','علامت تازه یا نگرانی'],['prevention','شناخت و پیشگیری'],['wellbeing','حال بهتر در روزمره'],['report','فهمیدن آزمایش یا مدرک'],['unsure','هنوز دقیق نمی‌دانم']];
 for(const [id,title] of reasons)await check(`complete ${id} path with saved context, a user-selected goal and no clinical score`,async()=>{
  if(id!=='condition'){
   await page.evaluate(async()=>{const r=(await window.request('record')).data.record;const result=await window.request('record',{version:r.version,consent:true,coordination:false,profile:{...r.profile,goal:'',journey:{version:2,reasons:[],primary:'',context:{},cursor:0,ready:false}},answers:r.answers,step:1},'PUT');if(result.status!==200)throw Error(JSON.stringify(result));});
   await page.getByRole('button',{name:'تازه‌سازی',exact:true}).click();
  }
  await page.getByRole('heading',{name:'برای چه چیزی کمک می‌خواهید؟',exact:true}).waitFor();
  await page.getByRole('button',{name:'ادامه ←',exact:true}).click();await page.getByRole('alert').filter({hasText:'یک مورد انتخاب کنید'}).waitFor();
  await page.getByRole('button',{name:new RegExp(title)}).click();
  assert.equal(await page.getByRole('alert').filter({hasText:'یک مورد انتخاب کنید'}).count(),0);
  if(id==='condition'){await page.evaluate(()=>window.scrollTo(0,0));await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'.test-build/journey-reasons-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.test-build/journey-reasons-mobile.png',fullPage:true});await page.setViewportSize({width:1280,height:900});await page.emulateMedia({reducedMotion:'no-preference'});}
  await page.getByRole('button',{name:'ادامه ←',exact:true}).click();
  const fields=page.locator('.gi-context-grid textarea');assert.equal(await fields.count(),2);
  for(let i=0;i<2;i++){await fields.nth(i).fill(`توضیح ساختگی مسیر ${id} بخش ${i}`);const focus=await fields.nth(i).evaluate(e=>({outline:getComputedStyle(e).outlineStyle,shadow:getComputedStyle(e).boxShadow,border:getComputedStyle(e).borderWidth}));assert.deepEqual(focus,{outline:'none',shadow:'none',border:'1px'});}
  await page.getByRole('button',{name:'ادامه به انتخاب هدف ←',exact:true}).click();
  await page.getByRole('button',{name:'برای انتخاب هدف از پزشک کمک می‌خواهم',exact:true}).click();
  await page.getByRole('button',{name:'ادامه به مشخصات من',exact:true}).click();await page.getByLabel('نام',{exact:true}).waitFor();
  await waitForAsync(page,async(id)=>{const p=(await window.request('record')).data.record.profile;return p.journey?.ready&&p.journey.primary===id&&p.goal==='برای انتخاب هدف از پزشک کمک می‌خواهم';},id);
  const result=await page.evaluate(async()=>(await window.request('record')).data.record.profile.journey);assert.deepEqual(result.reasons,[id]);assert.equal(Object.keys(result.context).length,2);assert.equal(result.version,2);
 });
 await check('multiple reasons retain one primary and resume the same question after reload; server strips invented authority',async()=>{
  await page.evaluate(async()=>{const r=(await window.request('record')).data.record;await window.request('record',{version:r.version,consent:true,profile:{...r.profile,journey:{version:2,reasons:['condition','wellbeing','not-real'],primary:'wellbeing',context:{condition_detail:'گزارش کاربر',inventedDiagnosis:'fake'},cursor:2,ready:false,approvedByDoctor:true}},answers:r.answers,step:1},'PUT');});
  await page.reload();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();await driver();await nav('تکمیل پرونده');
  await page.locator('.gi-context-grid textarea').first().fill('پاسخ ذخیره‌شونده پیش از خروج');
  await waitForAsync(page,async()=>Object.values((await window.request('record')).data.record.profile.journey.context).includes('پاسخ ذخیره‌شونده پیش از خروج'));
  const label=await page.locator('.j-scene h1').innerText();await page.reload();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();await driver();await nav('تکمیل پرونده');assert.equal(await page.locator('.j-scene h1').innerText(),label);assert.equal(await page.locator('.gi-context-grid textarea').first().inputValue(),'پاسخ ذخیره‌شونده پیش از خروج');
  const j=await page.evaluate(async()=>(await window.request('record')).data.record.profile.journey);assert.equal(j.primary,'wellbeing');assert.deepEqual(j.reasons,['condition','wellbeing']);assert.equal(j.approvedByDoctor,undefined);assert.equal(j.context.inventedDiagnosis,undefined);
 });
 assert.deepEqual(failures,[]);await writeFile('.test-build/journey-tests.json',JSON.stringify({version:'2.2.1',completedAt:new Date().toISOString(),status:'passed',pageErrors:failures,checks:['blue full-width arrival without sidebar or empty metrics','six reasons each with full contextual path and goal','multi-reason primary and resumed question','bounded server-owned journey schema','reduced motion respected','320/390/768/1440/1920 responsive full-width welcome']},null,2));
});
