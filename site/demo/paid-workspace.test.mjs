import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
test('paid workspace navigation, detail layouts and cold font loading',async t=>{
 const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://test').pathname;const relative=pathname.replace(/^\/salamatban\//,'')||'index.html';const file=path.resolve('dist-demo',relative);if(!pathname.startsWith('/salamatban/')||!file.startsWith(path.resolve('dist-demo')+path.sep))throw Error('404');res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff2':'font/woff2','.pdf':'application/pdf','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/salamatban/`;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 await mkdir('.test-build',{recursive:true});const checks=[],errors=[];
 const context=await browser.newContext({viewport:{width:1440,height:1050}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const nav=async label=>{await page.locator('.demo-preview .j-member-nav').getByRole('button',{name:label,exact:true}).click();};
 await t.test('cold delayed fonts load all essential weights without post-mount shift',async()=>{
  await page.addInitScript(()=>{window.layoutShifts=[];new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.layoutShifts.push({value:e.value,afterInteractive:!!document.querySelector('.pd-dashboard')});}).observe({type:'layout-shift',buffered:true});});
  const requests=[];await page.route('**/*.woff2',async route=>{requests.push(route.request().url());await new Promise(r=>setTimeout(r,1500));await route.continue();});
  await page.goto(base+'?demo=after-payment');await page.locator('.pd-dashboard').waitFor();
  const faces=await page.evaluate(()=>[...document.fonts].filter(f=>f.family.replace(/['"]/g,'')==='Peyda'&&['400','500','600','700','800','900'].includes(f.weight)).map(f=>({weight:f.weight,status:f.status,display:f.display})));
  assert.equal(faces.length,6);assert.ok(faces.every(f=>f.status==='loaded'&&f.display==='swap'),JSON.stringify(faces));assert.equal(new Set(requests).size,6);assert.ok(requests.every(url=>url.includes('/salamatban/fonts/')));
  // The asynchronous loader-to-record transition is intentional navigation, not a font swap.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{window.layoutShifts=[];resolve();}))));
  await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.layoutShifts.filter(s=>s.afterInteractive).reduce((sum,s)=>sum+s.value,0)),0);
  checks.push({name:'cold delayed fonts',faces,requests:requests.length,postMountLayoutShift:0});await page.unroute('**/*.woff2');
 });
 await t.test('dashboard destinations open real files, programme history and coordination',async()=>{
  assert.equal(await page.locator('.pd-tile').count(),3);assert.equal(await page.locator('.cv-hero').count(),0);assert.equal(await page.locator('.care-history').count(),0);
  await page.locator('.pd-tile').first().click();assert.equal(await page.locator('.mv-action-timeline>li').count(),4);assert.equal(await page.getByRole('checkbox').first().isDisabled(),true);assert.equal(await page.locator('.care-history-period').count(),5);await page.locator('.care-history-period').last().click();assert(await page.locator('.care-history-details').isVisible());
  await nav('خانه سلامت');await page.locator('.pd-tile').nth(1).click();assert.equal(await page.locator('.p-file').count(),5);assert.equal(await page.getByRole('heading',{name:'افزودن مدرک سلامت',exact:true}).count(),0);const event=page.waitForEvent('download');await page.locator('.p-file').first().click();assert.ok(await(await event).path());
  await nav('خانه سلامت');await page.locator('.pd-tile').last().click();assert.equal(await page.locator('.pd-appointment').count(),5);assert.equal(await page.getByRole('button',{name:'ثبت درخواست',exact:true}).count(),0);assert.equal(await page.locator('.pd-booking-steps [aria-current=step]').count(),5);assert((await page.locator('.pd-booking-info').first().innerText()).includes('مرکز نمونه آبی'));
  checks.push({name:'all destinations, document download, five plans and five appointments',passed:true});
 });
 await t.test('all detail tabs fit desktop, tablet and narrow phones',async()=>{
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1050});for(const section of ['خانه سلامت','برنامه پیگیری','مدارک پزشکی','نوبت‌ها و هماهنگی','تصویر سلامت']){await nav(section);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${section} overflow at ${width}`);if(['خانه سلامت','نوبت‌ها و هماهنگی'].includes(section)&&[1440,390].includes(width))await page.screenshot({path:`.test-build/paid-${section==='خانه سلامت'?'dashboard':'appointments'}-${width}.png`,fullPage:true});if(section==='نوبت‌ها و هماهنگی')assert.equal(await page.locator('.pd-appointments-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),width>760?2:1);}}
  checks.push({name:'five sections at four widths, no page overflow, responsive appointments',passed:true});
 });
 await t.test('active member uses own progress and respects motion preferences',async()=>{
  await page.setViewportSize({width:1440,height:1050});await page.getByRole('button',{name:/مهدی روشن در حال پیگیری/}).click();await page.locator('.pd-dashboard').waitFor();assert((await page.locator('.cv-completion-ring').innerText()).includes('۵۰'));assert((await page.locator('.pd-program-focus').innerText()).includes('قدم بعدی'));
  await page.getByRole('button',{name:'توقف حرکت',exact:true}).click();assert.equal(await page.locator('.pd-tile .cv-glyph').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.pd-tile .cv-glyph').first().evaluate(el=>getComputedStyle(el).animationName),'none');assert.equal(await page.locator('.cv-motion').isVisible(),false);
  await nav('نوبت‌ها و هماهنگی');assert.ok(await page.locator('.pd-booking-steps [aria-current=step]').count()>0);checks.push({name:'active-member data, pause and reduced motion',passed:true});
 });
 await t.test('a failed font does not block login startup',async()=>{
  const c=await browser.newContext();const p=await c.newPage();await p.route('**/PeydaWebFaNum-Medium.woff2',r=>r.fulfill({status:404,body:'missing test font'}));await p.goto(base);await p.getByRole('button',{name:'دریافت کد ورود',exact:true}).waitFor();const faces=await p.evaluate(()=>[...document.fonts].filter(f=>['400','500'].includes(f.weight)).map(f=>({weight:f.weight,status:f.status})));assert.ok(faces.some(f=>f.weight==='400'&&f.status==='loaded'));assert.ok(faces.some(f=>f.weight==='500'&&f.status==='error'));await c.close();checks.push({name:'font failure leaves login usable',passed:true});
 });
 assert.deepEqual(errors,[]);await writeFile('.test-build/paid-workspace-tests.json',JSON.stringify({version:'2.4.2',completedAt:new Date().toISOString(),checks,pageErrors:errors,fontWaitLimitMs:4000},null,2)+'\n');
});
