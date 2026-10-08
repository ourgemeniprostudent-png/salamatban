import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {publicFontAssets} from '../demo/bundle.mjs';

test('National city selection remains keyboard accessible and preserves manual entry',{timeout:60000},async t=>{
 const root=process.cwd(),out=path.join(root,'.test-build/city-input');await mkdir(out,{recursive:true});
 const reportPath=path.join(root,'.test-build/city-input-tests.json');await rm(reportPath,{force:true});
 await build({stdin:{contents:`import React,{useState}from'react';import{createRoot}from'react-dom/client';import'./app/globals.css';import'./app/pilot/pilot.css';import'./app/pilot/ux-improvements.css';import{CityInput}from'./app/pilot/city-input';function App(){const[value,setValue]=useState('');const[error,setError]=useState('');window.cityError=setError;return <main className="pilot" style={{padding:16,minHeight:1100}}><div style={{maxWidth:480,margin:'auto'}}><CityInput value={value} onChange={(value,city)=>{setValue(value);window.citySelection={value,city};}} error={error}/><button id="after">ادامه</button></div></main>}createRoot(document.getElementById('app')).render(<App/>);`,loader:'tsx',resolveDir:root},outfile:path.join(out,'app.js'),bundle:true,format:'esm',jsx:'automatic',plugins:[publicFontAssets(root,{bundle:true})],loader:{'.woff2':'file'},define:{'process.env.NODE_ENV':'"production"'}});
 const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="app"></div><script type="module" src="/app.js"></script></html>');return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'font/woff2');res.end(await readFile(path.join(out,path.basename(name))));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 const page=await browser.newPage(),errors=[],passed=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(5000);
 const city=page.getByRole('combobox',{name:'شهر'}),next=page.locator('#after');
 async function open(width){await page.setViewportSize({width,height:900});await page.goto(origin);await city.waitFor();await page.evaluate(()=>document.fonts.ready);}
 async function check(name,fn){await t.test(name,async()=>{await fn();passed.push(name);});}
 const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1,`${label}: ${a} -> ${b}`);

 await check('Arabic spelling selects the stable city ID using ArrowDown and Enter',async()=>{
  await open(390);await city.fill('كرج');await city.press('ArrowDown');assert.equal(await page.getByRole('option').first().getAttribute('aria-selected'),'true');await city.press('Enter');
  assert.equal(await city.inputValue(),'کرج');assert.equal((await page.evaluate(()=>window.citySelection)).city.id,'ir-karaj');assert.equal(await city.getAttribute('aria-expanded'),'false');
 });
 await check('Duplicate cities show their province and ambiguous same-province cities show county',async()=>{
  await city.fill('محمودآباد');const options=page.getByRole('option');assert.equal(await options.count(),3);await options.filter({hasText:'آذربایجان غربی'}).click();assert.equal((await page.evaluate(()=>window.citySelection)).city.id,'ir-mahmudabad-west');
  await city.fill('گلوگاه');assert.equal(await options.count(),2);assert.match(await options.first().innerText(),/شهرستان بابل/);assert.match(await options.last().innerText(),/شهرستان گلوگاه/);await options.filter({hasText:'شهرستان بابل'}).click();assert.equal((await page.evaluate(()=>window.citySelection)).city.county,'بابل');
 });
 await check('Unknown manual entry is retained and clears the prior selected ID; manual action supports Tab',async()=>{
  await city.fill('شهر تازهٔ من');assert.equal(await page.getByRole('option').count(),0);assert.equal((await page.evaluate(()=>window.citySelection)).city,undefined);
  await city.press('Tab');const manual=page.getByRole('button',{name:'شهرم را پیدا نکردم؛ نام تایپ‌شده را نگه دار'});assert.equal(await manual.evaluate(e=>e===document.activeElement),true);await manual.press('Enter');assert.equal(await city.inputValue(),'شهر تازهٔ من');assert.equal(await city.getAttribute('aria-expanded'),'false');assert.equal((await page.evaluate(()=>window.citySelection)).city,undefined);
 });
 await check('Results, no-match state and validation do not move the next control at mobile and desktop widths',async()=>{
  for(const width of [320,390,1440]){
   await open(width);const start=await next.boundingBox();
   for(const query of ['','لواسان','ناشناخته آزمون','گلوگاه']){await city.fill(query);near(start.y,(await next.boundingBox()).y,'next action after city search');}
   await page.evaluate(()=>window.cityError('نام شهر را وارد کنید.'));near(start.y,(await next.boundingBox()).y,'next action with validation');assert.equal(await city.getAttribute('aria-invalid'),'true');
   await page.evaluate(()=>window.cityError(''));near(start.y,(await next.boundingBox()).y,'next action after validation cleared');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
 });
 await check('Keyboard traversal scrolls only the suggestion list and retains a visible active option',async()=>{
  await open(320);await city.fill('');const pageY=await page.evaluate(()=>scrollY);for(let i=0;i<12;i++)await city.press('ArrowDown');
  const list=page.getByRole('listbox',{name:'پیشنهاد شهرها'}),active=page.locator('[role=option][aria-selected=true]');const box=await active.boundingBox(),frame=await list.boundingBox();
  assert.ok(box.y>=frame.y-1&&box.y+box.height<=frame.y+frame.height+1,'active option must be visible');near(pageY,await page.evaluate(()=>scrollY),'page scroll while traversing cities');assert.ok(await list.evaluate(e=>e.scrollTop)>0);
  await city.press('Escape');assert.equal(await city.getAttribute('aria-expanded'),'false');assert.equal(await city.evaluate(e=>e===document.activeElement),true);
 });
 assert.deepEqual(errors,[]);assert.equal(passed.length,5);
 await writeFile(reportPath,JSON.stringify({status:'passed',verifiedAt:new Date().toISOString(),scope:'Isolated React/Chromium CityInput harness; not a deployed-page test',widths:[320,390,1440],individualPassed:passed.length,checks:passed,pageErrors:errors},null,2)+'\n');
});
