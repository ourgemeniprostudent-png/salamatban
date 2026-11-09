let catalogFilter='all',catalogQuery='',catalogOpen=null;
const CATALOG_CATEGORIES=[
 {id:'heart',about:'چربی خون و قند، برای تصویر کلی قلب و سوخت و ساز.'},
 {id:'nutrient',about:'ویتامین و مواد معدنی که بدن از غذا یا نور می‌گیرد.'},
 {id:'hormone',about:'هورمون های تیرویید و پیامی که مقدار آنها را تنظیم می‌کند.'},
 {id:'energy',about:'خواب و تحرک ثبت شده. این دسته آزمایش خون نیست.'},
 {id:'blood',label:'خون',about:'شمار و اندازه سلول های خون.',icon:'M12 21c4-3 7-6.2 7-10a7 7 0 0 0-14 0c0 3.8 3 7 7 10z'},
 {id:'kidney',label:'کلیه',about:'مواد دفعی که نشان می‌دهند کلیه خون را چطور پاک می‌کند.',icon:'M8 4c4 0 6 3 6 8s-2 8-6 8c2-2 3-4.5 3-8s-1-6-3-8z M16 4c-4 0-6 3-6 8s2 8 6 8c-2-2-3-4.5-3-8s1-6 3-8z'},
 {id:'liver',label:'کبد',about:'آنزیم و پروتیین هایی که کار کبد را نشان می‌دهند.',icon:'M4 14c2-6 6-8 8-8 3 0 8 2 8 7 0 4-3 7-8 7H8c-2 0-4-2-4-6z'}
].map(extra=>{const base=TRACK_CATEGORIES.find(c=>c.id===extra.id)||{id:extra.id,label:extra.label,icon:extra.icon};return {...base,...extra}});
const CATALOG_ITEMS=[
 {id:'ldl',category:'heart',name:'کلسترول LDL',why:'بخشی از کلسترول خون که در دیواره رگ می‌نشیند. برای نگاه به قلب بررسی می‌شود.',charted:true},
 {id:'glucose',category:'heart',name:'قند ناشتا',why:'قند خون پس از چند ساعت نخوردن. برای دیدن تنظیم قند در همان نوبت استفاده می‌شود.',charted:true},
 {id:'hdl',category:'heart',name:'کلسترول HDL',why:'بخشی از کلسترول که کلسترول را از رگ برمی‌گرداند. کنار LDL خوانده می‌شود.',unit:'mg/dL',band:[40,90],latest:58},
 {id:'triglycerides',category:'heart',name:'تری گلیسیرید',why:'چربی در گردش خون که اغلب همراه قند و وعده غذایی دیده می‌شود.',unit:'mg/dL',band:[0,150],latest:168},
 {id:'total-cholesterol',category:'heart',name:'کلسترول تام',why:'جمع کلسترول های خون. به تنهایی تصویر کامل قلب نیست.',unit:'mg/dL',band:[0,200],latest:186},
 {id:'hba1c',category:'heart',name:'هموگلوبین A1c',why:'میانگین قند متصل به هموگلوبین در چند ماه اخیر.',unit:'%',band:[4,5.7],latest:5.4},
 {id:'vitamin-d',category:'nutrient',name:'ویتامین D',why:'ویتامینی که با نور و تغذیه می‌آید. برای استخوان و عضله نگاه می‌شود.',charted:true},
 {id:'ferritin',category:'nutrient',name:'فریتین',why:'ذخیره آهن بدن. جدا از آهن همان روز خون خوانده می‌شود.',charted:true},
 {id:'b12',category:'nutrient',name:'ویتامین B12',why:'ویتامینی برای ساخت گلبول قرمز و کار عصب.',unit:'pg/mL',band:[200,900],latest:412},
 {id:'folate',category:'nutrient',name:'فولات',why:'ویتامینی برای ساخت سلول تازه. معمولا کنار B12 دیده می‌شود.',unit:'ng/mL',band:[3,20],latest:9.4},
 {id:'serum-iron',category:'nutrient',name:'آهن سرم',why:'آهن در گردش خون در همان نوبت نمونه.',unit:'µg/dL',band:[50,170],latest:74},
 {id:'magnesium',category:'nutrient',name:'منیزیم',why:'معدنی درگیر عضله، عصب و ریتم قلب.',unit:'mg/dL',band:[1.7,2.4],latest:2},
 {id:'tsh',category:'hormone',name:'TSH',why:'پیامی از مغز به تیرویید برای تنظیم هورمون.',charted:true},
 {id:'ft4',category:'hormone',name:'تیروکسین آزاد (T4)',why:'هورمون اصلی تیرویید در خون، جدا از پروتیین حامل.',unit:'ng/dL',band:[0.8,1.8],latest:1.2},
 {id:'ft3',category:'hormone',name:'تری یدوتیرونین آزاد (T3)',why:'شکل فعال تر هورمون تیرویید.',unit:'pg/mL',band:[2.3,4.2],latest:3.1},
 {id:'tpo',category:'hormone',name:'پادتن پراکسیداز تیرویید (TPO)',why:'پادتنی که گاهی علیه بافت تیرویید ساخته می‌شود.',unit:'IU/mL',band:[0,34],latest:12},
 {id:'sleep-hours',category:'energy',name:'خواب شبانه',why:'ساعت خواب شب از یادداشت نمونه. این ردیف آزمایش خون نیست.',charted:true},
 {id:'steps',category:'energy',name:'گام روزانه',why:'شمار گام در روز برای دیدن تحرک. این ردیف آزمایش خون نیست.'},
 {id:'hemoglobin',category:'blood',name:'هموگلوبین',why:'پروتیینی در گلبول قرمز که اکسیژن را حمل می‌کند.',unit:'g/dL',band:[12,15.5],latest:13.2},
 {id:'hematocrit',category:'blood',name:'هماتوکریت',why:'سهم گلبول قرمز از حجم خون.',unit:'%',band:[36,46],latest:39},
 {id:'wbc',category:'blood',name:'گلبول سفید',why:'شمار سلول های دفاعی خون.',unit:'K/µL',band:[4,11],latest:6.4},
 {id:'platelets',category:'blood',name:'پلاکت',why:'سلول هایی که در بند آمدن خون نقش دارند.',unit:'K/µL',band:[150,400],latest:238},
 {id:'mcv',category:'blood',name:'حجم متوسط گلبول قرمز (MCV)',why:'اندازه متوسط هر گلبول قرمز.',unit:'fL',band:[80,98],latest:88},
 {id:'creatinine',category:'kidney',name:'کراتینین',why:'ماده ای که کلیه آن را از خون پاک می‌کند.',unit:'mg/dL',band:[0.5,1.1],latest:0.8},
 {id:'urea',category:'kidney',name:'اوره',why:'محصول تجزیه پروتیین که کلیه دفع می‌کند.',unit:'mg/dL',band:[15,45],latest:28},
 {id:'egfr',category:'kidney',name:'برآورد کارکرد کلیه (eGFR)',why:'عدد محاسبه شده از کراتینین. آزمایش جداگانه ای با لوله جدا نیست.',unit:'mL/min',band:[90,120],latest:96},
 {id:'alt',category:'liver',name:'آنزیم ALT',why:'آنزیمی که بیشتر در سلول کبد است.',unit:'U/L',band:[0,33],latest:21},
 {id:'ast',category:'liver',name:'آنزیم AST',why:'آنزیمی در کبد و عضله.',unit:'U/L',band:[0,32],latest:18},
 {id:'bilirubin',category:'liver',name:'بیلی روبین',why:'رنگدانه ای از تجزیه گلبول قرمز که کبد آن را دفع می‌کند.',unit:'mg/dL',band:[0.2,1.2],latest:0.6},
 {id:'alp',category:'liver',name:'آلکالن فسفاتاز',why:'آنزیمی که در کبد و استخوان دیده می‌شود.',unit:'U/L',band:[40,120],latest:72},
 {id:'albumin',category:'liver',name:'آلبومین',why:'پروتیین اصلی خون که کبد می‌سازد.',unit:'g/dL',band:[3.5,5.2],latest:4.5}
];
const CATALOG_FEATURED=['ldl','vitamin-d','tsh','glucose'];
function catalogVisible(){const q=catalogQuery.trim().replace(/\s+/g,' ').toLowerCase();return CATALOG_ITEMS.filter(item=>(catalogFilter==='all'||item.category===catalogFilter)&&(!q||(item.name+' '+item.why).toLowerCase().includes(q)))}
function catalogReading(item,publicMode){
 if(item.id==='steps'){const life=TRACK_LIFESTYLE.steps,value=life.values.at(-1);return {value,unit:life.unit,inBand:value>=life.band[0]&&value<=life.band[1]}}
 if(item.charted){
  if(!publicMode&&currentUser){const marker=trackMarkers(currentUser).find(m=>m.id===item.id);if(marker)return {value:marker.latest,unit:marker.unit,inBand:marker.inBand}}
  const raw=TRACK_MARKERS.find(m=>m.id===item.id),value=raw.values[Math.min(2,raw.values.length-1)];
  return {value,unit:raw.unit,inBand:value>=raw.band[0]&&value<=raw.band[1]}
 }
 return {value:item.latest,unit:item.unit,inBand:item.latest>=item.band[0]&&item.latest<=item.band[1]}
}
function catalogValue(reading){return `<span class="catalog-value ${reading.inBand?'is-in':'is-out'}"><strong>${trackNum(reading.value)}</strong><small dir="ltr">${esc(reading.unit)}</small></span>`}
function catalogMarkup(publicMode){
 const visible=catalogVisible();
 const featured=CATALOG_FEATURED.map(id=>CATALOG_ITEMS.find(item=>item.id===id));
 const featureCards=featured.map(item=>{const marker=!publicMode&&item.charted?trackMarkers(currentUser).find(m=>m.id===item.id):null;const category=CATALOG_CATEGORIES.find(c=>c.id===item.category);const reading=catalogReading(item,publicMode);return `<button type="button" class="catalog-feature" data-catalog-open="${item.id}"><span class="scene-kicker">${esc(category.label)}</span><span class="catalog-feature-top"><h3>${esc(item.name)}</h3>${catalogValue(reading)}</span><p>${esc(item.why)}</p>${marker?`<div class="track-chart-wrap">${trackLine(marker.points,marker.band,{w:220,h:64,spark:true})}</div>`:''}</button>`}).join('');
 const jumps=[{id:'all',label:'همه',count:CATALOG_ITEMS.length},...CATALOG_CATEGORIES.map(c=>({id:c.id,label:c.label,count:CATALOG_ITEMS.filter(i=>i.category===c.id).length}))].map(c=>`<button type="button" class="catalog-jump" data-catalog-filter="${c.id}" aria-pressed="${catalogFilter===c.id}">${esc(c.label)} · ${fa(c.count)}</button>`).join('');
 const groups=CATALOG_CATEGORIES.filter(c=>catalogFilter==='all'||c.id===catalogFilter).map(c=>{
  const rows=visible.filter(item=>item.category===c.id);if(!rows.length)return '';
  const items=rows.map(item=>{const chartHint=!publicMode&&item.charted,open=!chartHint&&catalogOpen===item.id,reading=catalogReading(item,publicMode);const place=reading.inBand?'داخل بازه نمایشی':'بیرون بازه نمایشی';const blurb=open?`<p class="catalog-blurb">${esc(item.why)}${publicMode&&item.charted?' روند نمونه پس از ورود، در صفحه روند و اهداف باز می‌شود.':''}</p>`:'';return `<div class="catalog-entry${open?' is-open':''}"><button type="button" class="catalog-row" data-catalog-item="${item.id}" aria-label="${esc(item.name)}، آخرین عدد ${trackNum(reading.value)} ${esc(reading.unit)}، ${place}${chartHint?'، نمودار':''}" ${chartHint?'':`aria-expanded="${open}"`}><span class="catalog-row-name">${esc(item.name)}</span>${catalogValue(reading)}<span class="catalog-row-meta"><span class="catalog-pill ${reading.inBand?'is-in':'is-out'}">${reading.inBand?'داخل':'بیرون'}</span>${chartHint?'<span class="catalog-chart">نمودار</span>':''}<svg class="catalog-chevron${open?' is-open':''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${chartHint?'M14 6l-6 6 6 6':'M6 9l6 6 6-6'}"/></svg></span></button>${blurb}</div>`}).join('');
  return `<section class="catalog-group" data-catalog-group="${c.id}"><header><h2>${esc(c.label)}<span class="catalog-count">${fa(rows.length)}</span></h2><p class="catalog-about">${esc(c.about)}</p></header><div class="catalog-cols" aria-hidden="true"><span>شاخص</span><span>آخرین عدد</span><span>وضعیت</span></div><div class="catalog-rows">${items}</div></section>`}).join('');
 return `<div class="catalog-sheet"><p class="member-page-lead">هر ردیف آخرین عدد نمونه را نشان می‌دهد. با باز کردن ردیف، یک خط می‌گوید این شاخص چیست.</p><p class="catalog-note">این فهرست یک پنل نمونه است، نه منوی آزمایشگاه، نه تشخیص و نه مراقبت تاییدشده. عددها نتیجه آزمایش تازه نیستند. نوار رنگی نمودارها فقط راهنمای نمایش است.</p><div class="catalog-feature-row" aria-label="شاخص های دارای روند">${featureCards}</div><label class="catalog-search"><span class="sr-only">جستجوی شاخص</span><input class="catalog-search-input" type="search" inputmode="search" placeholder="جستجوی نام شاخص" value="${esc(catalogQuery)}" autocomplete="off"></label><div class="catalog-jumps" role="group" aria-label="دسته ها">${jumps}</div>${groups||'<div class="member-empty">در این انتخاب موردی نیست.</div>'}</div>`
}
function catalogChoose(id,publicMode,fromFeature){const item=CATALOG_ITEMS.find(x=>x.id===id);if(!item)return;if(item.charted&&!publicMode){openCatalogChart(id);return}if(fromFeature)catalogFilter=item.category;catalogOpen=catalogOpen===id&&!fromFeature?null:id;paintCatalog(publicMode);const host=publicMode?document.getElementById('public-catalog'):memberContent;const opened=host.querySelector('.catalog-blurb');if(opened)opened.scrollIntoView({block:'nearest'})}
function openCatalogChart(id){trackingReturn='catalog';trackingFocus='marker:'+id;trackingNotice='';memberPage='tracking';memberTask=null;renderMemberCare();$('member-page-title').focus({preventScroll:true})}
function paintCatalog(publicMode){const host=publicMode?document.getElementById('public-catalog'):memberContent;host.innerHTML=catalogMarkup(publicMode);bindCatalog(host,publicMode)}
function bindCatalog(root,publicMode){const input=root.querySelector('.catalog-search-input');if(input)input.oninput=()=>{catalogQuery=input.value;catalogOpen=null;paintCatalog(publicMode);const next=(publicMode?document.getElementById('public-catalog'):memberContent).querySelector('.catalog-search-input');if(next){next.focus({preventScroll:true});const n=next.value.length;next.setSelectionRange(n,n)}};root.querySelectorAll('[data-catalog-filter]').forEach(b=>b.onclick=()=>{catalogFilter=b.dataset.catalogFilter;catalogOpen=null;paintCatalog(publicMode)});root.querySelectorAll('[data-catalog-item]').forEach(b=>b.onclick=()=>catalogChoose(b.dataset.catalogItem,publicMode,false));root.querySelectorAll('[data-catalog-open]').forEach(b=>b.onclick=()=>catalogChoose(b.dataset.catalogOpen,publicMode,true))}
function catalogPage(){return catalogMarkup(false)}
