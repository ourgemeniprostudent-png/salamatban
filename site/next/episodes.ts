import type {Actor,CareCase} from './model';
import {care,effectiveDoctor,addResponsibility,localDay,notify} from './care';
export type EpisodeInput={planId:string;concern:string;question:string;explanation:string;decision:string;reason:string;teamResult:string;remaining:string;nextStep:string;nextDueAt:string;nextKind:'action'|'review'|'message';actionId?:string;fileIds:string[];encounterId?:string;coordination?:{kind:'task'|'referral';id:string}};
export type EpisodeVersion=EpisodeInput&{id:string;number:number;doctor:string;publishedAt:number;encounterVersionId?:string};
export type CareEpisode={id:string;planId:string;versions:EpisodeVersion[];feedback:{id:string;versionId:string;understood:boolean;nextClear:boolean;at:number;replyId?:string}[];replies:{id:string;versionId:string;doctor:string;at:number;text:string}[]};
export type EpisodeCommand={kind:'care_episode_publish';episode:EpisodeInput}|{kind:'care_episode_feedback';episodeId:string;versionId:string;understood:boolean;nextClear:boolean;replyId?:string}|{kind:'care_episode_reply';episodeId:string;versionId:string;text:string};
const requireValue=(value:unknown,message:string)=>{if(!value)throw Error(message);};
export function latestEpisode(c:CareCase,planId=c.plans.at(-1)?.id){return c.episodes?.find(e=>e.planId===planId);}
export function episodeStatus(c:CareCase,e:CareEpisode){const v=e.versions.at(-1)!;return {pendingCorrection:care(c).reports.some(r=>r.supersedes&&v.fileIds.includes(r.supersedes)&&!c.files.find(f=>f.id===r.fileId)?.review),work:care(c).responsibilities.findLast(r=>r.subject==='episode-next:'+e.id),feedbackWork:care(c).responsibilities.findLast(r=>r.subject==='understanding:'+e.id),feedback:e.feedback.findLast(f=>f.versionId===v.id),reply:e.replies.findLast(r=>r.versionId===v.id)};}
export function publishEpisode(c:CareCase,a:Actor,input:EpisodeInput){
 requireValue(a.role==='clinician'&&a.phone===effectiveDoctor(c)&&c.phase!=='draft'&&!c.urgent,'انتشار جمع‌بندی با پزشک مسئول و پس از رسیدگی به هشدار است.');
 requireValue(input&&typeof input==='object'&&!Array.isArray(input),'اطلاعات جمع‌بندی معتبر نیست.');
 for(const key of ['planId','concern','question','explanation','decision','reason','remaining','nextStep','nextDueAt'] as const)requireValue(typeof input[key]==='string'&&input[key].trim().length>0&&input[key].length<=2000,'دغدغه، توضیح، تصمیم، دلیل، ابهام باقی‌مانده و قدم بعد را کامل کنید.');
 requireValue(typeof input.teamResult==='string'&&input.teamResult.length<=2000,'متن هماهنگی معتبر نیست.');
 const plan=c.plans.find(p=>p.id===input.planId);requireValue(plan,'برنامهٔ همین دوره پیدا نشد.');
 requireValue(Array.isArray(input.fileIds)&&input.fileIds.length<=5&&input.fileIds.every(fid=>typeof fid==='string'&&c.files.some(f=>f.id===fid&&f.review)&&!care(c).reports.some(r=>r.fileId===fid&&r.quarantined)),'فقط مدارک بررسی‌شدهٔ همین بیمار را پیوند دهید.');
 requireValue(!input.encounterId||care(c).encounters.some(e=>e.id===input.encounterId&&e.versions.length),'ملاقات امضاشدهٔ همین بیمار را انتخاب کنید.');
 requireValue(input.fileIds.length||input.encounterId,'حداقل یک گزارش بررسی‌شده یا ملاقات امضاشده لازم است.');
 if(input.coordination){const ref=input.coordination;requireValue(typeof ref.id==='string'&&(ref.kind==='task'&&c.tasks.some(t=>t.id===ref.id&&t.status==='completed')||ref.kind==='referral'&&care(c).referrals.some(r=>r.id===ref.id&&r.status==='closed')),'نتیجهٔ هماهنگی باید به کار واقعاً تکمیل‌شدهٔ همین بیمار وصل باشد.');requireValue(input.teamResult.trim(),'نتیجهٔ مشخص هماهنگی را بنویسید.');}else requireValue(!input.teamResult.trim(),'برای ادعای نتیجهٔ هماهنگی، کار تکمیل‌شده را انتخاب کنید.');
 requireValue(['action','review','message'].includes(input.nextKind),'نوع قدم بعد معتبر نیست.');
 requireValue(/^\d{4}-\d{2}-\d{2}$/.test(input.nextDueAt)&&!isNaN(Date.parse(input.nextDueAt))&&new Date(input.nextDueAt+'T12:00:00Z').toISOString().slice(0,10)===input.nextDueAt,'تاریخ قدم بعد معتبر نیست.');
 if(input.nextKind==='action')requireValue(plan!.actions.some(v=>v.id===input.actionId&&!v.done&&care(c).decisions[v.id]?.state!=='declined'&&care(c).decisions[v.id]?.state!=='deferred'),'قدم بیمار باید به اقدام باز و پذیرفته‌شدهٔ همین برنامه وصل باشد.');
 let episode=latestEpisode(c,plan!.id);if(!episode){episode={id:crypto.randomUUID(),planId:plan!.id,versions:[],feedback:[],replies:[]};(c.episodes??=[]).push(episode);}
 const version:EpisodeVersion={...structuredClone(input),fileIds:[...new Set(input.fileIds)],id:crypto.randomUUID(),number:episode.versions.length+1,doctor:a.phone,publishedAt:Date.now(),...(input.encounterId?{encounterVersionId:care(c).encounters.find(e=>e.id===input.encounterId)!.versions.at(-1)!.id}:{})};episode.versions.push(version);
 const oldWork=care(c).responsibilities.find(r=>r.subject==='episode-next:'+episode!.id&&r.state==='open');
 if(input.nextKind==='review'){if(oldWork){oldWork.title=input.nextStep;oldWork.dueAt=input.nextDueAt;oldWork.next=input.nextStep;oldWork.owner=effectiveDoctor(c);}else addResponsibility(c,'episode-next:'+episode.id,input.nextStep,input.nextDueAt,'نتیجهٔ مرور بعدی را ثبت کنید.');}
 else requireValue(!oldWork,'مسئولیت مرور قبلی را پیش از تغییر نوع قدم بعد تعیین تکلیف کنید.');
 notify(c,'episode:'+version.id);
 return episode;
}
export function episodeFeedback(c:CareCase,a:Actor,cmd:Extract<EpisodeCommand,{kind:'care_episode_feedback'}>){
 requireValue(a.role==='member'&&a.phone===c.phone,'بازخورد فقط با خود بیمار است.');requireValue(typeof cmd.understood==='boolean'&&typeof cmd.nextClear==='boolean','به هر دو سؤال پاسخ بله یا خیر بدهید.');
 const e=c.episodes?.find(e=>e.id===cmd.episodeId),v=e?.versions.at(-1);requireValue(v&&v.id===cmd.versionId,'جمع‌بندی تغییر کرده؛ نسخهٔ تازه را ببینید.');
 const reply=e!.replies.findLast(r=>r.versionId===v!.id);if(cmd.replyId)requireValue(reply?.id===cmd.replyId,'پاسخ تازهٔ پزشک را مرور کنید.');
 const previous=e!.feedback.findLast(f=>f.versionId===v!.id);if(previous&&previous.understood===cmd.understood&&previous.nextClear===cmd.nextClear&&previous.replyId===cmd.replyId)return;
 e!.feedback.push({id:crypto.randomUUID(),versionId:v!.id,understood:cmd.understood,nextClear:cmd.nextClear,at:Date.now(),...(cmd.replyId?{replyId:cmd.replyId}:{})});
 if(!cmd.understood||!cmd.nextClear){addResponsibility(c,'understanding:'+e!.id,'روشن‌کردن توضیح و قدم بعد برای بیمار',localDay(),'بازخورد بیمار را در جمع‌بندی دوره پاسخ دهید.');const r=care(c).responsibilities.find(r=>r.subject==='understanding:'+e!.id&&r.state==='open')!;r.next=[!cmd.understood?'توضیح برای بیمار روشن نیست':'',!cmd.nextClear?'قدم بعد برای بیمار روشن نیست':''].filter(Boolean).join('؛ ');}
 else{const work=care(c).responsibilities.find(r=>r.subject==='understanding:'+e!.id&&r.state==='open');if(work&&(reply&&cmd.replyId===reply.id||e!.feedback.some(f=>(!f.understood||!f.nextClear)&&f.versionId!==v!.id))){work.state='resolved';work.resolution='بیمار پس از توضیح تازه، روشن‌بودن توضیح و قدم بعد را تأیید کرد.';}}
}
export function replyEpisode(c:CareCase,a:Actor,cmd:Extract<EpisodeCommand,{kind:'care_episode_reply'}>){
 requireValue(a.role==='clinician'&&a.phone===effectiveDoctor(c)&&!c.urgent,'پاسخ با پزشک مسئول پس از رسیدگی به هشدار است.');const e=c.episodes?.find(e=>e.id===cmd.episodeId),v=e?.versions.at(-1);requireValue(v?.id===cmd.versionId&&typeof cmd.text==='string'&&cmd.text.trim().length>=5&&cmd.text.length<=2000,'نسخهٔ جاری و توضیح روشن را وارد کنید.');requireValue(care(c).responsibilities.some(r=>r.subject==='understanding:'+e!.id&&r.state==='open'),'بازخورد نیازمند پیگیری پیدا نشد.');e!.replies.push({id:crypto.randomUUID(),versionId:v!.id,doctor:a.phone,at:Date.now(),text:cmd.text.trim()});notify(c,'episode-reply:'+e!.replies.at(-1)!.id);const r=care(c).responsibilities.find(r=>r.subject==='understanding:'+e!.id&&r.state==='open')!;r.next='پاسخ تازه برای بیمار منتشر شد؛ روشن‌بودن آن را دوباره پیگیری کنید.';
}
