/** User-reported preferences, never a diagnosis, triage score or clinician decision. */
export const visitReasons = [
  {id:'condition',title:'پیگیری بیماری مشخص',description:'برای بیماری‌ای که می‌شناسم، همراهی می‌خواهم.',icon:'heart',questions:[['condition_detail','کدام بیماری را می‌خواهید پیگیری کنید؟'],['condition_impact','این روزها چه چیزی در زندگی روزمره بیشتر اذیت‌تان می‌کند؟']],goals:['پیگیری منظم‌تر مراقبت‌هایم','بهتر فهمیدن برنامهٔ درمانی‌ام','کمتر شدن اثر بیماری بر زندگی روزمره']},
  {id:'symptom',title:'علامت تازه یا نگرانی',description:'چیزی تغییر کرده و می‌خواهم قدم بعدی را بدانم.',icon:'shield',questions:[['symptom_detail','چه علامت یا نگرانی‌ای دارید؟ از چه زمانی شروع شده؟'],['symptom_impact','شدت و اثر آن بر کارهای روزمره چطور است؟']],goals:['روشن شدن قدم بعدی برای بررسی علامتم','شناختن زمان مناسب مراجعه','کمتر شدن نگرانی با راهنمایی پزشک']},
  {id:'prevention',title:'شناخت و پیشگیری',description:'می‌خواهم آگاهانه‌تر مراقب سلامتم باشم.',icon:'search',questions:[['prevention_detail','چه چیزی شما را به فکر بررسی سلامت انداخته؟'],['prevention_previous','قبلاً چه بررسی یا مراقبتی داشته‌اید؟']],goals:['دانستن مراقبت‌های مناسب شرایط خودم','داشتن مسیر مشخص برای پیگیری سلامت','فهمیدن اولویت‌های مراقبت با نظر پزشک']},
  {id:'wellbeing',title:'حال بهتر در روزمره',description:'خواب، انرژی، تحرک یا عادت‌های روزانه.',icon:'sun',questions:[['wellbeing_detail','بیشتر دوست دارید چه چیزی تغییر کند: خواب، انرژی، تغذیه، تحرک یا استرس؟'],['wellbeing_barrier','چه چیزی تا امروز تغییر را سخت کرده؟']],goals:['ساختن یک عادت کوچک و قابل ادامه','داشتن انرژی بیشتر در زندگی روزمره','پیدا کردن برنامه‌ای متناسب با شرایط زندگی‌ام']},
  {id:'report',title:'فهمیدن آزمایش یا مدرک',description:'برای فهم نتیجه و قدم بعدی کمک می‌خواهم.',icon:'file',questions:[['report_detail','این مدرک مربوط به چه زمانی و چه بررسی‌ای است؟'],['report_question','دقیقاً کدام بخش یا سؤال ذهن‌تان را مشغول کرده؟']],goals:['فهمیدن نتیجه با توضیح پزشک','دانستن اینکه پیگیری دیگری لازم است یا نه','آماده شدن برای گفت‌وگو با پزشک']},
  {id:'unsure',title:'هنوز دقیق نمی‌دانم',description:'با چند سؤال کمکم کنید از جایی شروع کنم.',icon:'help',questions:[['unsure_detail','چه چیزی باعث شد امروز به سلامت‌بان بیایید؟'],['unsure_change','اگر این همراهی مفید باشد، چه تغییری را دوست دارید حس کنید؟']],goals:['با کمک پزشک اولویتم را پیدا کنم','بدانم از کجا شروع کنم']},
] as const;
export type VisitReason = typeof visitReasons[number]['id'];
export type Journey = {version:2;reasons:VisitReason[];primary:VisitReason|'';context:Record<string,string>;cursor:number;ready:boolean};
export const emptyJourney = ():Journey=>({version:2,reasons:[],primary:'',context:{},cursor:0,ready:false});
export function cleanJourney(value:unknown):Journey|undefined {
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  const input=value as Record<string,unknown>;
  const reasons=visitReasons.filter(r=>Array.isArray(input.reasons)&&input.reasons.includes(r.id)).map(r=>r.id);
  const primary=reasons.find(r=>r===input.primary)||reasons[0]||'';
  const context:Record<string,string>={};
  const supplied=input.context&&typeof input.context==='object'?input.context as Record<string,unknown>:{};
  for(const reason of visitReasons.filter(r=>reasons.includes(r.id)))for(const [key] of reason.questions){if(typeof supplied[key]==='string')context[key]=supplied[key].trim().slice(0,1000);}
  return {version:2,reasons,primary,context,cursor:Math.max(0,Math.min(14,Number.isInteger(input.cursor)?Number(input.cursor):0)),ready:input.ready===true&&!!primary};
}
