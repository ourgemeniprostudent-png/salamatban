let appointment=null;
const documents=[];let documentSerial=0;
function appointmentDate(){
 const date=appointment.date;
 return new Date(date+'T'+appointment.doctor.times[appointment.slot]+':00+03:30');
}
function updateAppointmentClock(){
 if(!appointment)return;
 const start=appointmentDate().getTime(),delta=start-Date.now(),end=start+20*60000,now=Date.now();
 const join=document.getElementById('join-appointment');
 join.disabled=now<start-15*60000||now>=end;
 const status=document.getElementById('appointment-status'),countdown=document.getElementById('appointment-countdown'),hint=document.getElementById('join-hint');
 if(now>=end){status.textContent='زمان این قرار گذشته است';countdown.textContent='برای ادامه می‌توانی زمان دیگری انتخاب کنی.';hint.textContent='این قرار نمایشی بوده و جلسه واقعی برگزار نشده است.'}
 else if(delta<=0){status.textContent='زمان گفت‌وگو رسیده است';countdown.textContent='می‌توانی وارد اتاق نمونه شوی.';hint.textContent='در این پیش‌نمایش تماس واقعی برقرار نمی‌شود.'}
 else if(delta<=15*60000){status.textContent='نزدیک زمان گفت‌وگو';countdown.textContent=fa(Math.ceil(delta/60000))+' دقیقه تا گفت‌وگو';hint.textContent='ورود به اتاق نمونه فعال است؛ تماس واقعی برقرار نمی‌شود.'}
 else{status.textContent='در انتظار اولین گفت‌وگو';const minutes=Math.ceil(delta/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;countdown.textContent=(days?fa(days)+' روز و ':'')+(hours?fa(hours)+' ساعت':fa(mins)+' دقیقه')+' تا گفت‌وگو';hint.textContent='ورود از ۱۵ دقیقه پیش از زمان قرار فعال می‌شود.'}
}
function renderHome(){
 const d=appointment.doctor;
 document.getElementById('confirmed-photo').src=photoFor(d).src;document.getElementById('confirmed-photo').alt=photoFor(d).alt;
 document.getElementById('home-doctor-name').textContent=d.name;
 document.getElementById('appointment-facts').innerHTML='<div><dt>تاریخ قرار</dt><dd>'+dateFmt.format(new Date(appointment.date+'T12:00:00Z'))+'</dd></div><div><dt>ساعت، به وقت ایران</dt><dd>'+fa(d.times[appointment.slot])+'</dd></div><div><dt>نوع گفت‌وگو</dt><dd>آنلاین</dd></div><div><dt>مدت زمان نمونه</dt><dd>۲۰ دقیقه</dd></div>';
 document.getElementById('back-home').hidden=false;
 updateAppointmentClock();renderDocuments();
}
function editAppointment(){
 selectedDoctor=appointment.doctor;selectedDay=sampleDays.findIndex(d=>d.toISOString().slice(0,10)===appointment.date);selectedSlot=appointment.slot;if(selectedDay<0){selectedDay=firstAvailable(selectedDoctor)?.day??0;selectedSlot=null}
 const photo=document.getElementById('booking-photo');photo.src=photoFor(selectedDoctor).src;photo.alt=photoFor(selectedDoctor).alt;document.getElementById('booking-name').textContent=selectedDoctor.name;
 renderCalendar();renderSlots();swapScene(bookingScene,'booking-title');
}
function renderDocuments(){
 const list=document.getElementById('document-list');list.replaceChildren();document.getElementById('document-empty').hidden=documents.length>0;
 documents.forEach(item=>{
  const li=document.createElement('li');li.className='document-row';
  const mark=document.createElement('span');mark.className='file-mark';mark.textContent=item.type==='application/pdf'?'PDF':'تصویر';
  const details=document.createElement('div');details.className='file-details';const name=document.createElement('span');name.className='file-name';name.textContent=item.name;const size=document.createElement('span');size.className='file-size';size.textContent=fa(Math.max(1,Math.round(item.size/1024)))+' کیلوبایت · ذخیره در مرورگر';details.append(name,size);
  const actions=document.createElement('div');actions.className='file-actions';const view=document.createElement('a');view.textContent='مشاهده';view.href=item.url;view.target='_blank';view.rel='noopener noreferrer';view.setAttribute('aria-label','مشاهده '+item.name+' در برگه جدید');
  const remove=document.createElement('button');remove.type='button';remove.textContent='حذف';remove.setAttribute('aria-label','حذف '+item.name);remove.onclick=async()=>{remove.disabled=true;try{await deleteDocument(item);const index=documents.findIndex(d=>d.id===item.id);if(index>=0){URL.revokeObjectURL(documents[index].url);documents.splice(index,1)}renderDocuments();setDocumentFeedback('مدرک حذف شد.');document.getElementById('add-documents').focus({preventScroll:true})}catch(error){remove.disabled=false;setDocumentFeedback('حذف مدرک انجام نشد.',true);storageError(error)}};actions.append(view,remove);li.append(mark,details,actions);list.append(li);
 });
}
function setDocumentFeedback(message,error=false){const feedback=document.getElementById('document-feedback');feedback.textContent=message;feedback.dataset.error=String(error)}
async function addDocuments(files){
 const failures=[];let added=0;
 for(const file of files){
  if(documents.length>=5){failures.push('حداکثر ۵ فایل می‌توانی اضافه کنی.');break}
  if(file.size>10*1024*1024){failures.push('حجم «'+file.name+'» بیشتر از ۱۰ مگابایت است.');continue}
  if(file.size===0){failures.push('فایل «'+file.name+'» خالی است.');continue}
  const head=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const pdf=head[0]===37&&head[1]===80&&head[2]===68&&head[3]===70&&head[4]===45;
  const png=head[0]===137&&head[1]===80&&head[2]===78&&head[3]===71;
  const jpg=head[0]===255&&head[1]===216&&head[2]===255;
  const webp=String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP';
  const type=pdf?'application/pdf':png?'image/png':jpg?'image/jpeg':webp?'image/webp':null;
  if(!type){failures.push('«'+file.name+'» فایل PDF یا تصویر پشتیبانی‌شده نیست.');continue}
  if(documents.some(d=>d.name===file.name&&d.size===file.size&&d.modified===file.lastModified)){failures.push('«'+file.name+'» قبلا اضافه شده است.');continue}
  const blob=new Blob([file],{type});const item={id:crypto.randomUUID(),name:file.name,size:file.size,modified:file.lastModified,type};await writeDocument(item,blob);documents.push({...item,url:URL.createObjectURL(blob)});added++;
 }
 renderDocuments();setDocumentFeedback((added?fa(added)+' مدرک برای این کاربر ذخیره شد. ':'')+[...new Set(failures)].join(' '),failures.length>0);
}
const documentInput=document.getElementById('document-input');let addingDocuments=false;
document.getElementById('add-documents').onclick=()=>{if(!addingDocuments)documentInput.click()};
documentInput.onchange=async()=>{if(addingDocuments)return;addingDocuments=true;const files=[...documentInput.files];documentInput.value='';document.getElementById('add-documents').disabled=true;try{await addDocuments(files)}catch{setDocumentFeedback('ذخیره فایل انجام نشد. دوباره انتخابش کن.',true)}finally{addingDocuments=false;document.getElementById('add-documents').disabled=false}};
const roomDialog=document.getElementById('room-dialog');document.getElementById('join-appointment').onclick=()=>{updateAppointmentClock();if(document.getElementById('join-appointment').disabled)return;document.getElementById('room-doctor').textContent=appointment.doctor.name;roomDialog.showModal()};document.getElementById('close-room').onclick=()=>roomDialog.close();
document.getElementById('back-home').onclick=()=>{if(appointment){renderHome();swapScene(confirmationScene,'confirmation-title')}};
const homeClock=setInterval(()=>{if(activeScene===confirmationScene)updateAppointmentClock()},30000);
window.addEventListener('pagehide',()=>{clearInterval(homeClock);documents.forEach(d=>URL.revokeObjectURL(d.url))});
