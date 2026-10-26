// Connected local demonstration. UI permissions are not server authentication.
const STAFF_SESSION='salamatban.journey.v4.staff';
const STAFF_ACCOUNTS=[...doctorData.map((d,i)=>({id:d.id,name:d.name,role:'doctor',phone:'0900000001'+(i+1),code:String(i+4).repeat(6)})),{id:'coord1',name:'نگار محمدی · کارشناس',role:'coordinator',phone:'09000000021',code:'777777'},{id:'coord2',name:'علی رضایی · کارشناس',role:'coordinator',phone:'09000000022',code:'888888'}];
const staffMode=new URLSearchParams(location.search).get('staff')==='1',loginAccounts=staffMode?STAFF_ACCOUNTS:ACCOUNTS;
let staffActor=null,workRecords=[],workSelected=null,workFilter='action',workBusy=false,workDirty=false,workURLs=[];
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const accountName=id=>ACCOUNTS.find(a=>a.id===id)?.name||STAFF_ACCOUNTS.find(a=>a.id===id)?.name||id;
const careOf=r=>r.care||{encounters:[],tasks:[]};
const taskNames={requested:'شروع هماهنگی',contacted:'پیشنهاد زمان',proposed:'منتظر تایید بیمار',confirmed:'پیگیری مراجعه',visited:'منتظر دریافت گزارش',reported:'منتظر بررسی پزشک',closed:'نتیجه ثبت شده'};
const todayIR=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const prettyDate=s=>s?dateFmt.format(new Date(s.slice(0,10)+'T12:00:00Z')):'بدون تاریخ';
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function need(ok,message){if(!ok)throw Error(message)}
function needed(value,label){const v=String(value||'').trim();need(v.length>0&&v.length<=4000,label+' را کامل کن (حداکثر ۴۰۰۰ حرف).');return v}
function allUsers(){return new Promise((resolve,reject)=>{const q=db.transaction('users').objectStore('users').getAll();q.onsuccess=()=>resolve(q.result.filter(r=>ACCOUNTS.some(a=>a.id===r.id)));q.onerror=()=>reject(q.error)})}
function workflowWrite(record,command,fields={},file=null){
 const actor=staffActor||{id:currentUser?.id,role:'member'};
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['users','documents'],'readwrite'),store=tx.objectStore('users'),req=store.get(record.id);let result,problem;
  req.onsuccess=()=>{try{
   const r=req.result;need(r&&r.generation===record.generation&&r.revision===record.revision,'پرونده در پنجره دیگری تغییر کرده است. تازه سازی کن و دوباره تلاش کن.');
   const care=r.care??={encounters:[],tasks:[]};const doctor=actor.role==='doctor'&&r.appointment?.doctorId===actor.id,member=actor.role==='member'&&actor.id===r.id;
   const task=care.tasks.find(t=>t.id===fields.taskId);const coord=actor.role==='coordinator'&&task?.assignee===actor.id;
   const now=new Date().toISOString();
   if(command==='draft'||command==='publish'){
    need(doctor,'این پرونده به پزشک دیگری مربوط است.');
    const entry={summary:String(fields.summary||'').trim(),known:String(fields.known||'').trim(),unknown:String(fields.unknown||'').trim(),next:String(fields.next||'').trim(),due:fields.due||'',kind:fields.kind||'none',title:String(fields.title||'').trim(),why:String(fields.why||'').trim(),assignee:fields.assignee||'coord1',doctor:actor.id,at:now};
    need(Object.values(entry).every(v=>String(v).length<=4000),'متن بیش از حد طولانی است.');
    if(command==='draft'){care.draft=entry}else{
     needed(entry.summary,'خلاصه جلسه');needed(entry.next,'قدم بعد');need(fields.occurred==='on','برگزاری جلسه نمونه را تایید کن.');need(validDate(entry.due)&&entry.due>=todayIR(),'موعد پیگیری باید امروز یا آینده باشد.');need(['none','visit','test'].includes(entry.kind),'نوع اقدام نامعتبر است.');
     const encounter={...entry,id:crypto.randomUUID(),appointment:{...r.appointment}};
     if(entry.kind!=='none'){
      needed(entry.title,'عنوان درخواست');needed(entry.why,'دلیل درخواست');need(STAFF_ACCOUNTS.some(a=>a.id===entry.assignee&&a.role==='coordinator'),'کارشناس را انتخاب کن.');
      care.tasks.push({id:crypto.randomUUID(),encounterId:encounter.id,doctor:actor.id,assignee:entry.assignee,title:entry.title,why:entry.why,kind:entry.kind,due:entry.due,status:'requested',history:[{at:now,actor:actor.id,text:'درخواست پزشک ثبت شد'}]});
     }
     care.encounters.push(encounter);delete care.draft;
    }
   }else{
    need(task,'درخواست پیدا نشد.');
    if(command==='contact'){
     need(coord&&['requested','contacted'].includes(task.status),'امکان ثبت تماس در این مرحله نیست.');task.contact=needed(fields.note,'نتیجه تماس');task.status='contacted';task.issue=null;
    }else if(command==='propose'){
     need(coord&&task.status==='contacted','ابتدا تماس را ثبت کن.');need(validDate(fields.date)&&fields.date>=todayIR()&&/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.time),'تاریخ و ساعت معتبر آینده انتخاب کن.');need(new Date(fields.date+'T'+fields.time+':00+03:30').getTime()>Date.now(),'زمان پیشنهادی گذشته است.');
     task.offer={date:fields.date,time:fields.time,place:needed(fields.place,'نام مرکز'),address:needed(fields.address,'آدرس'),phone:needed(fields.phone,'شماره تماس')};task.status='proposed';task.issue=null;
    }else if(command==='accept'||command==='decline'){
     need(member&&task.status==='proposed','زمان پیشنهادی در انتظار پاسخ شما نیست.');if(command==='accept'){need(new Date(task.offer.date+'T'+task.offer.time+':00+03:30')>new Date(),'زمان پیشنهادی گذشته است؛ درخواست زمان دیگری بده.');task.status='confirmed'}else{task.status='contacted';task.issue={reason:'بیمار زمان دیگری می‌خواهد',next:'با بیمار برای زمان دیگری هماهنگ کن',due:todayIR()}}
    }else if(command==='visited'){
     need(coord&&task.status==='confirmed','فقط مراجعه تایید شده قابل ثبت است.');task.visitNote=needed(fields.note,'نتیجه پیگیری مراجعه');task.status='visited';task.issue=null;
    }else if(command==='reschedule'){
     need(coord&&['proposed','confirmed'].includes(task.status),'این درخواست قابل زمان بندی دوباره نیست.');task.rescheduleReason=needed(fields.note,'دلیل هماهنگی دوباره');task.status='contacted';task.offer=null;task.issue=null;
    }else if(command==='report'){
     need(coord&&task.status==='visited'&&file,'ابتدا انجام مراجعه را ثبت کن و فایل گزارش را انتخاب کن.');
     const id=crypto.randomUUID();tx.objectStore('documents').put({key:r.id+':'+id,id,owner:r.id,generation:r.generation,name:file.name,size:file.blob.size,type:file.blob.type,modified:Date.now(),blob:file.blob,source:'coordinator',taskId:task.id});task.reportId=id;task.status='reported';task.issue=null;
    }else if(command==='review'){
     need(doctor&&task.status==='reported','گزارش در انتظار بررسی این پزشک نیست.');need(validDate(fields.due)&&fields.due>=todayIR(),'موعد پیگیری باید امروز یا آینده باشد.');task.review={due:fields.due,text:needed(fields.text,'توضیح نتیجه برای بیمار'),next:needed(fields.next,'قدم بعد'),doctor:actor.id,at:now};task.status='closed';
    }else if(command==='issue'){
     need(coord&&!['closed','reported'].includes(task.status),'این درخواست قابل پیگیری کارشناس نیست.');need(validDate(fields.due)&&fields.due>=todayIR(),'موعد تلاش بعدی باید امروز یا آینده باشد.');task.issue={reason:needed(fields.reason,'مانع'),next:needed(fields.next,'اقدام بعدی'),due:fields.due};
    }else throw Error('اقدام ناشناخته است.');
    const labels={contact:'تماس ثبت شد',propose:'زمان برای بیمار پیشنهاد شد',accept:'بیمار زمان را تایید کرد',decline:'بیمار زمان دیگری خواست',visited:'انجام مراجعه ثبت شد',report:'گزارش دریافت شد',review:'پزشک نتیجه را توضیح داد',issue:'مانع و پیگیری بعدی ثبت شد',reschedule:'هماهنگی زمان دوباره شروع شد'};
    task.history.push({at:now,actor:actor.id,text:labels[command]});
   }
   r.revision++;store.put(r);result=r;
  }catch(e){problem=e;tx.abort()}};
  tx.oncomplete=()=>{announceChange(record.id);resolve(result)};tx.onerror=()=>reject(problem||tx.error);tx.onabort=()=>reject(problem||Error('ذخیره انجام نشد.'));
 });
}
function workFeedback(text){$('work-feedback').textContent=text}
async function enterStaff(account){staffActor=account;currentUser=null;$('header-user').hidden=true;showOnly($('staff-scene'));$('staff-name').textContent=account.name;$('staff-title').textContent=account.role==='doctor'?'میزکار پزشک':'پیگیری های من';await refreshWork();$('staff-title').focus()}
async function refreshWork(){workRecords=await allUsers();workDirty=false;renderQueue();if(workSelected){const r=workRecords.find(r=>r.id===workSelected.owner);if(r&&canSee(r,workSelected.task))await openWork(r,workSelected.task);else{workSelected=null;renderQueue()}}}
function canSee(r,taskId){return staffActor?.role==='doctor'?r.appointment?.doctorId===staffActor.id:careOf(r).tasks.some(t=>t.id===taskId&&t.assignee===staffActor?.id)}
function doctorDue(r){const c=careOf(r),e=c.encounters.at(-1),review=c.tasks.map(t=>t.review).filter(Boolean).sort((a,b)=>b.at.localeCompare(a.at))[0];return review&&review.at>(e?.at||'')?review.due:e?.due||r.appointment.date}
function staffItems(){return staffActor.role==='doctor'?workRecords.filter(r=>r.appointment?.doctorId===staffActor.id).map(r=>({r,title:accountName(r.id),state:careOf(r).tasks.some(t=>t.status==='reported')?'گزارش منتظر بررسی':careOf(r).encounters.length?'ادامه پیگیری':'ثبت اولین جلسه',action:!careOf(r).encounters.length||careOf(r).tasks.some(t=>t.status==='reported')||doctorDue(r)<=todayIR(),due:doctorDue(r)})):workRecords.flatMap(r=>careOf(r).tasks.filter(t=>t.assignee===staffActor.id).map(t=>({r,t,title:t.title,state:taskNames[t.status],action:!['proposed','reported','closed'].includes(t.status),due:t.issue?.due||t.due}))) }
function renderQueue(){
 const items=staffItems(),filters=[['action','نیازمند اقدام',x=>x.action],['overdue','موعد گذشته',x=>x.action&&x.due<todayIR()],['all','همه',()=>true]];
 $('work-filters').innerHTML=filters.map(([id,title,test])=>`<button data-filter="${id}" aria-pressed="${workFilter===id}">${title}<b>${fa(items.filter(test).length)}</b></button>`).join('');
 $('work-filters').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(!leaveDraft())return;workFilter=b.dataset.filter;workSelected=null;renderQueue()});
 $('work-detail').hidden=true;$('work-list').hidden=false;releaseWorkURLs();
 const selected=items.filter(filters.find(f=>f[0]===workFilter)[2]).sort((a,b)=>a.due.localeCompare(b.due));
 $('work-list').innerHTML=selected.length?selected.map((x,i)=>`<button class="work-row" data-item="${i}"><span><strong>${esc(x.title)}</strong><small>${esc(x.t?accountName(x.r.id):prettyDate(x.r.appointment.date)+' · '+fa(x.r.appointment.time))}</small></span><span>${esc(x.t?x.t.why:'پاسخ ها، مدارک و قدم بعد بیمار')}<small>${x.due<todayIR()&&x.action?'موعد گذشته · ':''}${esc(prettyDate(x.due))}</small></span><span class="work-status">${esc(x.state)}</span><span aria-hidden="true">←</span></button>`).join(''):'<div class="work-empty">در این فهرست کاری نیست.<br><small>قرار بیمار در صف پزشک و درخواست پزشک در صف کارشناس ظاهر می‌شود.</small></div>';
 $('work-list').querySelectorAll('button').forEach(b=>b.onclick=()=>openWork(selected[+b.dataset.item].r,selected[+b.dataset.item].t?.id));
}
function leaveDraft(){return !workDirty||window.confirm('تغییرهای ذخیره نشده کنار گذاشته شوند؟')}
function releaseWorkURLs(){workURLs.forEach(u=>URL.revokeObjectURL(u));workURLs=[]}
function field(name,label,value='',type='textarea'){return `<label>${label}${type==='textarea'?`<textarea name="${name}" maxlength="4000">${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${type==='date'?'min="'+todayIR()+'"':''} maxlength="4000">`}</label>`}
function pathHTML(task){const states=['requested','contacted','proposed','confirmed','visited','reported','closed'],idx=states.indexOf(task.status);return '<ol class="work-path">'+[['هماهنگی',1],['تایید زمان',3],['مراجعه',4],['گزارش',5],['نظر پزشک',6]].map(([s,i])=>`<li class="${idx>=i?'done':''}">${s}</li>`).join('')+'</ol>'}
function taskHTML(t,showReview=true){return `<section class="work-section"><span class="work-status">${taskNames[t.status]}</span><h3>${esc(t.title)}</h3><p>${esc(t.why)}</p>${pathHTML(t)}<p class="work-meta">پیگیری با ${esc(accountName(t.assignee))} · موعد ${esc(prettyDate(t.due))}</p>${t.issue?`<div class="work-subsection"><p>${esc(t.issue.reason)}</p><p>قدم بعد: ${esc(t.issue.next)} · ${esc(prettyDate(t.issue.due))}</p></div>`:''}${t.offer?`<dl class="work-facts"><div><dt>زمان پیشنهادی</dt><dd>${esc(prettyDate(t.offer.date))} · ${fa(t.offer.time)}</dd></div><div><dt>مرکز</dt><dd>${esc(t.offer.place)}</dd></div><div><dt>آدرس</dt><dd>${esc(t.offer.address)}</dd></div><div><dt>تماس مرکز</dt><dd>${esc(t.offer.phone)}</dd></div></dl>`:''}${t.review&&showReview?`<div class="work-subsection"><h3>نظر پزشک درباره گزارش</h3><p>${esc(t.review.text)}</p><p><strong>قدم بعد:</strong> ${esc(t.review.next)}</p><span class="work-meta">${esc(accountName(t.review.doctor))} · ${esc(prettyDate(t.review.at))}</span></div>`:''}</section>`}
function historyHTML(t){return '<details><summary class="work-details-summary">سابقه پیگیری</summary>'+t.history.map(h=>`<p class="work-meta">${esc(prettyDate(h.at))} · ${esc(accountName(h.actor))} · ${esc(h.text)}</p>`).join('')+'</details>'}
function reportLink(doc){if(!doc)return '<p>گزارش در دسترس نیست.</p>';const url=URL.createObjectURL(doc.blob);workURLs.push(url);return `<a href="${url}" target="_blank" rel="noopener">مشاهده اصل گزارش: ${esc(doc.name)} ↗</a>`}
async function openWork(r,taskId){
 if(workBusy)return;workSelected={owner:r.id,task:taskId};workDirty=false;releaseWorkURLs();$('work-list').hidden=true;$('work-detail').hidden=false;
 const doctor=staffActor.role==='doctor',care=careOf(r),t=care.tasks.find(t=>t.id===taskId);need(canSee(r,taskId),'این پرونده به شما مربوط نیست.');
 $('work-detail').innerHTML=`<button class="plain-button" id="work-back">→ بازگشت به فهرست</button><h2 tabindex="-1" id="case-title">${esc(accountName(r.id))}</h2><div class="work-columns"><div id="work-context"></div><div id="work-editor"></div></div>`;
 $('work-back').onclick=()=>{if(!leaveDraft())return;workSelected=null;workDirty=false;renderQueue()};
 if(doctor){
  const docs=await readDocuments(r.id);
  $('work-context').innerHTML=`<section class="work-section"><h3>آنچه بیمار گفته است</h3><p class="work-meta">پاسخ اولیه بیمار؛ هنوز ارزیابی پزشکی نیست.</p><dl class="work-facts">${questions.map((q,i)=>`<div><dt>${esc(q.topic)}</dt><dd>${esc(q.answers[r.answers[i]]||'پاسخی ثبت نشده')}</dd></div>`).join('')}</dl></section><section class="work-section"><h3>مدارک</h3><div class="work-files">${docs.length?docs.map(d=>{const url=URL.createObjectURL(d.blob);workURLs.push(url);return `<a href="${url}" target="_blank" rel="noopener">${esc(d.name)} ↗</a>`}).join(''):'هنوز مدرکی اضافه نشده است.'}</div></section>${care.encounters.map(e=>`<details class="work-section"><summary class="work-details-summary">جلسه ${esc(prettyDate(e.at))} · ${esc(accountName(e.doctor))}</summary><p>${esc(e.summary)}</p><p>اطلاعات روشن شده: ${esc(e.known||'ثبت نشده')}</p><p>نیاز به بررسی: ${esc(e.unknown||'ثبت نشده')}</p><p>قدم بعد: ${esc(e.next)}</p><p>موعد: ${esc(prettyDate(e.due))}</p></details>`).join('')}${care.tasks.map(t=>taskHTML(t)).join('')}`;
  const reports=care.tasks.filter(t=>t.status==='reported');
  $('work-editor').innerHTML=reports.map(t=>`<form class="work-form work-section" data-command="review" data-task="${t.id}"><h3>بررسی گزارش: ${esc(t.title)}</h3>${reportLink(docs.find(d=>d.id===t.reportId))}${field('text','توضیح نتیجه برای بیمار')}${field('next','قدم بعد بیمار')}${field('due','موعد پیگیری بعدی','','date')}<button class="primary" type="submit">ثبت نظر و نمایش برای بیمار</button><p class="work-feedback" role="status"></p></form>`).join('')+encounterForm(care.draft,care.encounters.length>0);
  const form=$('encounter-form');form.querySelector('[name=kind]').onchange=()=>{form.querySelector('#referral-fields').hidden=form.elements.kind.value==='none'};
  form.querySelector('[name=kind]').onchange();form.querySelector('#save-encounter').onclick=()=>submitWork(r,form,'draft');
 }else{
  $('work-context').innerHTML=`<p class="work-meta">درخواست ${esc(accountName(t.doctor))} · شماره بیمار: ${esc(fa(ACCOUNTS.find(a=>a.id===r.id).phone))}</p>${taskHTML(t,false)}${historyHTML(t)}<p class="work-meta">این نما فقط اطلاعات لازم برای هماهنگی را نشان می‌دهد.</p>`;
  $('work-editor').innerHTML=coordEditor(t);
  if(t.reportId){const docs=await readDocuments(r.id),doc=docs.find(d=>d.id===t.reportId);if(doc){const a=document.createElement('a');a.textContent='مشاهده گزارش همین درخواست ↗';a.href=URL.createObjectURL(doc.blob);workURLs.push(a.href);a.target='_blank';a.rel='noopener';$('work-context').append(a)}}
 }
 $('work-detail').querySelectorAll('form').forEach(f=>{f.oninput=()=>{workDirty=true};f.onsubmit=e=>{e.preventDefault();submitWork(r,f,f.dataset.command)}});
 $('case-title').focus({preventScroll:true});
}
function encounterForm(draft={},followup=false){const d=draft||{};return `<form id="encounter-form" class="work-form work-section" data-command="publish"><h3>${followup?'ثبت جلسه پیگیری':'ثبت اولین جلسه'}</h3><p class="work-meta">از دل گفت‌وگو ثبت کن. فقط نسخه نهایی به بیمار نمایش داده می‌شود.</p>${field('summary','خلاصه قابل فهم برای بیمار',d.summary)}${field('known','اطلاعات و سوابق روشن شده در جلسه',d.known)}${field('unknown','مواردی که هنوز نیاز به بررسی دارند',d.unknown)}${field('next','قدم بعد بیمار',d.next)}${field('due','موعد پیگیری',d.due,'date')}<label>آیا هماهنگی لازم است؟<select name="kind"><option value="none">فعلا لازم نیست</option><option value="visit" ${d.kind==='visit'?'selected':''}>هماهنگی مراجعه</option><option value="test" ${d.kind==='test'?'selected':''}>هماهنگی آزمایش یا خدمت</option></select></label><fieldset id="referral-fields" hidden>${field('title','عنوان درخواست',d.title,'text')}${field('why','دلیل درخواست و اطلاعات لازم برای هماهنگی',d.why)}<label>کارشناس پیگیری<select name="assignee">${STAFF_ACCOUNTS.filter(a=>a.role==='coordinator').map(a=>`<option value="${a.id}" ${d.assignee===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label></fieldset><label class="work-check"><input type="checkbox" name="occurred">جلسه نمونه برگزار شده و این نوشته، خروجی همان جلسه است.</label><div class="work-actions"><button class="primary" type="submit">ثبت نهایی و نمایش برای بیمار</button><button id="save-encounter" type="button" class="plain-button">ذخیره پیش نویس</button></div><p class="work-feedback" role="status"></p></form>`}
function coordEditor(t){
 let fields='',cmd='',label='';
 if(t.status==='requested'){fields=field('note','نتیجه تماس با بیمار یا مرکز');cmd='contact';label='ثبت تماس و ادامه'}
 if(t.status==='contacted'){fields=field('date','تاریخ پیشنهادی','','date')+field('time','ساعت پیشنهادی','','time')+field('place','نام مرکز','','text')+field('address','آدرس مرکز')+field('phone','شماره تماس مرکز','','tel');cmd='propose';label='ارسال پیشنهاد برای بیمار'}
 if(t.status==='confirmed'){fields=field('note','بیمار چه زمانی و کجا مراجعه کرد؟');cmd='visited';label='ثبت انجام مراجعه نمونه'}
 if(t.status==='visited'){fields='<label>گزارش ساختگی همین مراجعه<input name="report" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"><span class="work-meta">PDF یا تصویر، حداکثر ۱۰ مگابایت</span></label>';cmd='report';label='ثبت گزارش و فرستادن برای پزشک'}
 let html=cmd?`<form class="work-form work-section" data-command="${cmd}" data-task="${t.id}"><h3>قدم بعد شما</h3>${fields}<button class="primary" type="submit">${label}</button><p class="work-feedback" role="status"></p></form>`:`<div class="work-section"><h3>${taskNames[t.status]}</h3><p>${t.status==='proposed'?'پیشنهاد به خانه بیمار رسیده است. بیمار باید زمان را تایید کند یا زمان دیگری بخواهد.':t.status==='reported'?'گزارش در صف پزشک است. دریافت فایل به معنی بررسی پزشکی نیست.':'پزشک نتیجه و قدم بعد را برای بیمار ثبت کرده است.'}</p></div>`;
 if(!['closed','reported'].includes(t.status))html+=`<details class="work-section"><summary class="work-details-summary">پیگیری به مانع خورده است؟</summary><form class="work-form" data-command="issue" data-task="${t.id}"><label>مانع<select name="reason"><option>بیمار پاسخ نداد</option><option>مرکز پاسخ نداد</option><option>زمان مناسب نبود</option><option>مرکز درخواست را نپذیرفت</option><option>بیمار مراجعه نکرد</option><option>گزارش آماده نیست</option></select></label>${field('next','اقدام بعدی شما')}${field('due','موعد تلاش بعدی','','date')}<button class="primary" type="submit">ثبت پیگیری بعدی</button><p class="work-feedback" role="status"></p></form></details>`;
 if(['proposed','confirmed'].includes(t.status))html+=`<details class="work-section"><summary class="work-details-summary">زمان یا مرکز باید عوض شود؟</summary><form class="work-form" data-command="reschedule" data-task="${t.id}">${field('note','دلیل هماهنگی دوباره')}<button class="primary" type="submit">شروع هماهنگی دوباره</button><p class="work-feedback" role="status"></p></form></details>`;
 return html;
}
async function checkedReport(file){need(file&&file.size>0&&file.size<=10*1024*1024,'یک فایل PDF یا تصویر تا ۱۰ مگابایت انتخاب کن.');const h=new Uint8Array(await file.slice(0,12).arrayBuffer());const str=(a,b)=>String.fromCharCode(...h.slice(a,b));const type=str(0,5)==='%PDF-'?'application/pdf':h[0]===137&&str(1,4)==='PNG'?'image/png':h[0]===255&&h[1]===216&&h[2]===255?'image/jpeg':str(0,4)==='RIFF'&&str(8,12)==='WEBP'?'image/webp':null;need(type,'فرمت فایل معتبر نیست.');return {name:file.name,blob:new Blob([file],{type})}}
async function submitWork(r,form,command){
 if(workBusy)return;workBusy=true;const feedback=form.querySelector('.work-feedback'),buttons=[...$('work-detail').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);feedback.textContent='در حال ذخیره...';
 try{const fields=Object.fromEntries(new FormData(form));fields.taskId=form.dataset.task;const file=command==='report'?await checkedReport(form.elements.report.files[0]):null;await workflowWrite(r,command,fields,file);workDirty=false;workBusy=false;await refreshWork();workFeedback(command==='draft'?'پیش نویس ذخیره شد؛ هنوز به بیمار نمایش داده نشده است.':'ثبت شد؛ وضعیت پرونده بیمار به روز شد.')}catch(e){feedback.textContent=e.message;workFeedback(e.message)}finally{workBusy=false;buttons.forEach(b=>b.disabled=false)}
}
function renderMemberCare(){
 const root=$('member-care');if(!root||!currentUser)return;const care=careOf(currentUser),has=care.encounters.length>0;root.hidden=!has;$('documents-title').innerHTML=(has?'مدارک پرونده':'مدارک برای اولین جلسه')+' <span>اختیاری</span>';
 $('confirmation-scene').querySelector('.home-appointment').hidden=has;
 $('confirmation-title').textContent=has?'قدم بعد من':'قرار پیش رو';$('confirmation-lead').textContent=has?'خلاصه پزشک و پیگیری های مربوط به شما.':'زمان گفت‌وگو مشخص است. اگر مدرکی داری، می‌توانی تا قبل از جلسه اضافه کنی.';
 if(!has){root.replaceChildren();return}
 const e=care.encounters.at(-1),latestReview=care.tasks.map(t=>t.review).filter(Boolean).filter(v=>v.at>e.at).sort((a,b)=>b.at.localeCompare(a.at))[0];
 root.innerHTML=`<div class="care-grid"><section class="work-section"><span class="scene-kicker">جمع بندی پزشک همراه</span><h2>${esc(e.summary)}</h2><p class="work-meta">${esc(accountName(e.doctor))} · ${esc(prettyDate(e.at))}</p><details><summary class="work-details-summary">جزییات جلسه</summary><p>اطلاعات روشن شده: ${esc(e.known||'ثبت نشده')}</p><p>نیاز به بررسی: ${esc(e.unknown||'ثبت نشده')}</p></details></section><section class="work-section"><span class="scene-kicker">کاری که پیش رو دارید</span><h2>${esc(latestReview?.next||e.next)}</h2><p>موعد پیگیری: ${esc(prettyDate(latestReview?.due||e.due))}</p><p class="work-meta">${care.tasks.length?'وضعیت هماهنگی ها را در مسیر پایین می‌بینی.':'هماهنگی دیگری برای این جلسه ثبت نشده است.'}</p></section></div>${care.tasks.map(t=>taskHTML(t)+(t.status==='proposed'?`<div class="work-actions"><button class="primary" data-member-command="accept" data-task="${t.id}">این زمان مناسب است</button><button class="plain-button" data-member-command="decline" data-task="${t.id}">زمان دیگری می‌خواهم</button></div>`:'')+historyHTML(t)).join('')}<p id="member-care-feedback" class="work-feedback" role="status"></p>${care.encounters.length>1?'<details><summary class="work-details-summary">جلسه های پیشین</summary>'+care.encounters.slice(0,-1).map(e=>`<section class="work-section"><p>${esc(e.summary)}</p><p>${esc(e.next)}</p><p class="work-meta">${esc(accountName(e.doctor))} · ${esc(prettyDate(e.at))}</p></section>`).join('')+'</details>':''}`;
 root.querySelectorAll('[data-member-command]').forEach(b=>b.onclick=async()=>{root.querySelectorAll('button').forEach(x=>x.disabled=true);try{const updated=await workflowWrite(currentUser,b.dataset.memberCommand,{taskId:b.dataset.task});await restoreUser(updated)}catch(e){$('member-care-feedback').textContent=e.message;root.querySelectorAll('button').forEach(x=>x.disabled=false)}});
 $('documents-title').innerHTML='مدارک پرونده <span>اختیاری</span>';
}
$('refresh-work').onclick=async()=>{if(workBusy||!leaveDraft())return;await refreshWork();workFeedback('فهرست به روز شد.')};
$('staff-signout').onclick=()=>{if(!leaveDraft())return;sessionStorage.removeItem(STAFF_SESSION);staffActor=null;workSelected=null;workDirty=false;releaseWorkURLs();showOnly($('login-scene'));showPhone()};
if(staffMode){document.body.classList.add('staff-entry');$('login-title').textContent='ورود به میزکار';document.querySelector('.login-description').textContent='پزشک یا کارشناس نمونه را انتخاب کن.'}
window.addEventListener('beforeunload',e=>{if(workDirty){e.preventDefault();e.returnValue=''}});
window.addEventListener('storage',async event=>{if(event.key!==EVENT_KEY)return;try{const owner=JSON.parse(event.newValue)?.owner;if(staffActor){if(workDirty||workBusy){workFeedback('پرونده در پنجره دیگری تغییر کرده است؛ پیش از ادامه، فهرست را دوباره باز کن.');return}await refreshWork()}else if(owner===currentUser?.id&&!addingDocuments){await saveQueue.catch(()=>{});await restoreUser(await getUser(owner))}}catch{}});
window.addEventListener('pagehide',releaseWorkURLs);
