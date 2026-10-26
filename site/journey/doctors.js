const doctorData=[
 {id:'nazanin',name:'دکتر نازنین مهرآیین',years:'۸ سال تجربه نمونه',focus:'تمرکز بر سلامت عمومی و عادت‌های روزمره',bio:'پزشک عمومی با سابقه فرضی در مراقبت‌های اولیه؛ با توجه به خواب، انرژی و سبک زندگی، برای شناخت بهتر وضعیت شما وقت می‌گذارد.',times:['09:00','09:30','10:00','10:30','11:00','11:30']},
 {id:'arman',name:'دکتر آرمان فرهمند',years:'۱۲ سال تجربه نمونه',focus:'تمرکز بر مرور سوابق و پیگیری منظم',bio:'پزشک عمومی با سابقه فرضی در پیگیری بیماری‌های مزمن؛ سوابق، داروها و بررسی‌های قبلی را کنار هم مرور می‌کند.',times:['15:00','15:30','16:00','16:30','17:00','17:30']},
 {id:'kaveh',name:'دکتر کاوه نیک‌روش',years:'۲۲ سال تجربه نمونه',focus:'تمرکز بر شناخت جامع و توضیح قدم بعد',bio:'پزشک عمومی با سابقه فرضی در مراقبت خانواده؛ برای شنیدن دغدغه‌ها، توضیح مدارک و روشن‌کردن مسیر پیگیری همراه شماست.',times:['16:00','16:30','17:00','17:30','18:00','18:30']}
];
let activeScene=document.getElementById('intake-scene'),sceneChanging=false,selectedDoctor=null,selectedDay=0,selectedSlot=null;
const doctorScene=document.getElementById('doctors-scene'),bookingScene=document.getElementById('booking-scene'),confirmationScene=document.getElementById('confirmation-scene');
const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6"/></svg>';
const dateFmt=new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',weekday:'long',month:'long',day:'numeric'});
const dayFmt=new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',weekday:'long'}),shortDateFmt=new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',month:'long',day:'numeric'});
// The demo calendar is anchored to today's date in Iran, independent of the viewer's timezone.
const iranDateParts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const iranDate=Object.fromEntries(iranDateParts.filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
const sampleDays=Array.from({length:14},(_,i)=>new Date(Date.UTC(iranDate.year,iranDate.month-1,iranDate.day+i+1,12)));
function availability(d,day){
 const doc=doctorData.indexOf(d),date=sampleDays[day],closed=date.getUTCDay()===5;
 const full=day===5+doc;
 const seed=Math.floor(date.getTime()/86400000)+doc*11;
 return d.times.map((time,index)=>({time,status:closed?'closed':full||(seed+index*3)%7<2?'booked':'available'}));
}
function firstAvailable(d){
 for(let day=0;day<sampleDays.length;day++){
  const slot=availability(d,day).findIndex(s=>s.status==='available');
  if(slot>=0)return {day,slot};
 }
 return null;
}
function photoFor(d){return document.getElementById('doctor-photo-'+d.id).content.querySelector('img')}
function makeDoctors(){
 const grid=document.getElementById('doctor-grid');
 doctorData.forEach(d=>{
  const article=document.createElement('article');article.className='doctor-card';
  article.innerHTML='<figure class="doctor-photo"><span class="doctor-image-label">پزشک عمومی · نمونه نمایشی</span></figure><div class="doctor-copy"><div class="doctor-heading"><h2></h2><span class="experience"></span></div><p class="doctor-focus"></p><p class="doctor-bio"></p><div class="doctor-action"><span class="next-slot">نزدیک‌ترین وقت نمونه<b></b></span><button type="button" class="primary">انتخاب پزشک '+arrow+'</button></div></div>';
  article.querySelector('figure').prepend(photoFor(d).cloneNode(true));article.querySelector('h2').textContent=d.name;article.querySelector('.experience').textContent=d.years;article.querySelector('.doctor-focus').textContent=d.focus;article.querySelector('.doctor-bio').textContent=d.bio;const next=firstAvailable(d);article.querySelector('.next-slot b').textContent=next?shortDateFmt.format(sampleDays[next.day])+'، '+fa(d.times[next.slot]):'در این بازه وقت خالی ندارد';
  const btn=article.querySelector('button');btn.setAttribute('aria-label','انتخاب '+d.name);btn.onclick=()=>selectDoctor(d);grid.append(article);
 });
}
async function swapScene(next,focusId){
 if(sceneChanging)return false;sceneChanging=true;try{await persistCurrent({stage:({'intake-scene':'intake','doctors-scene':'doctors','booking-scene':'booking','confirmation-scene':'home'})[next.id]})}catch{sceneChanging=false;return false}
 const previous=activeScene;previous.inert=true;
 if(previous!==next){
  if(!reduced.matches){await previous.animate([{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'},{opacity:0,transform:'translateY(-16px) scale(.985)',filter:'blur(5px)'}],{duration:360,easing:'cubic-bezier(.4,0,.2,1)'}).finished;}
  previous.hidden=true;next.hidden=false;next.inert=true;activeScene=next;window.scrollTo({top:0,behavior:'instant'});
  if(!reduced.matches){
   await next.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,easing:'cubic-bezier(.2,.8,.2,1)'}).finished;
   if(next===doctorScene) next.querySelectorAll('.doctor-photo').forEach((el,i)=>el.animate([{opacity:.25,transform:'translateY(12px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:520,delay:i*85,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));
  }
 }
 previous.inert=false;next.inert=false;sceneChanging=false;document.getElementById(focusId)?.focus({preventScroll:true});return true;
}
function personalSummary(){
 const concern=answers[2]===1?'خوابت کم یا نامنظم است':answers[2]===2?'با خستگی بیدار می‌شوی':answers[0]===2?'بیشتر وقت‌ها احساس خستگی می‌کنی':answers[4]===2?'فشار ذهنی روی روزمره‌ات اثر گذاشته':null;
 const goal=questions[5].answers[answers[5]];
 return concern?'گفتی '+concern+'. در اولین گفت‌وگو، همین دغدغه و سوابقت را با پزشک مرور می‌کنی.':'انتظارت این بود: «'+goal+'». اولین گفت‌وگو را از دغدغه‌ها و سوابق خودت شروع می‌کنید.';
}
async function openDoctors(){
 current=questions.length;feedback.classList.remove('saving');feedbackText.textContent='پاسخ‌ها کامل شد؛ حالا پزشک همراهت را انتخاب کن.';
 document.getElementById('personal-summary').textContent=personalSummary();

 if(fillLevel<.99&&!reduced.matches)await new Promise(resolve=>setTimeout(resolve,650));
 await swapScene(doctorScene,'doctors-title');
}
function renderCalendar(){
 const calendar=document.getElementById('calendar-days');calendar.replaceChildren();
 sampleDays.forEach((date,day)=>{
  const states=availability(selectedDoctor,day),free=states.filter(s=>s.status==='available').length,closed=states.every(s=>s.status==='closed');
  const btn=document.createElement('button');btn.type='button';btn.className='calendar-day';btn.setAttribute('aria-pressed',String(day===selectedDay));
  const status=closed?'بدون نوبت':free?fa(free)+' وقت خالی':'تکمیل ظرفیت';
  btn.setAttribute('aria-label',dateFmt.format(date)+'، '+status);btn.dataset.availability=closed?'closed':free?'available':'full';
  btn.innerHTML='<span>'+dayFmt.format(date)+'</span><strong>'+shortDateFmt.format(date)+'</strong><small>'+status+'</small>';
  btn.onclick=()=>{if(day===selectedDay)return;selectedDay=day;selectedSlot=null;calendar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===day)));renderSlots();persistQuietly()};calendar.append(btn);
 });
}
function renderSlots(){
 const slots=document.getElementById('slots');slots.replaceChildren();
 const states=availability(selectedDoctor,selectedDay),free=states.filter(s=>s.status==='available').length,closed=states.every(s=>s.status==='closed');
 document.getElementById('selected-day-label').textContent=dateFmt.format(sampleDays[selectedDay]);
 document.getElementById('day-availability').textContent=closed?'پزشک در این روز نوبت ندارد.':free?'ساعت مناسب را انتخاب کن.':'ظرفیت این روز تکمیل شده؛ روز دیگری را انتخاب کن.';
 document.getElementById('confirm-slot').disabled=selectedSlot===null;
 document.getElementById('slot-status').textContent=selectedSlot===null?'هنوز زمانی انتخاب نکرده‌ای.':dateFmt.format(sampleDays[selectedDay])+'، ساعت '+fa(selectedDoctor.times[selectedSlot])+' را انتخاب کردی.';
 states.forEach(({time,status},index)=>{
  const btn=document.createElement('button');btn.type='button';btn.className='slot';btn.disabled=status!=='available';btn.dataset.status=status;btn.setAttribute('aria-pressed',String(index===selectedSlot));
  const label=status==='booked'?'پر شده':status==='closed'?'بدون نوبت':'قابل انتخاب';btn.setAttribute('aria-label',dateFmt.format(sampleDays[selectedDay])+' ساعت '+fa(time)+'، '+label);
  btn.innerHTML='<strong>'+fa(time)+'</strong><span>'+label+'</span>';
  btn.onclick=()=>{if(status!=='available')return;selectedSlot=index;slots.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));document.getElementById('slot-status').textContent=dateFmt.format(sampleDays[selectedDay])+'، ساعت '+fa(time)+' را انتخاب کردی.';document.getElementById('confirm-slot').disabled=false;persistQuietly()};slots.append(btn);
 });
}
function selectDoctor(d){
 if(sceneChanging)return;selectedDoctor=d;selectedSlot=null;selectedDay=firstAvailable(d)?.day??0;
 const photo=document.getElementById('booking-photo');photo.src=photoFor(d).src;photo.alt=photoFor(d).alt;document.getElementById('booking-name').textContent=d.name;
 renderCalendar();renderSlots();swapScene(bookingScene,'booking-title');
}
async function confirmSlot(){
 if(sceneChanging||!selectedDoctor||selectedSlot===null||availability(selectedDoctor,selectedDay)[selectedSlot]?.status!=='available')return;
 appointment={doctor:selectedDoctor,day:selectedDay,date:sampleDays[selectedDay].toISOString().slice(0,10),slot:selectedSlot};
 renderHome();
 await swapScene(confirmationScene,'confirmation-title');
}
const reviewDialog=document.getElementById('review-dialog');
document.getElementById('review-answers').onclick=()=>{
 const list=document.getElementById('review-list');list.replaceChildren();
 questions.forEach((q,i)=>{const btn=document.createElement('button');btn.type='button';btn.innerHTML='<small></small><strong></strong>';btn.querySelector('small').textContent=q.topic+' · اصلاح';btn.querySelector('strong').textContent=q.answers[answers[i]];btn.onclick=async()=>{reviewDialog.close();current=i;editing=true;render();await swapScene(document.getElementById('intake-scene'),'question')};list.append(btn)});reviewDialog.showModal();
};
document.getElementById('close-review').onclick=()=>reviewDialog.close();
document.getElementById('change-doctor').onclick=()=>swapScene(doctorScene,'doctors-title');
document.getElementById('confirm-slot').onclick=confirmSlot;
document.getElementById('change-time').onclick=()=>editAppointment();
__MEMBER_HOME_JS__
makeDoctors();
