import {navigateProduct,completeDiscovery,profileField} from './journey-test-helpers.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const url=process.env.SALAMATBAN_PUBLIC_URL||'https://ourgemeniprostudent-png.github.io/salamatban/';
let proxy;
const configured=process.env.HTTPS_PROXY||process.env.https_proxy;
if(configured&&!new URL(url).hostname.match(/^(localhost|127\.0\.0\.1)$/)){const p=new URL(configured);proxy={server:p.protocol+'//'+p.host,...(p.username?{username:decodeURIComponent(p.username),password:decodeURIComponent(p.password)}:{})};}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],proxy});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(url,{waitUntil:'load',timeout:45000});assert.equal(response.status(),200);
 await page.getByLabel('شماره همراه',{exact:true}).fill('09000000001');await page.getByRole('button',{name:'دریافت کد ورود',exact:true}).click();const code=await page.locator('.p-sample-code b').innerText();await page.getByLabel('کد یک‌بارمصرف (۳ دقیقه اعتبار)').fill(code);await page.getByRole('button',{name:'ورود',exact:true}).click();await page.getByRole('button',{name:'خروج',exact:true}).waitFor();
 const intake=()=>navigateProduct(page,'تکمیل پرونده');await intake();await page.screenshot({path:'.test-build/visual-consent-desktop.png',fullPage:true});await page.getByRole('checkbox',{name:'پذیرش قوانین و بررسی پزشک',exact:true}).check();await page.getByRole('button',{name:'موافقم، ادامه بده'}).click();await completeDiscovery(page);await page.getByLabel('نام',{exact:true}).fill('آزمون انتشار');await profileField(page,'city');await page.getByLabel('شهر',{exact:true}).fill('تهر');await page.getByRole('option').filter({hasText:'تهران'}).first().click();await page.getByRole('button',{name:'ذخیره و ادامه در فرصتی دیگر'}).click();await page.getByRole('heading',{name:'از همان‌جا که بودید ادامه دهید',exact:true}).waitFor();await page.reload({waitUntil:'load'});await page.getByRole('button',{name:'خروج',exact:true}).waitFor();await intake();assert.equal(await page.getByLabel('نام',{exact:true}).inputValue(),'آزمون انتشار');await profileField(page,'city');assert.equal(await page.getByLabel('شهر',{exact:true}).inputValue(),'تهران');assert.match(await page.locator('.p-footer').innerText(),/۲٫۲٫۱/);assert.deepEqual(errors,[]);await page.screenshot({path:'.test-build/ux-public-site.png',fullPage:true});

 const local=new URL(url).hostname.match(/^(localhost|127\.0\.0\.1)$/);await writeFile('../review-evidence/'+(local?'ux-final-browser.json':'ux-public-browser.json'),JSON.stringify({scope:local?'local final build':'public browser',url,verifiedAt:new Date().toISOString(),status:'passed',checks:['public page HTTP 200','synthetic OTP login','v2.2.1 marker','city selection','draft save','reload preserves stored draft'],pageErrors:errors},null,2)+'\n');console.log('PASS v2.2.1 browser: login, city selection, draft save and reload');
}finally{await browser.close();}
