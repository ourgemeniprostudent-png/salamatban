const DEMO_MEDICATIONS=__DEMO_MEDICATIONS__;
const DEMO_DOCUMENTS=__DEMO_DOCUMENTS__;
function demoBlob(encoded,type){return new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type})}
function dateShift(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function fullMaryamRecord(){
 const base=freshRecord('maryam'),now=todayIR(),stamp=d=>d+'T09:00:00+03:30';
 const encounters=[
 ['e1','2026-02-02','شناخت اولیه خستگی و نظم خواب','خستگی صبح و وعده های نامنظم در روزهای کاری مطرح شد. ابتدا سوابق و مدارک بررسی می‌شوند.','کار اداری، تحرک کم و خواب متغیر به گفته بیمار؛ سابقه بیماری مزمن شناخته شده گزارش نشده است.','علت خستگی هنوز مشخص نیست؛ نیاز به مرور مدارک و شرح خواب.','مدارک آزمایش اولیه را با کمک کارشناس آماده کنید.','2026-02-12'],
 ['e2','2026-02-12','مرور آزمایش اولیه و تعیین مسیر','آزمایش اولیه با شرح حال مرور شد؛ پیگیری روی الگوی خواب، وعده ها و فعالیت روزانه ادامه دارد.','اصل گزارش آزمایش دیده شد؛ فهرست داروها و حساسیت ها با بیمار مرور شد.','پاسخ بدن به تغییر عادت ها و الگوی واقعی خواب باید در پیگیری روشن شود.','جلسه تغذیه و ثبت وعده ها را با کارشناس هماهنگ کنید.','2026-03-05'],
 ['e3','2026-03-05','مرور برنامه تغذیه','برنامه متخصص دریافت شد. بیمار ثبت وعده ها را شروع می‌کند و فشار خون خانگی با روش مشخص ثبت خواهد شد.','گزارش متخصص تغذیه با تاریخ و منبع در پرونده قرار گرفت.','داده کافی از اندازه گیری های خانگی نداریم.','برگه اندازه گیری خانگی را برای مرور بعدی آماده کنید.','2026-05-04'],
 ['e4','2026-05-04','مرور اندازه گیری های خانگی','برگه فشار خون مرور شد. برای ادامه مراقبت، تداوم ثبت و ارزیابی در جلسه بعد در نظر گرفته شد.','چهار اندازه گیری خانگی با واحد و زمان ثبت شده اند.','این داده محدود برای نتیجه گیری درباره روند بلندمدت کافی نیست.','پیگیری متخصص تغذیه برای بررسی اجرای برنامه انجام شود.','2026-07-09'],
 ['e5','2026-07-09','بررسی اجرای برنامه و موانع','گزارش تغذیه پیگیری دریافت شد. نظم وعده ها بهتر شده اما روزهای کاری هنوز مانع تداوم هستند.','وزن در گزارش مرکز ۷۶.۲ کیلوگرم ثبت شده؛ منبع و تاریخ موجود است.','پایداری عادت ها و وضعیت خواب در دوره بعد باید مرور شود.','دفتر خواب را تکمیل و مدارک تازه را برای جلسه بعد آماده کنید.','2026-10-17'],
 ['e6','2026-10-17','آماده سازی مرور دوره بعد','روش ثبت دفتر خواب و فهرست داروها مرور شد. قرار شد دفتر تکمیل شده و گزارش آزمایش تازه برای جلسه بعد آماده شوند.','فهرست نمونه دارو و مکمل با بیمار مرور شد: ویتامین D3 در فهرست جاری و ستیریزین در صورت نیاز ثبت شده اند؛ دوره قبلی استامینوفن پایان یافته است. حساسیت دارویی شناخته شده گزارش نشده و باید بازبینی شود.','گزارش تازه هنوز بررسی نشده و کیفیت خواب نیاز به گفت وگوی بیشتر دارد.','پس از بررسی گزارش جدید، قدم بعد با پزشک همراه مشخص می‌شود.',dateShift(now,3)]
 ].map(([id,date,title,summary,known,unknown,next,due])=>({id,title,at:stamp(date),doctor:'nazanin',summary,known,unknown,next,due,kind:'none',appointment:{doctorId:'nazanin',date,time:'09:30'}}));
 const task=(id,e,title,why,due,status,reportId,assignee='coord1')=>({id,encounterId:e,doctor:'nazanin',assignee,title,why,kind:'test',due,status,reportId,history:[]});
 const tasks=[
 task('t1','e1','دریافت و مرور آزمایش اولیه','پزشک برای شناخت اولیه، اصل مدارک موجود را نیاز دارد.','2026-02-12','closed','lab-baseline'),
 task('t2','e2','جلسه اولیه متخصص تغذیه','کمک به اجرای برنامه متناسب با ساعت کاری و نظم وعده ها.','2026-03-05','closed','nutrition'),
 task('t3','e3','دریافت برگه فشار خون خانگی','مرور داده های ثبت شده با منبع و زمان اندازه گیری.','2026-05-04','closed','pressure','coord2'),
 task('t4','e4','پیگیری برنامه تغذیه','بررسی موانع اجرای برنامه و گزارش پیشرفت توسط متخصص.','2026-07-09','closed','nutrition-followup'),
 task('t5','e6','بررسی آزمایش پیگیری','گزارش جدید دریافت شده؛ توضیح و قدم بعد باید توسط پزشک ثبت شود.',dateShift(now,1),'reported','lab-recent'),
 task('t6','e6','هماهنگی جلسه پیگیری خواب','مرور دفتر خواب و جمع بندی پرسش های باقی مانده.',dateShift(now,2),'confirmed',null),
 task('t7','e6','دریافت نسخه برنامه تغذیه از مرکز','نسخه کامل برنامه جلسه گذشته هنوز از مرکز دریافت نشده است.',dateShift(now,-2),'contacted',null,'coord2'),
 task('t8','e6','هماهنگی مرور روش ثبت فعالیت','اطمینان از اینکه بیمار روش ثبت فعالیت روزمره را درست متوجه شده است.',dateShift(now,4),'requested',null),
 task('t9','e6','تایید دریافت برنامه ثبت خواب','برنامه ثبت خواب در جلسه پزشک مطرح شده است؛ دریافت آن را تایید کنید تا کارشناس پیگیری دوره را انجام دهد.',dateShift(now,3),'proposed',null)
 ];
 const center={place:'مرکز نمونه سلامت (ساختگی)',address:'تهران، آدرس فرضی برای نمایش محصول',phone:'۰۲۱۰۰۰۰۰۰۰۰'};
 tasks.forEach((t,i)=>{
  const doc=DEMO_DOCUMENTS.find(d=>d.id===t.reportId),date=doc?.dateISO||dateShift(now,i===5?2:-3),requested=encounters.find(e=>e.id===t.encounterId).at;
  t.history.push({at:requested,actor:'nazanin',text:'درخواست پزشک: '+t.title});
  if(t.status==='requested')return;
  t.contact='تماس نمونه انجام شد؛ اطلاعات لازم با بیمار و مرکز هماهنگ شد.';t.history.push({at:stamp(dateShift(date,i===5?-4:-3)),actor:t.assignee,text:'تماس با بیمار و مرکز ثبت شد'});
  if(t.status==='contacted'){t.issue={reason:'مرکز هنوز فایل برنامه را نفرستاده است',next:'تماس دوباره با مرکز و درخواست نسخه کامل برنامه',due:dateShift(now,-1)};t.history.push({at:stamp(dateShift(now,-2)),actor:t.assignee,text:'مرکز پاسخ داد؛ ارسال فایل به روز بعد موکول شد'});return}
  t.offer={...center,date,time:'10:00'};t.history.push({at:stamp(dateShift(date,i===5?-3:-2)),actor:t.assignee,text:'زمان پیشنهادی با مشخصات مرکز ارسال شد'},{at:stamp(dateShift(date,i===5?-2:-1)),actor:'maryam',text:'زمان توسط بیمار تایید شد'});
  if(t.status==='confirmed')return;
  t.visitNote='انجام مراجعه در سناریوی ساختگی با بیمار پیگیری و ثبت شد.';t.history.push({at:stamp(date),actor:t.assignee,text:'انجام مراجعه ثبت شد'},{at:date+'T14:00:00+03:30',actor:t.assignee,text:'اصل گزارش دریافت و برای پزشک فرستاده شد'});
  if(t.status==='closed'){
   const reviews=[['آزمایش اولیه با سابقه و گفت وگو مرور شد؛ برای خستگی، بررسی خواب و سبک زندگی ادامه دارد.','جلسه تغذیه و مرور نظم وعده ها انجام شود.'],['گزارش متخصص دریافت شد و هدف ثبت وعده ها در پرونده قرار گرفت.','ثبت خانگی درخواست شده برای جلسه بعد آماده شود.'],['اندازه گیری های خانگی با روش گزارش شده مرور شد؛ از چهار عدد نتیجه قطعی درباره بیماری نمی‌گیریم.','پیگیری برنامه تغذیه و ثبت داده ها ادامه یابد.'],['گزارش پیگیری تغذیه مرور شد؛ اجرای عادت ها در روزهای کاری همچنان نیاز به پیگیری دارد.','دفتر خواب و مدارک تازه برای گفت وگوی بعد آماده شود.']][i];
   t.review={doctor:'nazanin',at:stamp(t.due),text:reviews[0],next:reviews[1],due:encounters[i+1]?.due||dateShift(now,7)};t.history.push({at:t.review.at,actor:'nazanin',text:'نظر پزشک و قدم بعد برای بیمار منتشر شد'});
  }
 });
 const types=['records','appointment','records','care','lab','appointment','records','care','care'];
 tasks.forEach((t,i)=>{const prior=t.status,oldHistory=t.history;t.path=newPath(types[i]);const steps=pathSteps(t);const stop=prior==='closed'?steps.length:prior==='reported'?steps.findIndex(s=>s[0]==='review'):prior==='proposed'?steps.findIndex(s=>s[0]==='ack'):prior==='confirmed'?steps.findIndex(s=>s[0]==='visit'):prior==='contacted'?steps.findIndex(s=>s[0]==='report'):0;t.history=[oldHistory[0]];for(const step of steps.slice(0,stop)){const actor=step[2]==='member'?'maryam':step[2]==='doctor'?'nazanin':t.assignee;const at=step[0]==='review'?t.review.at:oldHistory.find(h=>h.actor===actor)?.at||oldHistory[0].at;const values=step[3]==='center'?{...center}:step[3]==='offer'?{date:t.offer?.date,time:t.offer?.time}:step[3]==='file'?{description:'سند ساختگی با منبع و تاریخ؛ '+t.title,documentId:t.reportId}:{note:'اقدام ساختگی ثبت شده: '+step[1]};t.path.steps[step[0]]={actor,at,values};t.history.push({actor,at,text:step[1],step:step[0]})}if(['appointment','lab'].includes(types[i]))t.center={...center};else delete t.offer;t.status=pathStatus(t);if(t.issue)t.history.push({at:stamp(dateShift(now,-2)),actor:t.assignee,text:t.issue.reason+'؛ '+t.issue.next})});
 return {...base,stage:'home',current:5,answers:[2,2,1,1,1,1],appointment:{doctorId:'nazanin',date:now,time:'10:30'},demoScenario:'maryam-complete-v3',scenarioAsOf:'2026-10-30',joinedAt:'2026-02-02',medications:structuredClone(DEMO_MEDICATIONS),personal:{firstName:'مریم',lastName:'کیانی',birthDate:'1987-05-14',gender:'female',city:'تهران',province:'تهران',occupation:'کارمند اداری',insurance:'بیمه پایه نمونه',email:'maryam@example.invalid',emergencyName:'خواهر مریم (نمونه)',emergencyRelation:'خواهر',emergencyPhone:'09000000099',contactPreference:'تماس عصرها، ساعت ۱۶ تا ۱۸'},profile:{name:'مریم کیانی',birthDate:'1987-05-14',city:'تهران',occupation:'کارمند اداری',insurance:'بیمه پایه نمونه',contactPreference:'تماس عصرها، ساعت ۱۶ تا ۱۸',emergencyContact:'خواهر · شماره تماس ساختگی ۰۹۰۰۰۰۰۰۰۹۹',height:165,history:'بیماری مزمن شناخته شده به گفته بیمار گزارش نشده است؛ سوابق در جلسه پزشک مرور شده اند.',allergies:'حساسیت شناخته شده گزارش نشده؛ خوداظهاری بیمار، نیازمند بازبینی',medication:'ویتامین D3 و ستیریزین در فهرست جاری نمونه؛ دوره استامینوفن پایان یافته است. منبع: برگه مرور دارو ۲۵ مهر ۱۴۰۵',goal:'شناخت علت خستگی و داشتن پیگیری منظم و قابل اجرا',source:'جلسه پزشک و خوداظهاری ساختگی بیمار',updatedAt:'2026-10-17'},measurements:[{date:'2026-03-03',kind:'وزن',value:80,unit:'kg',documentId:'nutrition'},{date:'2026-07-06',kind:'وزن',value:76.2,unit:'kg',documentId:'nutrition-followup'}],care:{encounters,tasks}};
}
async function installMaryamSample(replace=false){
 const candidate=fullMaryamRecord();let changed=false;
 await new Promise((resolve,reject)=>{const tx=db.transaction(['users','documents'],'readwrite'),s=tx.objectStore('users'),q=s.get('maryam');q.onsuccess=()=>{
  const old=q.result;
  if(!replace&&old&&(old.sampleDisabled||old.demoScenario||old.revision>0||old.appointment||old.answers?.some(x=>x!==null)))return;
  const docs=tx.objectStore('documents'),cursor=docs.index('owner').openCursor(IDBKeyRange.only('maryam'));cursor.onsuccess=()=>{const c=cursor.result;if(c){c.delete();c.continue()}else{
   for(const d of DEMO_DOCUMENTS){const imageDoc=d.id==='sleep-diary',type=imageDoc?'image/png':'application/pdf',blob=demoBlob(imageDoc?d.preview:d.pdf,type);docs.put({key:'maryam:'+d.id,id:d.id,owner:'maryam',generation:candidate.generation,name:d.title+(imageDoc?'.png':'.pdf'),type,size:blob.size,modified:new Date(d.dateISO).getTime(),blob,previewBlob:demoBlob(d.preview,'image/png'),source:'fixture',fixtureId:d.id,createdAt:d.dateISO,taskId:candidate.care.tasks.find(t=>t.reportId===d.id)?.id})}
  }};s.put(candidate);changed=true;
 };tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('ساخت نمونه انجام نشد.'))});
 if(changed)announceChange('maryam');return changed;
}
async function restoreMaryamDemo(){if(!window.confirm('فقط اطلاعات مریم کیانی با پرونده کامل ساختگی جایگزین شود؟ داده های فعلی این حساب پاک می‌شوند.'))return;try{await installMaryamSample(true);if(staffActor){workSelected=null;await refreshWork();workFeedback('پرونده کامل مریم بارگذاری شد.')}else if(currentUser?.id==='maryam'){resetDialog.close();await restoreUser(await getUser('maryam'))}}catch(e){storageError(e)}}
$('restore-maryam').onclick=restoreMaryamDemo;
