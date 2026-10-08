'use client';
import { useEffect, useRef, useState } from 'react';
type Snapshot={profile:Record<string,unknown>;answers:Record<string,string|string[]>;step:number;consent:boolean;coordination:boolean};
type Result={version:number;urgent:boolean;urgentResolvedAt:number|null};
type Options={snapshot:Snapshot;revision:number;version:number;dirty:boolean;enabled:boolean;send:(body:Snapshot&{version:number})=>Promise<Result>;onSaved:(snapshot:Snapshot,result:Result,revision:number)=>void};
type Pending={snapshot:Snapshot;revision:number;key:string};
export function useDraft(options:Options) {
 const [status,setStatus]=useState<'saved'|'pending'|'saving'|'failed'|'conflict'>('saved');
 const [message,setMessage]=useState('');
 const [pendingCriticalCount,setPendingCriticalCount]=useState(0);
 const current=useRef(options),version=useRef(options.version),flight=useRef<Promise<void>|null>(null),blocked=useRef(false),savedRevision=useRef(-1),savedKey=useRef(''),critical=useRef<Pending[]>([]),generation=useRef(0);
 // A delayed render of a previous acknowledgement must not rewind the version
 // already received by a newer serialized write. reset handles record changes.
 useEffect(()=>{current.current=options;version.current=Math.max(version.current,options.version);});
 function capture(next?:number):Pending {
  const o=current.current,snapshot=structuredClone({...o.snapshot,step:next??o.snapshot.step});
  return {snapshot,revision:o.revision,key:`${o.revision}:${JSON.stringify(snapshot)}`};
 }
 async function write(entry:Pending) {
  const epoch=generation.current;
  if(!current.current.enabled){const text='برای ذخیره، رضایت را ثبت کنید و باز بودن پرونده را بررسی کنید.';setStatus('failed');setMessage(text);throw new Error(text);}
  setStatus('saving');setMessage('');
  const pending=(async()=>{try {
   // Use current credentials on retries; only the clinical snapshot is frozen.
   const result=await current.current.send({...entry.snapshot,version:version.current});
   if(epoch!==generation.current)return;
   version.current=result.version;savedRevision.current=entry.revision;savedKey.current=entry.key;
   // An ordinary in-flight write may already contain the same critical answer.
   critical.current=critical.current.filter(item=>item.key!==entry.key);setPendingCriticalCount(critical.current.length);
   current.current.onSaved(entry.snapshot,result,entry.revision);
   setStatus(!critical.current.length&&current.current.revision===entry.revision?'saved':'pending');
  }catch(error){
   if(epoch===generation.current){const e=error as Error&{code?:string};blocked.current=e.code==='VERSION_CONFLICT'||e.code==='RECORD_LOCKED';setStatus(blocked.current?'conflict':'failed');setMessage(e.message);}
   throw error;
  }})();
  flight.current=pending;try{await pending;}finally{if(flight.current===pending)flight.current=null;}
 }
 async function save(next?:number) {
  const epoch=generation.current;
  for(;;){
   while(flight.current)await flight.current;
   if(epoch!==generation.current)throw new Error('پرونده عوض شده است؛ ذخیرهٔ قبلی ادامه پیدا نمی‌کند.');
   if(blocked.current)throw new Error('نسخه پرونده تغییر کرده است. پاسخ‌های شما حفظ شده‌اند؛ نسخه تازه را آگاهانه بارگذاری کنید.');
   // Recheck the queue after every await; another caller may have added a
   // critical snapshot while this save was waiting for the same flight.
   const first=critical.current[0];
   if(first){await write(first);continue;}
   const entry=capture(next);
   if(next===undefined&&savedRevision.current===entry.revision)return;
   await write(entry);
   if(epoch!==generation.current)throw new Error('پرونده عوض شده است؛ ذخیرهٔ قبلی ادامه پیدا نمی‌کند.');
   return;
  }
 }
 function saveCritical() {
  // Capture before waiting: a later correction must not erase an urgent answer
  // while an earlier autosave is still in flight. Failed entries stay queued.
  const entry=capture();
  if(entry.key!==savedKey.current&&!critical.current.some(item=>item.key===entry.key)){critical.current.push(entry);setPendingCriticalCount(critical.current.length);}
  return save();
 }
 function reset(nextVersion:number){generation.current++;version.current=nextVersion;blocked.current=false;savedRevision.current=-1;savedKey.current='';critical.current=[];setPendingCriticalCount(0);setStatus('saved');setMessage('');}
 const signature=JSON.stringify(options.snapshot);
 useEffect(()=>{if(!options.enabled||!options.dirty||blocked.current)return;const timer=setTimeout(()=>{void save().catch(()=>{});},1000);return()=>clearTimeout(timer);
 // Only actual draft edits schedule autosave; failures require an edit or explicit retry.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,options.revision,options.enabled,options.dirty]);
 return {save,saveCritical,hasPendingCritical:pendingCriticalCount>0,reset,status,message,acceptVersion:(nextVersion:number)=>{version.current=nextVersion;}};
}
