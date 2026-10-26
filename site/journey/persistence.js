const APP_VERSION='4.1.0';
const ACCOUNTS=[{id:'sara',name:'سارا احمدی',phone:'09000000001',code:'111111'},{id:'maryam',name:'مریم کیانی',phone:'09000000002',code:'222222'},{id:'narges',name:'نرگس رضایی',phone:'09000000003',code:'333333'}];
const DB_NAME='salamatban-journey-v4',SESSION_KEY='salamatban.journey.v4.session',EVENT_KEY='salamatban.journey.v4.event';
let db=null,currentUser=null,saveQueue=Promise.resolve(),isRestoring=false;const userRevisions=new Map();
function storageError(error){console.error('Persistent demo storage:',error?.name||'Error');document.getElementById('storage-error-text').textContent='ذخیره اطلاعات انجام نشد. دسترسی مرورگر به فضای ذخیره را بررسی کن و دوباره تلاش کن.';document.getElementById('storage-error').hidden=false;}
function announceChange(owner){try{localStorage.setItem(EVENT_KEY,JSON.stringify({owner,nonce:crypto.randomUUID()}))}catch{}}
function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{const database=request.result;database.createObjectStore('users',{keyPath:'id'});database.createObjectStore('documents',{keyPath:'key'}).createIndex('owner','owner')};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('DatabaseBlocked'));request.onsuccess=()=>{db=request.result;db.onversionchange=()=>db.close();resolve(db)}})}
function freshRecord(id){return {id,schemaVersion:1,generation:crypto.randomUUID(),revision:0,stage:'intake',current:0,answers:Array(6).fill(null),editing:false,draft:null,appointment:null}}
function getUser(id){return new Promise((resolve,reject)=>{const tx=db.transaction('users','readwrite'),store=tx.objectStore('users'),req=store.get(id);let record;req.onsuccess=()=>{record=req.result;if(!record){record=freshRecord(id);store.put(record)}};tx.oncomplete=()=>resolve(record);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Aborted'))})}
function readDocuments(owner){return new Promise((resolve,reject)=>{const tx=db.transaction('documents','readonly'),r=tx.objectStore('documents').index('owner').getAll(owner);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function currentSnapshot(overrides={}){
 const ap=appointment?{doctorId:appointment.doctor.id,date:appointment.date,time:appointment.doctor.times[appointment.slot]}:null;
 const draft=selectedDoctor?{doctorId:selectedDoctor.id,date:sampleDays[selectedDay]?.toISOString().slice(0,10)||null,time:selectedSlot===null?null:selectedDoctor.times[selectedSlot]}:null;
 const stages={'intake-scene':'intake','doctors-scene':'doctors','booking-scene':'booking','confirmation-scene':'home'};
 return {schemaVersion:1,answers:[...answers],current,editing,stage:stages[activeScene?.id]||'intake',draft,appointment:ap,...overrides};
}
function persistCurrent(overrides={}){
 if(isRestoring||!currentUser)return Promise.resolve();
 const owner=currentUser.id,generation=currentUser.generation,snapshot=currentSnapshot(overrides);
 const task=saveQueue.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
  const tx=db.transaction('users','readwrite'),store=tx.objectStore('users'),req=store.get(owner);let written;
  req.onsuccess=()=>{const stored=req.result;if(!stored||stored.generation!==generation||stored.revision!==userRevisions.get(owner)){tx.abort();return}written={...stored,...snapshot,id:owner,generation,revision:stored.revision+1};store.put(written)};
  tx.oncomplete=()=>{userRevisions.set(owner,written.revision);if(currentUser?.id===owner)currentUser=written;announceChange(owner);resolve()};tx.onabort=()=>reject(new Error('StateChangedOrUnavailable'));tx.onerror=()=>reject(tx.error);
 }));
 saveQueue=task;task.catch(storageError);return task;
}
function persistQuietly(){persistCurrent().catch(()=>{})}
function writeDocument(item,blob){
 const owner=currentUser.id,generation=currentUser.generation;
 return new Promise((resolve,reject)=>{const tx=db.transaction(['users','documents'],'readwrite');const req=tx.objectStore('users').get(owner);req.onsuccess=()=>{if(req.result?.generation!==generation){tx.abort();return}tx.objectStore('documents').put({key:owner+':'+item.id,owner,generation,id:item.id,name:item.name,size:item.size,modified:item.modified,type:item.type,blob})};tx.oncomplete=()=>{announceChange(owner);resolve()};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('UserReset'))});
}
function deleteDocument(item){const owner=currentUser.id;return new Promise((resolve,reject)=>{const tx=db.transaction(['users','documents'],'readwrite');const req=tx.objectStore('users').get(owner);req.onsuccess=()=>{if(req.result?.generation!==currentUser.generation||(req.result?.care?.tasks||[]).some(t=>t.reportId===item.id)){tx.abort();return}tx.objectStore('documents').delete(owner+':'+item.id)};tx.oncomplete=()=>{announceChange(owner);resolve()};tx.onerror=()=>reject(tx.error)})}
async function resetCurrentUser(){
 await saveQueue.catch(()=>{});const owner=currentUser.id;
 const record=await new Promise((resolve,reject)=>{const tx=db.transaction(['users','documents'],'readwrite'),fresh=freshRecord(owner);tx.objectStore('users').put(fresh);const cursor=tx.objectStore('documents').index('owner').openCursor(IDBKeyRange.only(owner));cursor.onsuccess=()=>{const c=cursor.result;if(c){c.delete();c.continue()}};tx.oncomplete=()=>resolve(fresh);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('ResetFailed'))});
 announceChange(owner);await restoreUser(record);
}
function clearMemory(){clearTimeout(transitionTimer);if(animation)cancelAnimationFrame(animation);busy=false;editing=false;sceneChanging=false;documents.forEach(d=>URL.revokeObjectURL(d.url));documents.splice(0);selectedDoctor=null;selectedSlot=null;selectedDay=0;appointment=null;documentSerial=0;fillLevel=0;fillImage.style.clipPath='inset(100% 0 0 0)';document.getElementById('storage-error').hidden=true;document.getElementById('back-home').hidden=true;document.getElementById('document-feedback').textContent='';document.getElementById('document-input').value='';}
function showOnly(scene){for(const node of document.querySelectorAll('main')){node.hidden=node!==scene;node.inert=false}activeScene=scene;window.scrollTo({top:0,behavior:'instant'})}
function restoreDraft(draft){
 selectedDoctor=doctorData.find(d=>d.id===draft?.doctorId)||null;if(!selectedDoctor)return;
 selectedDay=sampleDays.findIndex(d=>d.toISOString().slice(0,10)===draft.date);
 if(selectedDay<0){selectedDay=firstAvailable(selectedDoctor)?.day??0;selectedSlot=null}else{selectedSlot=selectedDoctor.times.indexOf(draft.time);if(selectedSlot<0||availability(selectedDoctor,selectedDay)[selectedSlot]?.status!=='available')selectedSlot=null}
 const photo=document.getElementById('booking-photo');photo.src=photoFor(selectedDoctor).src;photo.alt=photoFor(selectedDoctor).alt;document.getElementById('booking-name').textContent=selectedDoctor.name;renderCalendar();renderSlots();
}
async function restoreUser(record){
 isRestoring=true;clearMemory();currentUser=record;userRevisions.set(record.id,record.revision);
 try{
  answers=Array.from({length:6},(_,i)=>Number.isInteger(record.answers?.[i])&&record.answers[i]>=0&&record.answers[i]<4?record.answers[i]:null);
  const complete=answers.every(v=>v!==null);current=Number.isInteger(record.current)&&record.current>=0&&record.current<6?record.current:answers.findIndex(v=>v===null);if(current<0)current=0;editing=complete&&record.stage==='intake';
  fillLevel=answers.filter(v=>v!==null).length/6;fillImage.style.clipPath=`inset(${(1-fillLevel)*100}% 0 0 0)`;
  const ap=record.appointment,doctor=doctorData.find(d=>d.id===ap?.doctorId);
  if(doctor&&/^\d{4}-\d{2}-\d{2}$/.test(ap.date)&&doctor.times.includes(ap.time)){appointment={doctor,date:ap.date,day:sampleDays.findIndex(d=>d.toISOString().slice(0,10)===ap.date),slot:doctor.times.indexOf(ap.time)}}
  const savedDocs=await readDocuments(record.id);for(const d of savedDocs)if(d.generation===record.generation){documents.push({id:d.id,name:d.name,size:d.size,modified:d.modified,type:d.type,url:URL.createObjectURL(d.blob)});documentSerial=Math.max(documentSerial,Number(d.id)||0)}
  restoreDraft(record.draft);render();renderDocuments();document.getElementById('personal-summary').textContent=complete?personalSummary():'';
  let target=document.getElementById('intake-scene'),focus='question';
  if(complete&&record.stage!=='intake'){target=doctorScene;focus='doctors-title';if(record.stage==='home'&&appointment){renderHome();target=confirmationScene;focus='confirmation-title'}else if(record.stage==='booking'&&selectedDoctor){target=bookingScene;focus='booking-title'}}
  document.getElementById('header-user').hidden=false;document.getElementById('active-user-name').textContent=ACCOUNTS.find(a=>a.id===record.id).name;showOnly(target);document.getElementById(focus).focus({preventScroll:true});renderMemberCare();
 }finally{isRestoring=false}
}
