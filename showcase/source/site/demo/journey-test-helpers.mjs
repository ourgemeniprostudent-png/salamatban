// Exercise the actual progressive navigation, including the account's record links.
export async function navigateProduct(page,name){
 await page.waitForFunction(()=>!document.querySelector('button[aria-label="تازه‌سازی"]')?.disabled);
 const member=await page.locator('.j-member-shell').count();
 if(member){
  if(name==='حساب و حریم خصوصی'){await page.getByRole('button',{name:'حساب من',exact:true}).click();return;}
  if(name==='پشتیبانی'){await page.getByRole('button',{name:'کمک',exact:true}).click();return;}
  if(name==='خانه سلامت'){const home=page.getByRole('button',{name:'خانه',exact:true});if(await home.count())await home.click();else {const nav=page.getByRole('navigation',{name:'بخش‌های پرونده',exact:true});if(await nav.count())await nav.getByRole('button',{name,exact:true}).click();}return;}
  const direct=page.getByRole('navigation',{name:'بخش‌های پرونده',exact:true}).getByRole('button',{name,exact:true});
  if(await direct.count()){await direct.click();return;}
  if(name==='تکمیل پرونده'&&await page.getByRole('button',{name:'شروع آشنایی',exact:true}).count()){await page.getByRole('button',{name:'شروع آشنایی',exact:true}).click();return;}
  await page.getByRole('button',{name:'حساب من',exact:true}).click();await page.getByRole('navigation',{name:'اطلاعات من'}).getByRole('button',{name,exact:true}).click();return;
 }
 const menu=page.getByRole('button',{name:'باز کردن منو',exact:true});if(await menu.isVisible()&&await menu.getAttribute('aria-expanded')==='false')await menu.click();
 await page.getByRole('navigation',{name:'بخش‌های پرونده',exact:true}).getByRole('button').filter({has:page.getByText(name,{exact:true})}).click();
}
export async function completeDiscovery(page){
 await page.getByRole('heading',{name:'برای چه چیزی کمک می‌خواهید؟',exact:true}).waitFor();
 await page.getByRole('button',{name:/هنوز دقیق نمی‌دانم/}).click();await page.getByRole('button',{name:'ادامه ←',exact:true}).click();
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'ادامه بدون پاسخ',exact:true}).click();
 await page.getByRole('button',{name:'برای انتخاب هدف از پزشک کمک می‌خواهم',exact:true}).click();await page.getByRole('button',{name:'ادامه به مشخصات من',exact:true}).click();
}
export async function profileField(page,id){const titles={name:'چه اسمی صدایتان کنیم؟',birthDate:'تاریخ تولد شما چیست؟',city:'در کدام شهر زندگی می‌کنید؟',insurance:'وضعیت بیمهٔ شما چطور است؟',goal:'خواستهٔ شما را درست فهمیدیم؟'};await page.getByRole('button',{name:titles[id],exact:true}).click();}
// waitForFunction treats a Promise as truthy; poll completed API reads explicitly.
export async function waitForAsync(page,predicate,arg){
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){if(await page.evaluate(predicate,arg))return;await new Promise(resolve=>setTimeout(resolve,80));}
 throw new Error('Timed out waiting for persisted API state');
}
