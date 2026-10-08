import {stepErrors} from './form-validation';
import type {Action,Answer,Role} from './domain';
export type DemoAccountStory={kind:'member'|'staff';status:string;description:string;days:number;recordPercent?:number;progressPercent?:number|null;metrics:{label:string;value:number}[]};
type MemberInput={createdAt:number;asOf:number;profile:Record<string,unknown>;answers:Record<string,Answer>;consent:boolean;step:number;submitted:boolean;status:string;urgent:boolean;actions:Action[];completed:string[];documents:number;plans:number};
export function memberDemoStory(v:MemberInput):DemoAccountStory{
 const registration=[0,1,2,3].filter(step=>Object.keys(stepErrors(step,v.profile,v.answers,v.consent)).length===0).length+Number(v.step>=5||v.submitted)+Number(v.submitted);
 const progress=v.actions.length?Math.round(100*v.actions.filter(a=>v.completed.includes(a.id)).length/v.actions.length):null;
 const status=v.urgent?'گزارش علامت هشدار':v.status==='needs_information'?'در انتظار تکمیل اطلاعات':v.status==='submitted'?'در صف بررسی پزشک':v.status==='published'?(progress===100?'دورهٔ فعلی کامل شده':'در مسیر پیگیری'):'در حال تشکیل پرونده';
 return {kind:'member',days:Math.max(0,Math.floor((v.asOf-v.createdAt)/86400000)),status,description:progress===null?'هنوز برنامه‌ای منتشر نشده؛ وضعیت ثبت پرونده را ببینید.':'درصد برنامه، سهم اقدام‌های ثبت‌شده به‌عنوان انجام‌شده است؛ نمرهٔ سلامت نیست.',recordPercent:Math.round(registration*100/6),progressPercent:progress,metrics:[{label:'مدرک',value:v.documents},{label:'نسخهٔ برنامه',value:v.plans}]};
}
export function staffDemoStory(role:Role,days:number,counts:{cases?:number;waiting?:number;tasks?:number;completed?:number;shared?:number;members?:number;staff?:number}):DemoAccountStory{
 if(role==='clinician')return {kind:'staff',days,status:'پزشک مسئول پرونده‌های تخصیص‌یافته',description:'پرونده‌های تخصیص‌یافته را بررسی می‌کند، اطلاعات بیشتر می‌خواهد و برنامه منتشر می‌کند.',metrics:[{label:'پروندهٔ تخصیص‌یافته',value:counts.cases||0},{label:'در صف بررسی',value:counts.waiting||0}]};
 if(role==='coordinator')return {kind:'staff',days,status:'همراهِ هماهنگی در صف مشترک تیم',description:'صف هماهنگی بین کارشناسان مشترک است. آمار مسئولیت، درخواست‌هایی است که آخرین‌بار به نام همین کارشناس ثبت شده‌اند.',metrics:[{label:'مسئولیت ثبت‌شده',value:counts.tasks||0},{label:'انجام‌شده با این کارشناس',value:counts.completed||0},{label:'در صف مشترک',value:counts.shared||0}]};
 return {kind:'staff',days,status:'مدیریت اعضا و دسترسی‌ها',description:'اعضا، تخصیص پزشک، پرداخت‌های نیازمند بررسی و پشتیبانی را مدیریت می‌کند؛ محتوای بالینی در دسترس مدیر نیست.',metrics:[{label:'عضو فعال',value:counts.members||0},{label:'پزشک و کارشناس فعال',value:counts.staff||0}]};
}
