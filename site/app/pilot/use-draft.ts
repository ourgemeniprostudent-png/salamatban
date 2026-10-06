'use client';
import { useEffect, useRef, useState } from 'react';
type Snapshot={profile:Record<string,unknown>;answers:Record<string,string|string[]>;step:number;consent:boolean;coordination:boolean};
type Result={version:number;urgent:boolean};
type Options={snapshot:Snapshot;revision:number;version:number;dirty:boolean;enabled:boolean;send:(body:Snapshot&{version:number})=>Promise<Result>;onSaved:(snapshot:Snapshot,result:Result,revision:number)=>void};
export function useDraft(options:Options) {
 const [status,setStatus]=useState<'saved'|'pending'|'saving'|'failed'|'conflict'>('saved');
 const [message,setMessage]=useState('');
 const current=useRef(options),version=useRef(options.version),flight=useRef<Promise<void>|null>(null),blocked=useRef(false),savedRevision=useRef(-1);
 useEffect(()=>{current.current=options;version.current=options.version;});
 async function save(next?:number) {
  if(flight.current)await flight.current;
  if(blocked.current)throw new Error('نسخه پرونده تغییر کرده است. پاسخ‌های شما حفظ شده‌اند؛ نسخه تازه را آگاهانه بارگذاری کنید.');
  const o=current.current,snapshot={...o.snapshot,step:next??o.snapshot.step};
  if(!o.enabled)throw new Error('برای ذخیره، رضایت را ثبت کنید و باز بودن پرونده را بررسی کنید.');
  if(next===undefined&&savedRevision.current===o.revision)return;
  setStatus('saving');setMessage('');
  const pending=(async()=>{try {const result=await o.send({...snapshot,version:version.current});version.current=result.version;savedRevision.current=o.revision;o.onSaved(snapshot,result,o.revision);setStatus(current.current.revision===o.revision?'saved':'pending');}catch(error){const e=error as Error&{code?:string};blocked.current=e.code==='VERSION_CONFLICT'||e.code==='RECORD_LOCKED';setStatus(blocked.current?'conflict':'failed');setMessage(e.message);throw error;}})();
  flight.current=pending;try{await pending;}finally{if(flight.current===pending)flight.current=null;}
 }
 function reset(nextVersion:number){version.current=nextVersion;blocked.current=false;savedRevision.current=-1;setStatus('saved');setMessage('');}
 const signature=JSON.stringify(options.snapshot);
 useEffect(()=>{if(!options.enabled||!options.dirty||blocked.current)return;const timer=setTimeout(()=>{void save().catch(()=>{});},1000);return()=>clearTimeout(timer);
 // Only actual draft edits schedule autosave; failures require an edit or explicit retry.
 },[signature,options.revision,options.enabled,options.dirty]);
 return {save,reset,status,message};
}
