import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

test('startup preloads the database engine and exposes recovery for long waits',async t=>{
 const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname;const file=path.resolve('dist-demo','.'+(name==='/'?'/index.html':name));if(!file.startsWith(path.resolve('dist-demo')+path.sep))throw Error('path');res.setHeader('content-type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 await t.test('WASM starts before application download finishes; slow download gives retry then recovers',async()=>{
  const page=await browser.newPage();await page.clock.install();let appRoute;const wasm=[];
  page.on('request',r=>{if(r.url().endsWith('sql-wasm.wasm'))wasm.push(r.url());});await page.route('**/app.js?*',route=>{appRoute=route;});
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#launch-status')!==null);assert.ok(appRoute);assert.equal(wasm.length,1);
  await page.clock.fastForward(11000);await page.getByRole('button',{name:'تلاش دوباره برای بارگذاری'}).waitFor();assert.match(await page.locator('#launch-status').innerText(),/بیشتر از معمول/);
  await appRoute.continue();await page.getByRole('button',{name:'دریافت کد ورود',exact:true}).waitFor();assert.equal(wasm.length,1,'preloaded WASM is reused');await page.close();
 });
 await t.test('blocked database initialization times out with a retry instead of an endless loading screen',async()=>{
  const page=await browser.newPage();await page.clock.install();await page.addInitScript(()=>{indexedDB.open=()=>({});});await page.goto(origin);await page.clock.fastForward(46000);await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/بیش از حد طول کشید/);await page.getByRole('button',{name:'تلاش دوباره برای بارگذاری'}).waitFor();await page.close();
 });
});
