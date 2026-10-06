import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

test('demo login account picker and copy controls', {timeout:120000}, async t => {
 const root=path.resolve('dist-demo'), evidence=path.resolve('../review-evidence');
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.woff2':'font/woff2','.svg':'image/svg+xml'};
 const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 t.after(async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 const phone=page.getByLabel('شماره همراه',{exact:true}),accounts=page.locator('.p-demo-account');
 const request=page.getByRole('button',{name:'دریافت کد ورود',exact:true});
 await page.goto(origin);await accounts.first().waitFor();
 async function check(name,fn){let failure;await t.test(name,async()=>{try{await fn();checks.push(name);}catch(e){failure=e;await page.screenshot({path:path.join(evidence,'login-failure.png'),fullPage:true});throw e;}});if(failure)throw failure;}
 await check('five named accounts are visible left of the desktop form and fill the selected phone',async()=>{
  assert.equal(await accounts.count(),5);const form=await page.locator('.p-login-form').boundingBox(),panel=await page.locator('.p-demo-accounts').boundingBox();assert.ok(panel.x+panel.width<form.x);
  for(const [i,number] of ['09000000001','09000000002','09000000011','09000000012','09000000013'].entries()){
   assert.ok(await accounts.nth(i).isVisible());assert.ok((await accounts.nth(i).locator('strong').innerText()).length>3);await accounts.nth(i).click();assert.equal(await phone.inputValue(),number);assert.equal(await accounts.nth(i).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.p-copyable-code').count(),0);
  }
 });
 await check('code and copy icon write the real clipboard and show local confirmation without submitting',async()=>{
  await accounts.first().click();await request.click();const code=await page.locator('.p-sample-code b').innerText();
  for(const selector of ['.p-code-value','.p-code-icon']){await context.grantPermissions(['clipboard-read','clipboard-write']);await page.evaluate(()=>navigator.clipboard.writeText('old'));await page.locator(selector).click();await page.locator('.is-copied').waitFor();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),code);assert.equal(await page.locator('.p-copy-tooltip').innerText(),'کپی شد');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.p-copy-tooltip')).opacity==='1');assert.ok(await page.getByRole('button',{name:'ورود',exact:true}).isVisible());}
  await page.screenshot({path:path.join(evidence,'login-desktop.png'),fullPage:true});
 });
 await check('choosing another account clears the previous challenge and copy confirmation',async()=>{
  await accounts.nth(2).click();assert.equal(await phone.inputValue(),'09000000011');assert.ok(await phone.isEnabled());assert.equal(await page.locator('.p-copyable-code').count(),0);await request.click();await page.locator('.p-code-value').waitFor();assert.equal(await page.locator('.p-copy-tooltip').innerText(),'کپی کد');assert.equal(await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)',{exact:true}).inputValue(),'');
 });
 await check('keyboard activation copies the code and clipboard denial uses a working fallback',async()=>{
  await page.locator('.p-code-icon').focus();await page.keyboard.press('Enter');await page.locator('.is-copied').waitFor();const code=await page.locator('.p-sample-code b').innerText();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),code);
  await page.evaluate(async()=>{await navigator.clipboard.writeText('fallback probe');navigator.clipboard.writeText=async()=>{throw new Error('Permission denied');};});
  await page.locator('.p-code-value').click();await page.locator('.is-copied').waitFor();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),code);assert.equal(await page.locator('.p-copy-error').count(),0);await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(evidence,'login-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
 });
 await check('copy failure is explicit and does not claim success or submit login',async()=>{
  await page.evaluate(()=>{document.execCommand=()=>false;});await page.locator('.p-code-icon').click();await page.getByRole('alert').filter({hasText:'کپی خودکار ممکن نشد'}).waitFor();assert.equal(await page.locator('.is-copied').count(),0);assert.notEqual(await page.locator('.p-copy-tooltip').innerText(),'کپی شد');assert.ok(await page.getByRole('button',{name:'ورود',exact:true}).isVisible());
 });
 await check('all accounts stay expanded and layouts fit 320, 390, 768 and 1440 pixels',async()=>{
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(let i=0;i<5;i++)assert.ok(await accounts.nth(i).isVisible());}
 });
 await check('selected doctor can complete the unchanged OTP login and reach their role',async()=>{
  const code=await page.locator('.p-sample-code b').innerText();await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)',{exact:true}).fill(code);await page.getByRole('button',{name:'ورود',exact:true}).click();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();assert.equal(await page.locator('.p-demo-accounts').count(),0);assert.match(await page.locator('.p-sidebar').innerText(),/پزشک/);assert.deepEqual(errors,[]);
 });
 await mkdir(evidence,{recursive:true});await writeFile(path.join(evidence,'login-browser.json'),JSON.stringify({version:JSON.parse(await readFile(path.join(root,'release.json'),'utf8')).version,verifiedAt:new Date().toISOString(),status:'passed',individualChecks:checks.length,checks,pageErrors:errors,viewports:[320,390,768,1440],clipboard:'real Chromium clipboard; denied API fallback; both methods denied'},null,2)+'\n');
});
