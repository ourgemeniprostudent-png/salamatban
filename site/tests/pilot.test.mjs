import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('.test-build',{recursive:true});
await build({entryPoints:['lib/pilot/service.ts'],outfile:'.test-build/service.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'test-bindings',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={};',loader:'js'}));}}]});
const {handlePilot}=await import('../.test-build/service.mjs');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['FILES']}));
const db=await mf.getD1Database('DB'),files=await mf.getR2Bucket('FILES');
for(const statement of (await readFile('drizzle-pilot/0000_optimal_wind_dancer.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(statement).run();
for(const statement of (await readFile('drizzle-pilot/0001_guards.sql','utf8')).split('\n').filter(x=>x.startsWith('CREATE')))await db.prepare(statement).run();
for(const statement of (await readFile('drizzle-pilot/0002_violet_morgan_stark.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(statement).run();
for(const statement of (await readFile('drizzle-pilot/0003_great_bedlam.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(statement).run();
const c={mode:'demo',origin:'https://pilot.test',authSecret:'test-secret',merchant:'',smsKey:'',smsTemplate:'',staffTotp:{},priceRial:12000000,pricingVersion:'test',scanUrl:'',scanToken:'',consentVersion:'',consentBody:'',clinicalApproved:false,ready:false};
const report=[];
async function test(name,fn){try{await fn();report.push({name,status:'pass'});console.log('PASS',name);}catch(e){report.push({name,status:'fail',detail:e.message});console.error('FAIL',name,e);throw e;}}
async function req(path,method='GET',body,actor={},extra={},config=c){const form=body instanceof FormData;const r=await handlePilot(new Request(c.origin+'/api/pilot/'+path,{method,headers:{origin:c.origin,...(form?{}:{'content-type':'application/json'}),...(actor.cookie?{cookie:actor.cookie,'x-csrf-token':actor.csrf}:{}),...extra},body:method==='GET'?undefined:form?body:JSON.stringify(body||{})}),{db,files,c:config});const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data=raw;}return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function login(phone){const a=await req('auth/request','POST',{phone});assert.equal(a.status,200);const b=await req('auth/verify','POST',{challenge:a.data.challenge,code:a.data.demoCode});assert.equal(b.status,200);return {cookie:b.cookie,csrf:b.data.csrf,id:b.data.user.id};}
let m,m2,doctor,coord,admin,r,order,pid,actionId,taskId;
try{
await test('Live mode refuses incomplete infrastructure',async()=>assert.equal((await req('meta','GET',null,{}, {},{...c,mode:'live'})).status,503));
await test('Unauthenticated health record is denied',async()=>assert.equal((await req('record')).status,401));
await test('Demo seed and OTP sign-in for five separate roles',async()=>{m=await login('09000000001');m2=await login('09000000002');doctor=await login('09000000011');coord=await login('09000000012');admin=await login('09000000013');});
await test('OTP challenge cannot be reused',async()=>{const a=await req('auth/request','POST',{phone:'09000000002'});const b={challenge:a.data.challenge,code:a.data.demoCode};assert.equal((await req('auth/verify','POST',b)).status,200);assert.equal((await req('auth/verify','POST',b)).status,401);});
await test('OTP attempts exhaust after five failures',async()=>{const a=await req('auth/request','POST',{phone:'09000000002'});for(let i=0;i<5;i++)assert.equal((await req('auth/verify','POST',{challenge:a.data.challenge,code:'notcode'})).status,401);assert.equal((await req('auth/verify','POST',{challenge:a.data.challenge,code:a.data.demoCode})).status,401);});
await test('Cross-user reads and coordinator/admin clinical reads are denied',async()=>{for(const a of [m2,coord,admin])assert.equal((await req('record?user='+m.id,'GET',null,a)).status,404);});
await test('CSRF and cross-origin writes are denied',async()=>{assert.equal((await req('record','PUT',{},m,{'x-csrf-token':'bad'})).status,403);assert.equal((await req('record','PUT',{},m,{origin:'https://foreign.test'})).status,403);});
await test('Intake draft saves and survives a fresh request',async()=>{r=(await req('record','GET',null,m)).data.record;const answers=Object.fromEntries(['urgent_chest_pain','urgent_dyspnea','urgent_syncope','urgent_neuro','urgent_bleeding','urgent_infection','urgent_self_harm'].map(x=>[x,'no']));Object.assign(answers,{pregnancy_status:'not_applicable',known_conditions:['none'],family_history:['none'],tobacco:'never',activity:'some',sleep:'good'});const v=await req('record','PUT',{version:r.version,consent:true,coordination:true,profile:{firstName:'نمونه',lastName:'آزمون',birthDate:'1990-01-01',city:'شهر ساختگی',goal:'آزمون نرم‌افزار با اطلاعات ساختگی',insurance:'none'},answers,step:5},m);assert.equal(v.status,200);r=(await req('record','GET',null,m)).data.record;assert.equal(r.profile.firstName,'نمونه');assert.equal(r.version,1);});
await test('Stale draft writes cannot overwrite a newer draft',async()=>assert.equal((await req('record','PUT',{version:0,answers:r.answers},m)).status,409));
await test('Submission is blocked before payment',async()=>assert.equal((await req('record/submit','POST',{version:r.version},m)).status,402));
await test('File signature rejects a forged PDF',async()=>{const f=new FormData();f.append('file',new File(['<script>bad</script>'],'fake.pdf',{type:'application/pdf'}));assert.equal((await req('files','POST',f,m)).status,422);});
let fid;
await test('Private file uploads and duplicate protection work',async()=>{const f=()=>{const v=new FormData();v.append('file',new File(['%PDF-1.4\nsynthetic-test-only'],'test.pdf',{type:'application/pdf'}));return v;};const a=await req('files','POST',f(),m);assert.equal(a.status,200);fid=a.data.id;assert.equal((await req('files','POST',f(),m)).status,409);r=(await req('record','GET',null,m)).data.record;});
await test('File downloads enforce assigned-doctor/owner access',async()=>{assert.equal((await req('files/'+fid,'GET',null,doctor)).status,200);for(const a of [m2,coord,admin])assert.equal((await req('files/'+fid,'GET',null,a)).status,404);});
await test('Concurrent payment requests create only one open order; price is server-owned',async()=>{const results=await Promise.all([req('payment','POST',{amount:1},m),req('payment','POST',{amount:1},m)]);assert.ok(results.some(x=>x.status===200));const rows=(await req('record','GET',null,m)).data.orders;assert.equal(rows.length,1);order=rows[0];assert.equal(order.amountRial,12000000);assert.equal((await req('payment','POST',{},m)).data.id,order.id);});
await test('Forged successful callback does not activate demo entitlement',async()=>{await req('payment/callback?Authority=forged&Status=OK');assert.equal((await req('record','GET',null,m)).data.orders[0].status,'pending');});
await test('Demo completion and paid submission work',async()=>{assert.equal((await req('payment/demo','POST',{id:order.id,result:'paid'},m)).status,200);assert.equal((await req('record/submit','POST',{version:r.version},m)).status,200);r=(await req('record','GET',null,m)).data.record;assert.equal(r.status,'submitted');});
await test('Submitted records reject member edits',async()=>assert.equal((await req('record','PUT',{version:r.version,answers:r.answers},m)).status,409));
await test('Coordinator cannot publish clinical plans',async()=>assert.equal((await req('staff/review','POST',{userId:m.id,action:'publish'},coord)).status,403));
await test('Unassigned clinician cannot open another doctor’s file',async()=>{await db.prepare("INSERT INTO pilot_users VALUES ('other-doctor','09000000019','Other doctor','clinician',1,NULL,?)").bind(Date.now()).run();const other=await login('09000000019');assert.equal((await req('record?user='+m.id,'GET',null,other)).status,404);});
await test('Doctor can request information and member resubmits without another payment',async()=>{assert.equal((await req('staff/review','POST',{userId:m.id,version:r.version,action:'request_information',note:'لطفاً هدف ساختگی آزمون را بازبینی کنید.'},doctor)).status,200);r=(await req('record','GET',null,m)).data.record;assert.equal(r.status,'needs_information');assert.equal((await req('record/submit','POST',{version:r.version},m)).status,200);r=(await req('record','GET',null,m)).data.record;});
await test('Concurrent publication produces one immutable plan version',async()=>{const b={userId:m.id,version:r.version,action:'publish',summary:'این جمع‌بندی صرفاً برای آزمون نرم‌افزار با داده ساختگی نوشته شده است.',actions:[{title:'آزمون ثبت پیشرفت',reason:'این اقدام فقط آزمون نرم‌افزار است.',due:new Date(Date.now()+7*86400000).toISOString().slice(0,10),owner:'member'}]};const results=await Promise.all([req('staff/review','POST',b,doctor),req('staff/review','POST',b,doctor)]);assert.equal(results.filter(x=>x.status===200).length,1);const d=(await req('record','GET',null,m)).data;assert.equal(d.plans.length,1);assert.equal(d.record.status,'published');pid=d.plans[0].id;actionId=d.plans[0].actions[0].id;});
await test('Team referral requires consent, is idempotent and completion updates only the linked action',async()=>{
  const before=(await req('record','GET',null,m)).data;
  await req('staff/review','POST',{userId:m.id,version:before.record.version,action:'reopen',note:'آزمون ارجاع تیم هماهنگی از برنامه پزشک'},doctor);
  let rec=(await req('record','GET',null,m)).data.record;
  await req('record/submit','POST',{version:rec.version},m);rec=(await req('record','GET',null,m)).data.record;
  const actions=[...before.plans[0].actions,{title:'هماهنگی نوبت ساختگی',reason:'آزمون ارجاع تیم',due:new Date(Date.now()+86400000).toISOString().slice(0,10),owner:'team'}];
  await db.prepare('UPDATE pilot_records SET coordination_consent=0 WHERE user_id=?').bind(m.id).run();
  const body={userId:m.id,version:rec.version,action:'publish',summary:'جمع‌بندی ساختگی برای آزمون پیگیری کامل ارجاع به تیم.',actions};
  assert.equal((await req('staff/review','POST',body,doctor)).status,422);
  await db.prepare('UPDATE pilot_records SET coordination_consent=1 WHERE user_id=?').bind(m.id).run();
  assert.equal((await req('staff/review','POST',body,doctor)).status,200);
  const current=(await req('record','GET',null,m)).data;pid=current.plans[0].id;actionId=current.plans[0].actions[0].id;
  const teamAction=current.plans[0].actions[1];
  assert.equal((await req('actions','POST',{planId:pid,actionId:teamAction.id,done:true},m)).status,404);
  for(let i=0;i<2;i++)assert.equal((await req('staff/handoff','POST',{userId:m.id},doctor)).status,200);
  const queue=(await req('staff/queue','GET',null,coord)).data.tasks;
  assert.equal(queue.filter(t=>t.action_id===teamAction.id).length,1);const task=queue.find(t=>t.action_id===teamAction.id);
  assert.ok(!('answers' in task));assert.ok(!('summary' in task));
  assert.equal((await req('staff/handoff','POST',{userId:m.id},coord)).status,403);
  assert.equal((await req('staff/booking','POST',{id:task.id,status:'completed'},coord)).status,409);
  await req('staff/booking','POST',{id:task.id,status:'contacted'},coord);
  await req('staff/booking','POST',{id:task.id,status:'confirmed',provider:'مرکز ساختگی',scheduledAt:'زمان ساختگی',reference:'TEAM-TEST',centerConsent:true},coord);
  const completed=await Promise.all([req('staff/booking','POST',{id:task.id,status:'completed',note:'انجام نوبت ساختگی پیگیری شد'},coord),req('staff/booking','POST',{id:task.id,status:'completed'},coord)]);
  assert.equal(completed.filter(r=>r.status===200).length,1);
  const updates=(await req('record','GET',null,m)).data.updates.filter(u=>u.action_id===teamAction.id);assert.equal(updates.length,1);assert.equal(updates[0].done,1);
});
await test('Action progress is persisted independently of approved plan',async()=>{assert.equal((await req('actions','POST',{planId:pid,actionId,done:true,evidence:'test'},m)).status,200);const d=(await req('record','GET',null,m)).data;assert.equal(d.updates.find(u=>u.action_id===actionId).done,1);assert.equal(d.plans[0].actions[0].done,false);});
await test('Booking needs consent and cannot skip confirmation prerequisites',async()=>{assert.equal((await req('booking','POST',{title:'خدمت ساختگی',preferred:'شهر ساختگی'},m)).status,422);assert.equal((await req('booking','POST',{title:'خدمت ساختگی',preferred:'هفته آینده، شهر ساختگی',consent:true},m)).status,200);const t=(await req('staff/queue','GET',null,coord)).data.tasks[0];taskId=t.id;assert.equal((await req('staff/booking','POST',{id:t.id,status:'confirmed'},coord)).status,409);assert.equal((await req('staff/booking','POST',{id:t.id,status:'contacted'},coord)).status,200);assert.equal((await req('staff/booking','POST',{id:t.id,status:'confirmed'},coord)).status,422);});
await test('Coordinator confirmation is visible to member with provider reference',async()=>{assert.equal((await req('staff/booking','POST',{id:taskId,status:'confirmed',provider:'مرکز ساختگی',scheduledAt:'زمان ساختگی',reference:'TEST-001',centerConsent:true},coord)).status,200);assert.equal((await req('record','GET',null,m)).data.tasks[0].reference,'TEST-001');});
await test('Home-visit location requires confirmation and valid coordinates',async()=>{
 const body={title:'خدمت ساختگی در محل',preferred:'شهر ساختگی فردا',consent:true,homeVisit:true,location:{address:'آدرس ساختگی برای آزمون',unit:'۱',entrance:'ورودی آزمایشی',latitude:35.7,longitude:51.4,confirmed:false}};
 assert.equal((await req('booking','POST',body,m)).status,422);
 assert.equal((await req('booking','POST',{...body,location:{...body.location,confirmed:true,latitude:91}},m)).status,422);
 assert.equal((await req('booking','POST',{...body,location:{...body.location,confirmed:true}},m)).status,200);
 const own=(await req('record','GET',null,m)).data.tasks.find(t=>t.address);
 assert.equal(own.address,body.location.address);
 assert.ok(!(await req('record?user='+m.id,'GET',null,doctor)).data.tasks.some(t=>t.address),'Clinical access does not expose location');
 assert.ok(!(await req('record','GET',null,m2)).data.tasks.some(t=>t.address),'Other members cannot read locations');
 const t=(await req('staff/queue','GET',null,coord)).data.tasks.find(t=>t.id===own.id);
 assert.equal(t.latitude,'35.7');
 assert.equal((await req('staff/booking','POST',{id:t.id,status:'cancelled'},coord)).status,200);
 const final=(await req('record','GET',null,m)).data.tasks.find(x=>x.id===t.id);
 assert.equal(final.latitude,null);assert.equal(final.longitude,null);assert.equal(final.address,body.location.address);
});
await test('Manual address works without coordinates',async()=>{
 const body={title:'درخواست آدرس دستی',preferred:'شهر ساختگی فردا',consent:true,homeVisit:true,location:{address:'نشانی دستی و ساختگی',confirmed:true}};
 assert.equal((await req('booking','POST',body,m)).status,200);
 const row=(await req('record','GET',null,m)).data.tasks.find(t=>t.address===body.location.address);
 assert.equal(row.latitude,null);assert.equal(row.longitude,null);
});
await test('Support response and data-deletion request remain tracked as open',async()=>{assert.equal((await req('feedback','POST',{kind:'deletion',message:'درخواست ساختگی برای آزمون رسیدگی',page:'support'},m)).status,200);const f=(await req('staff/queue','GET',null,admin)).data.feedback[0];assert.equal((await req('staff/feedback','POST',{id:f.id,reply:'درخواست در صف بررسی است.',resolved:false},admin)).status,200);assert.equal((await req('record','GET',null,m)).data.feedback[0].status,'open');});
await test('Urgent response blocks payment and enters doctor queue',async()=>{const x=(await req('record','GET',null,m2)).data.record;await req('record','PUT',{version:x.version,profile:r.profile,answers:{...r.answers,urgent_chest_pain:'yes'},consent:true},m2);assert.equal((await req('payment','POST',{},m2)).status,409);const members=(await req('staff/queue','GET',null,doctor)).data.members;assert.equal(members.find(x=>x.id===m2.id).urgent,1);});
await test('Correcting answers cannot close an unresolved urgent alert',async()=>{const x=(await req('record','GET',null,m2)).data.record;assert.equal((await req('record','PUT',{version:x.version,answers:{...x.answers,urgent_chest_pain:'no'}},m2)).status,200);assert.equal((await req('payment','POST',{},m2)).status,409);});
await test('Oversized JSON is rejected before parsing',async()=>assert.equal((await req('feedback','POST',{kind:'issue',message:'x'.repeat(60000)},m)).status,413));
await test('Invite capacity is enforced under concurrent requests',async()=>{const count=(await db.prepare("SELECT count(*) n FROM pilot_users WHERE role='member'").first()).n;for(let i=count;i<49;i++)await db.prepare("INSERT INTO pilot_users VALUES (?,?,?,'member',1,'demo-clinician-11',?)").bind('capacity-'+i,'0919000'+String(i).padStart(4,'0'),'Synthetic capacity '+i,Date.now()).run();const rs=await Promise.all(['09199999001','09199999002'].map(phone=>req('staff/invite','POST',{name:'Synthetic capacity',phone,clinicianId:doctor.id},admin)));assert.equal(rs.filter(x=>x.status===200).length,1);assert.equal((await db.prepare("SELECT count(*) n FROM pilot_users WHERE role='member'").first()).n,50);});
await test('Suspension revokes access and reassigning changes clinician access',async()=>{assert.equal((await req('staff/member','POST',{id:m2.id,active:false,clinicianId:'other-doctor'},admin)).status,200);assert.equal((await req('record','GET',null,m2)).status,401);assert.equal((await req('record?user='+m2.id,'GET',null,doctor)).status,404);});
await test('Reopening a plan preserves the published version',async()=>{const d=(await req('record','GET',null,m)).data;assert.equal((await req('staff/review','POST',{userId:m.id,version:d.record.version,action:'reopen',note:'بازبینی ساختگی برای آزمون حفظ نسخه قبلی'},doctor)).status,200);const n=(await req('record','GET',null,m)).data;assert.equal(n.record.status,'needs_information');assert.equal(n.plans[0].id,pid);});
await test('Real-adapter callback verifies stored amount; code 101 is idempotent',async()=>{
 const live={...c,mode:'live',ready:true,clinicalApproved:true,authSecret:'a'.repeat(40),merchant:'test-merchant',smsKey:'test',smsTemplate:'test',staffTotp:{'09000000011':'test'},consentVersion:'approved-test',consentBody:'test-approved-text',scanUrl:'https://scanner.test',scanToken:'test'};
 const authority='A'+'1'.repeat(35),oid='live-synthetic-order';
 await db.prepare('INSERT INTO pilot_orders(id,user_id,amount_rial,pricing_version,mode,status,authority,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(oid,m.id,12000000,'test','live','pending',authority,oid,Date.now(),Date.now()).run();
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://payment.zarinpal.com/pg/v4/payment/verify.json');const b=JSON.parse(options.body);assert.equal(b.amount,12000000);assert.equal(b.authority,authority);return Response.json({data:{code:101,ref_id:'synthetic-reference'}});};
 try{assert.equal((await req('payment/callback?Authority='+authority+'&Status=OK&amount=1','GET',null,{}, {},live)).status,303);await req('payment/callback?Authority='+authority+'&Status=OK','GET',null,{}, {},live);assert.equal(calls,1);assert.equal((await db.prepare('SELECT status FROM pilot_orders WHERE id=?').bind(oid).first()).status,'paid');}finally{globalThis.fetch=original;}
});
await test('Failed provider verification remains unresolved, regardless of callback Status',async()=>{
 const live={...c,mode:'live',ready:true,clinicalApproved:true,authSecret:'a'.repeat(40),merchant:'test',smsKey:'test',smsTemplate:'test',staffTotp:{'09000000011':'test'},consentVersion:'approved-test',consentBody:'test',scanUrl:'https://scanner.test',scanToken:'test'};
 const authority='A'+'2'.repeat(35),oid='live-failed-order';await db.prepare('INSERT INTO pilot_orders(id,user_id,amount_rial,pricing_version,mode,status,authority,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(oid,m2.id,12000000,'test','live','pending',authority,oid,Date.now(),Date.now()).run();
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({errors:{code:-51}});try{await req('payment/callback?Authority='+authority+'&Status=OK','GET',null,{}, {},live);assert.equal((await db.prepare('SELECT status FROM pilot_orders WHERE id=?').bind(oid).first()).status,'reconciliation');}finally{globalThis.fetch=original;}
});
await test('Logout revokes the server session',async()=>{assert.equal((await req('auth/logout','POST',{},m)).status,200);assert.equal((await req('record','GET',null,m)).status,401);});
}finally{await mkdir('../review-evidence',{recursive:true});await writeFile('../review-evidence/api-tests.json',JSON.stringify({generatedAt:new Date().toISOString(),environment:'ephemeral Miniflare D1/R2; synthetic data only; no real provider calls',tests:report},null,2));await mf.dispose();}
