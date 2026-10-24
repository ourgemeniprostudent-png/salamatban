import type {CareCase,PlanAction} from './model';
export type ProgrammeEvidence={kind:'file'|'review'|'encounter'|'message'|'referral'|'task';id:string;stage?:'acknowledged'|'booking'|'authorized'|'closed'};
export function actionEvidence(c:CareCase,a:PlanAction){
 const e=a.evidence;if(!e)return null;
 const file=c.files.find(f=>f.id===e.id),review=c.care?.reviews.find(r=>r.fileId===e.id),ref=c.care?.referrals.find(r=>r.id===e.id),task=c.tasks.find(t=>t.id===e.id),enc=c.care?.encounters.find(v=>v.id===e.id),message=c.messages.find(m=>m.id===e.id);
 if(e.kind==='file')return {done:!!file,label:file?.name||'گزارش هنوز دریافت نشده',kind:'file' as const,id:e.id,available:!!file};
 if(e.kind==='review')return {done:!!review?.publishedAt&&(e.stage!=='acknowledged'||!!review.ackAt),label:review?.publishedAt?e.stage==='acknowledged'?'توضیح پزشک و ثبت مشاهدهٔ آن':'توضیح منتشرشدهٔ همین گزارش':'توضیح این گزارش هنوز منتشر نشده',kind:'review' as const,id:e.id,available:!!file};
 if(e.kind==='message')return {done:!!message&&message.role==='member',label:'پرسش ثبت‌شدهٔ شما در گفت‌وگو',kind:'message' as const,id:e.id,available:!!message};
 if(e.kind==='encounter')return {done:!!enc?.versions.length,label:'خلاصهٔ امضاشدهٔ ملاقات همین دوره',kind:'encounter' as const,id:e.id,available:!!enc?.versions.length};
 if(e.kind==='task')return {done:task?.status==='completed',label:task?.outcome||'نتیجهٔ هماهنگی هنوز ثبت نشده',kind:'task' as const,id:e.id,available:!!task};
 return {done:!!ref&&(e.stage==='authorized'?!!ref.authority:e.stage==='booking'?!!ref.patientConfirmed:e.stage==='closed'?ref.status==='closed':(ref.type!=='lab'||ref.specimen==='collected')&&ref.reportIds.some(id=>c.files.some(f=>f.id===id)&&!c.care?.reports.find(r=>r.fileId===id)?.quarantined)),label:!ref?'ارجاع مرتبط ثبت نشده':e.stage==='authorized'?'اجازهٔ اشتراک برای مرکز همین ارجاع':e.stage==='booking'?'زمان پیشنهادی و پاسخ شما':e.stage==='closed'?'نتیجهٔ برگشته و ارجاع پایان‌یافته':ref.specimen==='rejected'?'نمونه هنوز نیازمند بررسی یا تکرار است':'وضعیت دریافت گزارش از مرکز',kind:'referral' as const,id:e.id,available:!!ref};
}
export function actionBlocked(c:CareCase,a:PlanAction){return (a.after||[]).some(id=>!c.plans.flatMap(p=>p.actions).find(x=>x.id===id)?.done);}
export function syncProgramme(c:CareCase){for(const p of c.plans)for(const a of p.actions){const proof=actionEvidence(c,a);if(proof)a.done=proof.done&&(!c.care?.decisions[a.id]||c.care.decisions[a.id].state==='accepted');}}
