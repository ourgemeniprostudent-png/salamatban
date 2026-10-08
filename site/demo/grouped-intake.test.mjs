import { waitForAsync, navigateProduct } from './journey-test-helpers.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { demoBindings } from './bundle.mjs';

test('Grouped journey v2.3', {timeout:180000}, async t=>{
 const root=process.cwd();await mkdir('.test-build',{recursive:true});
 await build({stdin:{contents:`export {createDemoBackend} from './demo/backend';import initSql from 'sql.js';import {openStore} from './demo/storage';export async function legacySnapshot(){const store=await openStore('salamatban-presentation-v1:'+new URL('.',document.baseURI).pathname);const saved=await store.read();const SQL=await initSql({locateFile:()=>new URL('sql-wasm.wasm',document.baseURI).href});const db=new SQL.Database(saved.database);db.run('DROP TABLE pilot_booking_locations');await store.write({...saved,database:db.export()});db.close();}`,resolveDir:root,loader:'ts'},outfile:'.test-build/grouped-driver.js',bundle:true,format:'iife',globalName:'UXDriver',platform:'browser',loader:{'.sql':'text'},define:{'process.env.NODE_ENV':'"production"'},plugins:[demoBindings(root)]});
 const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://test').pathname);const file=path.resolve('dist-demo','.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(path.resolve('dist-demo')+path.sep)){res.writeHead(404).end();return;}const data=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 let context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});let page=await context.newPage();page.setDefaultTimeout(12000);
 const failures=[];page.on('pageerror',e=>failures.push(e.message));
 async function driver(){await page.addScriptTag({path:'.test-build/grouped-driver.js'});await page.evaluate(async()=>{window.backend=await window.UXDriver.createDemoBackend();window.request=async(route,body,method)=>{const actor=await(await window.backend.fetch('/api/pilot/me')).json();const r=await window.backend.fetch('/api/pilot/'+route,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json','X-CSRF-Token':actor.csrf||''},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};});}
 async function login(phone){await page.getByLabel('شماره همراه',{exact:true}).fill(phone);await page.getByRole('button',{name:'دریافت کد ورود',exact:true}).click();const code=await page.locator('.p-sample-code b').innerText();await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)').fill(code);await page.getByRole('button',{name:'ورود',exact:true}).click();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();await driver();}
 async function nav(name){return navigateProduct(page,name);}
 async function check(name,fn){let failed;await t.test(name,async()=>{try{await fn();}catch(e){failed=e;console.error(e);await page.screenshot({path:'.test-build/grouped-failure.png',fullPage:true});throw e;}});if(failed)throw failed;}

 await page.goto(origin);await login('09000000001');
 const reasons=['condition','symptom','prevention','wellbeing','report','unsure'];
 const completeAnswers={urgent_chest_pain:'no',urgent_dyspnea:'no',urgent_syncope:'no',urgent_neuro:'no',urgent_bleeding:'no',urgent_infection:'no',urgent_self_harm:'no',pregnancy_status:'not_applicable',known_conditions:['none'],family_history:['none'],tobacco:'never',activity:'regular',sleep:'good'};
 async function fixture({step=1,journey={version:2,reasons:['unsure'],primary:'unsure',context:{},cursor:3,ready:true},answers={}}={}){
  await page.evaluate(async({step,journey,answers})=>{const current=(await window.request('record')).data.record;const result=await window.request('record',{version:current.version,consent:true,coordination:false,step,profile:{firstName:'کاربر',lastName:'آزمون گروهی',birthDate:'1991-03-21',city:'تهران',insurance:'none',goal:'خواستهٔ ساختگی برای آزمون',journey},answers},'PUT');if(result.status!==200)throw new Error(JSON.stringify(result));},{step,journey,answers});
  await page.reload();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();await driver();await nav('تکمیل پرونده');
 }
 await check('all six selected reasons use three context pages, preserving every answer and chosen goal',async()=>{
  await fixture({journey:{version:2,reasons,primary:'symptom',context:{},cursor:1,ready:false}});
  const labels=[];
  for(let group=0;group<3;group++){
   const fields=page.locator('.gi-context-grid textarea');assert.equal(await fields.count(),4);
   for(let i=0;i<4;i++){labels.push(await fields.nth(i).getAttribute('aria-label'));await fields.nth(i).fill(`پاسخ زمینه ${group*4+i+1}`);}
   await page.getByRole('button',{name:group===2?'ادامه به انتخاب هدف ←':'ادامه توضیحات ←',exact:true}).click();
  }
  assert.equal(new Set(labels).size,12);await page.getByRole('heading',{name:'دوست دارید این همراهی چه تغییری ایجاد کند؟',exact:true}).waitFor();
  await page.getByRole('button',{name:'قبلی',exact:true}).click();assert.equal(await page.locator('.gi-context-grid textarea').first().inputValue(),'پاسخ زمینه 9');
  await page.getByRole('button',{name:'ادامه به انتخاب هدف ←',exact:true}).click();await page.getByRole('button',{name:'برای انتخاب هدف از پزشک کمک می‌خواهم',exact:true}).click();await page.getByRole('button',{name:'ادامه به مشخصات من',exact:true}).click();
  await page.locator('.gi-profile').waitFor();await waitForAsync(page,async()=>(await window.request('record')).data.record.profile.journey.ready===true);
  const saved=await page.evaluate(async()=>(await window.request('record')).data.record.profile);assert.equal(Object.keys(saved.journey.context).length,12);assert.equal(saved.journey.primary,'symptom');assert.deepEqual(saved.journey.reasons,reasons);assert.equal(saved.goal,'برای انتخاب هدف از پزشک کمک می‌خواهم');
 });
 await check('older single-question cursor resumes inside its group without losing optional text',async()=>{
  await fixture({journey:{version:2,reasons:['condition','wellbeing'],primary:'wellbeing',context:{wellbeing_detail:'یادداشت ذخیره‌شده در نسخهٔ قبل',condition_detail:'پیگیری ساختگی'},cursor:2,ready:false}});
  assert.equal(await page.locator('.gi-context-grid textarea').count(),4);assert.equal(await page.locator('.gi-context-grid textarea').first().inputValue(),'یادداشت ذخیره‌شده در نسخهٔ قبل');
  await page.getByRole('button',{name:'ادامه به انتخاب هدف ←',exact:true}).click();await page.getByRole('button',{name:'قبلی',exact:true}).click();assert.equal(await page.locator('.gi-context-grid textarea').first().inputValue(),'یادداشت ذخیره‌شده در نسخهٔ قبل');
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`.test-build/grouped-context-${width}.png`,fullPage:true});}
 });
 await check('profile fields and clinical groups share a stable reachable action bar without focus rings',async()=>{
  await page.setViewportSize({width:1440,height:1000});await fixture();
  assert.equal(await page.locator('[data-profile-field]').count(),5);assert.equal(await page.getByRole('button',{name:'مشخصهٔ بعدی',exact:true}).count(),0);
  const name=page.getByLabel('نام',{exact:true});await name.focus();const focus=await name.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,shadow:getComputedStyle(el).boxShadow}));assert.equal(focus.outline,'none');assert.equal(focus.shadow,'none');
  for(const width of [390,320]){await page.setViewportSize({width,height:844});const goal=page.getByLabel('هدف شما از همراهی',{exact:true});await goal.focus();await page.waitForFunction(()=>{const field=document.querySelector('textarea[aria-label="هدف شما از همراهی"]')?.getBoundingClientRect();const bar=document.querySelector('.p-wizard-actions')?.getBoundingClientRect();return field&&bar&&field.y>=0&&field.bottom<=bar.y;});const bounds=await goal.boundingBox();const bar=await page.locator('.p-wizard-actions').boundingBox();assert.ok(bar.y+bar.height<=845,JSON.stringify({width,bar}));assert.ok(bounds.y>=0&&bounds.y+bounds.height<=bar.y,JSON.stringify({width,bounds,bar}));assert.equal(await goal.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`.test-build/grouped-profile-focus-${width}.png`});}
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));const profileBar=await page.locator('.p-wizard-actions').boundingBox();assert.ok(profileBar.y+profileBar.height<=1001,JSON.stringify(profileBar));const firstField=await page.locator('[data-profile-field]').first().boundingBox();const finalField=await page.getByLabel('هدف شما از همراهی',{exact:true}).boundingBox();assert.ok(firstField.y<440,JSON.stringify(firstField));assert.ok(finalField.y+finalField.height<=profileBar.y,JSON.stringify({finalField,profileBar}));await page.screenshot({path:'.test-build/grouped-profile-1440.png'});
  await page.getByRole('button',{name:'ذخیره و مرحله بعد ←',exact:true}).click();await page.getByRole('heading',{name:'علائم مهم',exact:true}).waitFor();
  const before=await page.locator('.gi-action-bar').boundingBox();assert.ok(Math.abs(profileBar.y-before.y)<=3,JSON.stringify({profileBar,before}));await page.getByRole('button',{name:'ذخیره و مرحله بعد ←',exact:true}).click();
  const after=await page.locator('.gi-action-bar').boundingBox();assert.ok(Math.abs(before.y-after.y)<=3,JSON.stringify({before,after}));assert.equal(await page.locator('.gi-question-grid .p-question').count(),7);
  for(const no of await page.getByRole('radio',{name:'خیر',exact:true}).all())await no.check();await page.waitForTimeout(180);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));const safetyFirst=await page.locator('.gi-question').first().boundingBox();const safetyLast=await page.locator('.gi-question').last().boundingBox();const safetyBar=await page.locator('.gi-action-bar').boundingBox();assert.ok(safetyFirst.y<440,JSON.stringify(safetyFirst));assert.ok(safetyLast.y+safetyLast.height<=safetyBar.y,JSON.stringify({safetyLast,safetyBar}));await page.screenshot({path:'.test-build/grouped-safety-1440.png'});
  await page.getByRole('button',{name:'ذخیره و مرحله بعد ←',exact:true}).click();await page.getByRole('heading',{name:'سوابق و سبک زندگی',exact:true}).waitFor();assert.equal(await page.locator('.p-question').count(),5);
  await page.getByRole('button',{name:/عادت‌های روزانه/,exact:false}).first().click();assert.equal(await page.locator('.p-question').count(),3);
  await page.getByRole('radio',{name:'هرگز',exact:true}).check();await page.getByRole('radio',{name:'۳ روز یا بیشتر در هفته',exact:true}).check();await page.getByRole('radio',{name:'خوب',exact:true}).check();await page.getByRole('button',{name:'ذخیره و مرحله بعد ←',exact:true}).click();
  assert.equal(await page.locator('.p-question').count(),5,'Cannot bypass unanswered clinical history by jumping to lifestyle');assert.equal(await page.locator('[data-field="pregnancy_status"] input').first().evaluate(el=>el===document.activeElement),true);
  await page.getByRole('radio',{name:'برای من مطرح نیست',exact:true}).check();await page.getByRole('checkbox',{name:'هیچ‌کدام',exact:true}).check();await page.getByRole('checkbox',{name:'هیچ‌کدام/نمی‌دانم',exact:true}).check();await page.getByRole('button',{name:'ادامه به عادت‌های روزانه ←',exact:true}).click();await page.getByRole('button',{name:'ذخیره و مرحله بعد ←',exact:true}).click();await page.getByRole('heading',{name:'مدارک',exact:true}).waitFor();
  const saved=await page.evaluate(async()=>(await window.request('record')).data.record.answers);for(const [id,value]of Object.entries(completeAnswers))assert.deepEqual(saved[id],value);assert.ok(!saved.medications&&!saved.allergies);
 });
 assert.deepEqual(failures,[]);await writeFile('.test-build/grouped-intake-tests.json',JSON.stringify({version:'2.3',completedAt:new Date().toISOString(),status:'passed',pageErrors:failures,checks:['all 12 context questions across three pages','compatible older cursor and persisted optional text','all profile fields together','stable action bar through validation','all 15 clinical questions and required answer gates','320/390/768/1440 responsive grouped context']},null,2));
});
