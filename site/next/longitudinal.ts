import type {CareCase,Plan} from './model';
import {stories,historicalDocs} from './fixture-stories';
import manifest from './documents/manifest.json';
import {localDay} from './care';
const day=864e5;
export function enrichPrepared(c:CareCase,now:number){
 for(const referral of c.care?.referrals||[])if(['attended','reported','closed'].includes(referral.status))referral.date=localDay(new Date(now-3*day));
 const story=stories.find(s=>s.phone===c.phone);if(!story)return c;
 c.seedRevision=2;c.answers={...c.answers,city:story.city,conditions:[story.condition],goal:story.goal,medicines:'yes',weight:String(story.weights[3])};
 c.care!.history={...c.care!.history,other:story.concern,medicines:'نام و فهرست داروهای نسخهٔ قبلی در ملاقات فرضی مرور شده؛ این نمونه دستور مصرف ندارد.',allergies:'در ملاقات فرضی مرور شده؛ برای استفادهٔ واقعی باید دوباره تأیید شود.'};
 const plans:Plan[]=[];
 for(let k=0;k<3;k++){
  const at=now-[330,240,140][k]*day,id=`history-${c.phone}-plan-${k}`;
  plans.push({id,createdAt:at,doctor:c.doctor,summary:`${story.milestones[k]}. ${story.focus}. در این دوره، پرسش‌های بیمار، گزارش مرتبط و نتیجهٔ هماهنگی در کنار هم مرور شدند. ${k===2?'مانع زمان‌بندی با کمک کارشناس و تأیید بیمار برطرف شد.':'جمع‌بندی با بیمار مطرح و قدم بعدی توافق شد.'} این سناریو ساختگی است؛ پایان اقدام به معنی رفع بیماری نیست.`,actions:[
   {id:id+'-a',title:k===0?'جمع‌آوری گزارش‌های قبلی':k===1?'ثبت پرسش‌ها و تجربهٔ روزمره':'آماده‌کردن پرسش‌های مراجعه',why:story.concern,owner:'member',due:'در پایان همین دوره',dueAt:localDay(new Date(at+7*day)),done:true},
   {id:id+'-b',title:k===0?'هماهنگی اولین مرور با پزشک':k===1?'دریافت گزارش دوره و رساندن به پزشک':'هماهنگی مراجعه و برگشت جمع‌بندی',why:'قدم هماهنگی تا دریافت نتیجه دنبال شود.',owner:'team',due:'طبق توافق همان دوره',dueAt:localDay(new Date(at+10*day)),done:true}
  ]});
  c.tasks.push({id:id+'-visit',kind:'visit',title:story.milestones[k],why:story.focus,owner:c.coordinator,status:'completed',date:localDay(new Date(at+3*day)),time:'10:00',place:'ملاقات آنلاین ساختگی',mode:'online',contactNote:'زمان در همان دوره با بیمار تأیید شده بود.',outcome:'ملاقات فرضی انجام شد؛ خلاصه و برنامه در همین دوره ثبت شدند.'});
  c.care!.encounters.unshift({id:id+'-encounter',doctor:c.doctor,draft:'',summary:plans[k].summary,versions:[{id:id+'-signed',note:`یادداشت خصوصی ساختگی دوره ${k+1}؛ مرور سابقه، پرسش‌ها و مدارک بیمار.`,summary:plans[k].summary,signedAt:at+3*day,doctor:c.doctor}]});
 }
 const latest=c.plans.at(-1);if(latest){latest.summary=story.phone==='09000000004'?'اصل گزارش قبلی و توضیح آن محفوظ است. نسخهٔ اصلاح‌شده رسیده و بررسی تازهٔ آن با پزشک پرونده است؛ پرسش‌های شما کنار همان نسخه ثبت می‌شود.':`${story.focus}. گزارش این دوره و پرسش‌های شما با پزشک مرور شدند. کارهای توافق‌شده ثبت شده و جمع‌بندی مراجعه در پرونده قرار دارد؛ دورهٔ بعد بر اساس گفت‌وگوی بعدی تنظیم می‌شود.`;latest.actions[0].title=story.phone==='09000000004'?'پرسش‌های گزارش اصلاح‌شده را برای پزشک بنویسید':'ثبت‌ها و پرسش‌های این دوره را برای مرور آماده کنید';latest.actions[0].why=story.concern;latest.actions[1].title='اصل گزارش دوره در پرونده دریافت شود';latest.actions[1].why='پزشک اصل و منبع گزارش را همراه سابقه ببیند.';}
 c.plans=[...plans,...c.plans];
 c.measurements=story.weights.map((value,k)=>({at:now-[320,230,130,90][k]*day,kind:'weight' as const,value,unit:'کیلوگرم',sourceFileId:`history-${c.phone}-${k===0?'consult':k===1?'lab':k===2?'visit':'home'}`}));
 for(const doc of historicalDocs){
  const id=`history-${c.phone}-${doc.key}`,filename=`history-${c.phone.slice(-2)}-${doc.key}.${doc.key==='home'?'png':'pdf'}`,meta=(manifest.files as Record<string,{bytes:number;sha256:string}>)[filename],at=now-doc.days*day;
  if(!meta)throw Error('Missing generated historical document '+filename);
  const explanation=`${doc.title} در ارتباط با «${story.focus}» در ملاقات همان دوره مرور شد. پرسش‌های بیمار پاسخ داده شد و جمع‌بندی در برنامهٔ دوره محفوظ است. اعداد و نام‌های این مدرک صرفاً برای نمایش‌اند و مبنای تصمیم پزشکی نیستند.`;
  c.files.push({id,name:`${doc.title} — ${c.name} — ساختگی.${doc.key==='home'?'png':'pdf'}`,mime:doc.key==='home'?'image/png':'application/pdf',bytes:meta.bytes,checksum:meta.sha256,createdAt:at,source:'fixture',fixture:'./demo/documents/'+filename,reviewState:'published',review:{doctor:c.doctor,text:explanation,at:at+day}});
  c.care!.reports.push({fileId:id,provider:'مرکز مراقبت ساختگی آبی',externalId:id,quarantined:false,checksum:meta.sha256,reportedAt:at});
  c.care!.reviews.push({fileId:id,doctor:c.doctor,note:'یادداشت خصوصی نمونهٔ مرور همین نسخه.',explanation,signedAt:at+day,publishedAt:at+day,delivery:'delivered',attempts:1,ackAt:at+2*day,followup:''});
 }
 c.messages=Array.from({length:6},(_,k)=>({id:`history-${c.phone}-message-${k}`,at:now-[315,314,225,224,125,124][k]*day,author:k%2?c.doctor:c.phone,role:k%2?'clinician':'member',text:k%2?['گزارش‌های قبلی کنار سابقه قرار گرفتند؛ پرسش‌هایی که فرستادید در ملاقات مرور می‌کنیم.','ثبت‌ها را دیدم؛ توضیح مربوط به همین گزارش در سابقهٔ شما منتشر شده است.','جمع‌بندی مراجعه برگشته و در برنامهٔ دوره قرار گرفته؛ اگر زمان‌بندی برایتان دشوار است به کارشناس بگویید.'][Math.floor(k/2)]:[story.concern,'ثبت‌های این دوره را اضافه کردم؛ می‌خواهم تفاوت آن با گزارش قبلی را در ملاقات بپرسم.','زمان پیشنهادی برایم مناسب شد و برای مرور جمع‌بندی آماده‌ام.'][Math.floor(k/2)]}));
 c.events=c.events.filter(e=>!e.id.includes('-month-')).concat(plans.map((p,k)=>({id:p.id+'-event',at:p.createdAt,title:story.milestones[k],actor:'پزشک پرونده',kind:'doctor' as const}))).sort((a,b)=>a.at-b.at);
 return c;
}
/** Only pristine, untouched v3.1 fixtures qualify. Every user mutation increments version. */
export function upgradePrepared(existing:CareCase[],seed:CareCase[]){
 const untouched:Record<string,number>={'09000000003':19,'09000000004':20,'09000000005':19};
 let changed=false;const cases=existing.map(c=>{const s=seed.find(s=>s.phone===c.phone);if(s?.seedRevision===2&&!c.seedRevision&&c.version===untouched[c.phone]&&c.files.length===(c.phone==='09000000004'?2:1)&&c.messages.length===0){changed=true;return {...s,version:c.version+1};}return c;});
 for(const s of seed)if(!cases.some(c=>c.phone===s.phone)){cases.push(s);changed=true;}
 return {cases,changed};
}
