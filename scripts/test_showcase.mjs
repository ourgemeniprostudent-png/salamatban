/** Browser review of the shareable dashboard, its diagrams and feedback export. */
import {chromium} from '../site/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.SHOWCASE_URL||'http://127.0.0.1:4193/';
const out=new URL('../review-evidence/',import.meta.url);
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const report={packageVersion:'2.3.1',appVersion:'2.3.1',publicAppVersion:'2.3',baseUrl:base,checkedAt:new Date().toISOString(),viewports:[],checks:[],pageErrors:[]};
try{
 const context=await b.newContext({acceptDownloads:true});const p=await context.newPage();p.on('pageerror',e=>report.pageErrors.push(e.message));
 for(const width of [320,390,768,1440]){
  await p.setViewportSize({width,height:1000});await p.goto(base);await p.evaluate(()=>document.fonts.ready);
  for(const key of ['overview','experience','gallery','architecture','readiness','feedback']){
   await p.locator(`[data-nav="${key}"]`).click();await p.locator(`#${key}`).waitFor({state:'visible'});
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${key} overflow at ${width}`);
   assert.equal(await p.locator('.pane:visible').count(),1);
  }
  await p.locator('[data-nav="overview"]').click();await p.locator('#overview').waitFor({state:'visible'});
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(width===1440||width===390)await p.screenshot({path:new URL(width===1440?'showcase-desktop.png':'showcase-mobile.png',out).pathname,fullPage:true});
  report.viewports.push({width,panes:6,horizontalOverflow:false});
 }
 await p.locator('[data-nav="experience"]').click();await p.locator('#experience').waitFor({state:'visible'});
 for(const role of ['member','doctor','coordinator','admin']){await p.locator(`[data-role="${role}"]`).click();assert(await p.locator(`[data-role-panel="${role}"]`).isVisible());assert.equal(await p.locator('[data-role-panel]:visible').count(),1)}
 report.checks.push('four role walkthroughs');
 assert(await p.locator('#overview').innerText().then(text=>text.includes('سایت عمومی: ۲٫۳')&&text.includes('بسته و برنامهٔ داخل آن: ۲٫۳٫۱')));
 assert.equal(await p.locator('.sidebar-bottom a.button').getAttribute('href'),'https://ourgemeniprostudent-png.github.io/salamatban/?v=2.3');
 report.checks.push('packaged v2.3.1 and unchanged public v2.3 are distinguished');
 const mapLink=p.locator('#experience a[href="presentation/assets/workflow-v2.2/index.html"]');assert(await mapLink.isVisible());const mapResponse=await context.request.get(new URL(await mapLink.getAttribute('href'),base).href);assert.equal(mapResponse.status(),200);assert((await mapResponse.text()).includes('پزشک'));report.checks.push('current role architecture is directly reachable from product experience');
 await p.locator('[data-nav="architecture"]').click();await p.locator('#architecture').waitFor({state:'visible'});assert.equal(await p.locator('.diagram-grid .visual-card:visible').count(),6);
 await p.locator('[data-filter="target"]').click();assert.equal(await p.locator('.diagram-grid .visual-card:visible').count(),3);
 await p.locator('[data-filter="current"]').click();assert.equal(await p.locator('.diagram-grid .visual-card:visible').count(),3);
 await p.locator('[data-filter="all"]').click();
 for(const key of ['demo','server','journey','target','infrastructure','data']){
  await p.locator(`button.visual-open[data-view="${key}"]`).click();await p.waitForFunction(()=>{const i=document.querySelector('#viewer-image');return i.complete&&i.naturalWidth>0});
  await p.getByRole('button',{name:'بزرگ‌نمایی بیشتر',exact:true}).click();assert.equal(await p.locator('#viewer-image').evaluate(i=>i.style.width),'150%');
  await p.locator('#zoom-reset').click();assert.equal(await p.locator('#viewer-image').evaluate(i=>i.style.width),'100%');
  for(const type of ['png','svg']){const href=await p.locator(`#download-${type}`).getAttribute('href');const response=await context.request.get(new URL(href,base).href);assert.equal(response.status(),200);assert((await response.body()).length>1000)}
  await p.keyboard.press('Escape');assert(!(await p.locator('#image-dialog').isVisible()));
 }
 report.checks.push('six recovered diagrams load, zoom, close and expose PNG/SVG files','current/target filters');
 await p.locator('[data-nav="gallery"]').click();await p.locator('#gallery').waitFor({state:'visible'});
 for(const key of ['login','welcome','consent','home','program','form','payment','doctor','coordinator','admin','urgent']){await p.locator(`button.visual-open[data-view="${key}"]`).click();await p.waitForFunction(()=>{const i=document.querySelector('#viewer-image');return i.complete&&i.naturalWidth>0});assert(!(await p.locator('#download-svg').isVisible()));await p.locator('#close-viewer').click()}
 report.checks.push('eleven product screenshots and viewer');
 await p.locator('[data-nav="feedback"]').click();await p.locator('#feedback').waitFor({state:'visible'});
 await p.locator('#comment').fill('   ');await p.getByRole('button',{name:'آماده‌کردن بازخورد'}).click();assert(!(await p.locator('#feedback-result').isVisible()));
 const note='در بخش معماری، تفکیک نسخهٔ فعلی و طرح هدف روشن است. پیشنهاد: نمونهٔ بیشتری از مسیر کارشناس.';
 await p.locator('#comment').fill(note);await p.locator('#topic').selectOption({label:'معماری سامانه'});
 await p.reload();assert.equal(await p.locator('#comment').inputValue(),note);
 await p.getByRole('button',{name:'آماده‌کردن بازخورد'}).click();assert((await p.locator('#feedback-output').inputValue()).includes(note));
 const downloadPromise=p.waitForEvent('download');await p.locator('#download-feedback').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'Salamatban-feedback.txt');assert((await readFile(await download.path(),'utf8')).includes(note));
 await p.locator('#comment').fill('نظر تازه');assert(!(await p.locator('#feedback-result').isVisible()));
 report.checks.push('feedback whitespace validation, local draft reload, generated text, download and stale-output invalidation');
 const blocked=await b.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})});const q=await blocked.newPage();await q.goto(base+'#feedback');await q.locator('#comment').fill('ذخیره مسدود است اما خروجی باید کار کند');await q.getByRole('button',{name:'آماده‌کردن بازخورد'}).click();assert(await q.locator('#feedback-result').isVisible());assert((await q.locator('#draft-status').textContent()).includes('ممکن نیست'));await blocked.close();
 report.checks.push('feedback works when browser storage is blocked');
 await p.goto(base);await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'رفتن به محتوا');
 const guide=await context.request.get(new URL('documents/Salamatban-Complete-Guide-fa.html',base).href);assert.equal(guide.status(),200);assert(!(await guide.text()).includes('تحویل به برنامه‌نویس'));
 report.checks.push('keyboard skip link and concise guide');assert.deepEqual(report.pageErrors,[]);
 await writeFile(new URL('showcase-browser.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await b.close()}
