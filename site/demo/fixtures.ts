import fixtures from './fixtures/cases.json';
import { policyText, clinicalConsentText, sampleAccounts, validateProfile, type Role } from '../lib/pilot/domain';
import {cleanAnswers} from '../lib/pilot/intake';
import { hash } from '../lib/pilot/crypto';
import type { BrowserDatabase } from './storage';

export const demoFixtures = fixtures;
export const demoCases = fixtures.cases;
export const completeAccounts = [
  ...sampleAccounts.filter(account => account.role !== 'member'),
  ...demoCases.map(person => ({phone:person.phone,name:person.name,role:'member' as Role})),
];

/** Seed once, atomically. Assets are genuine downloadable fictional files, not empty links.
 * Existing snapshots are never reseeded: edits and workflow actions survive reloads.
 */
export async function seedCompleteDemo(database:BrowserDatabase, files:Record<string,Blob>, base:URL) {
  for(const person of demoCases){validateProfile(person.profile);cleanAnswers(person.answers,true);}
  const fixtureHash=await hash(JSON.stringify(fixtures));
  const manifestResponse=await fetch(new URL(`demo/documents/manifest.json?v=${fixtureHash.slice(0,12)}`,base));
  if(!manifestResponse.ok)throw new Error('فهرست مدارک نمونه دریافت نشد. دوباره تلاش کنید.');
  const manifest=await manifestResponse.json() as {fixtureVersion:string;fixturesSha256:string;files:Record<string,{sha256:string}>};
  if(manifest.fixtureVersion!==fixtures.fixtureVersion||manifest.fixturesSha256!==fixtureHash)throw new Error('نسخه مدارک با پرونده‌های دمو هماهنگ نیست.');
  const loaded=await Promise.all(demoCases.flatMap(person=>person.documents.map(async doc=>{
    const response=await fetch(new URL(`${doc.path}?v=${manifest.files[doc.path]?.sha256.slice(0,12)}`,base));
    if(!response.ok)throw new Error('دریافت یکی از مدارک نمونه کامل نشد.');
    const bytes=await response.arrayBuffer();
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
    if(digest!==manifest.files[doc.path]?.sha256)throw new Error('مدرک نمونه با فهرست کنترل نسخه همخوان نیست.');
    return {doc,person,blob:new Blob([bytes],{type:doc.mime}),digest};
  })));
  const consentHash=await hash(policyText+clinicalConsentText);
  const consentVersion='demo-history-consent-v1';
  const run=(sql:string,...values:(string|number|null)[])=>database.sqlite.run(sql,values);
  const anchor=Date.parse(fixtures.asOf+'T09:00:00Z');
  database.sqlite.run('PRAGMA foreign_keys=ON; BEGIN');
  try {
    for(const account of completeAccounts){
      const person=demoCases.find(p=>p.phone===account.phone);
      run('INSERT INTO pilot_users(id,phone,name,role,clinician_id,created_at) VALUES (?,?,?,?,?,?)',
        `demo-${account.role}-${account.phone.slice(-2)}`,account.phone,account.name,account.role,
        account.role==='member'?'demo-clinician-11':null,person?.createdAt??anchor-400*86400000);
    }
    for(const person of demoCases){
      const latest=person.plans.at(-1);
      const status=['completed','active'].includes(person.state)?'published':person.state==='urgent'?'draft':person.state;
      const submitted=person.state!=='draft'&&person.state!=='urgent';
      run('INSERT INTO pilot_records(user_id,profile,answers,step,status,version,consent_version,consent_hash,consent_at,coordination_consent,urgent,information_request,submitted_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        person.id,JSON.stringify(person.profile),JSON.stringify(person.answers),person.state==='urgent'?2:5,status,(latest?.recordVersion??0)+1,
        consentVersion,consentHash,person.createdAt,1,person.state==='urgent'?1:0,
        person.state==='needs_information'?'لطفاً تصویر خوانا از تمام برگه آزمایش، با تاریخ و واحد اندازه‌گیری، اضافه و پرونده را دوباره ارسال کنید.':null,
        submitted?(latest?.publishedAt??anchor-86400000)-3600000:null,anchor);
      if(submitted){
        run('INSERT INTO pilot_orders(id,user_id,amount_rial,pricing_version,mode,status,reference,idempotency_key,paid_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          `${person.id}-payment`,person.id,12000000,'demo-price','demo','paid',`DEMO-${person.phone.slice(-2)}-PAID`,`${person.id}-seed-payment`,person.createdAt+3600000,person.createdAt+1800000,person.createdAt+3600000);
      }
      for(const plan of person.plans){
        run('INSERT INTO pilot_plans VALUES (?,?,?,?,?,?,?,?,?)',plan.id,person.id,plan.version,'demo-clinician-11',plan.recordVersion,
          JSON.stringify({profile:person.profile,answers:person.answers,consentVersion}),plan.summary,JSON.stringify(plan.actions),plan.publishedAt);
        for(const [index,action] of plan.actions.entries()){
          const done=plan.completed.includes(action.id);
          const at=Math.min(anchor-3600000,plan.publishedAt+(index+2)*86400000);
          if(done)run('INSERT INTO pilot_action_updates VALUES (?,?,?,?,?,?,?)',`${action.id}-done`,person.id,plan.id,action.id,1,
            action.owner==='team'?'مراجعه نمونه انجام شد؛ گزارش در پرونده ثبت شده است.':'گزارش فرضی عضو: اقدام انجام شد و یادداشت پیگیری ثبت شد.',at);
          if(action.owner==='team'){
            const tid=`${plan.id}:${action.id}`;
            const taskStatus=done?'completed':person.id.endsWith('56')?'requested':'confirmed';
            run('INSERT INTO pilot_tasks(id,user_id,kind,status,title,preferred,provider,scheduled_at,reference,note,assigned_to,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
              tid,person.id,'booking',taskStatus,action.title,`${person.profile.city} · موعد اقدام: ${action.due}`,
              taskStatus==='requested'?null:'مرکز نمونه آبی — ساختگی',taskStatus==='requested'?null:action.due+' ساعت ۱۰:۰۰',
              taskStatus==='requested'?null:`DEMO-BOOK-${person.phone.slice(-2)}-${plan.version}`,
              done?'مراجعه نمونه انجام شد؛ رضایت همین هماهنگی ثبت شده بود.':taskStatus==='requested'?'کارشناس باید برای تعیین مرکز و زمان با عضو تماس بگیرد.':'مرکز و زمان نمونه با رضایت عضو تأیید شده‌اند.',
              'demo-coordinator-12',plan.publishedAt,done?at:plan.publishedAt+3600000);
            run('INSERT INTO pilot_task_actions VALUES (?,?,?)',tid,plan.id,action.id);
            run('INSERT INTO pilot_audit VALUES (?,?,?,?,?,?,?)',`${tid}-audit`,'demo-coordinator-12',person.id,done?'booking_completed':taskStatus==='confirmed'?'booking_confirmed':'booking_requested',tid,'success',done?at:plan.publishedAt);
          }
        }
        run('INSERT INTO pilot_audit VALUES (?,?,?,?,?,?,?)',`${plan.id}-audit`,'demo-clinician-11',person.id,'plan_published',plan.id,'success',plan.publishedAt);
      }
      if(person.state==='urgent')run("INSERT INTO pilot_tasks(id,user_id,kind,status,title,created_at,updated_at) VALUES (?,?,'urgent','open','بررسی گزارش علامت هشدار توسط پزشک',?,?)",`${person.id}-urgent`,person.id,anchor,anchor);
      if(person.id==='demo-member-55')run("INSERT INTO pilot_tasks(id,user_id,kind,status,title,preferred,note,assigned_to,created_at,updated_at) VALUES (?,?,'booking','contacted',?,?,?,'demo-coordinator-12',?,?)",`${person.id}-member-booking`,person.id,'هماهنگی نوبت دوم نمونه',`${person.profile.city} · هفته آینده`,'تماس اولیه نمونه انجام شده؛ مرکز و زمان باید با رضایت عضو تعیین شوند.',anchor-2*86400000,anchor-86400000);
      if(person.state==='needs_information')run('INSERT INTO pilot_audit VALUES (?,?,?,?,?,?,?)',`${person.id}-information`,'demo-clinician-11',person.id,'information_requested',person.id,'success',anchor-86400000);
      if(person.ageDays>=365||person.state==='needs_information')run('INSERT INTO pilot_feedback VALUES (?,?,?,?,?,?,?,?,?)',`${person.id}-feedback`,person.id,'issue','چطور می‌توانم نسخه‌های قبلی برنامه و مدارک را ببینم؟','account',person.state==='needs_information'?'open':'resolved',person.state==='needs_information'?null:'نسخه‌های قبلی در سابقه همراهی و مدارک در بخش مدارک پزشکی دیده می‌شوند.',anchor-5*86400000,anchor-4*86400000);
    }
    for(const {person,doc,blob,digest} of loaded){
      const key=`pilot/${person.id}/${doc.id}`;
      run('INSERT INTO pilot_files VALUES (?,?,?,?,?,?,?,?,?)',doc.id,person.id,key,doc.name,doc.mime,blob.size,digest,'demo_only',doc.createdAt);
      files[key]=blob;
    }
    database.sqlite.run('COMMIT');
  }catch(error){database.sqlite.run('ROLLBACK');throw error;}
}
