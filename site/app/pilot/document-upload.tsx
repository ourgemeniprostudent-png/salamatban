'use client';
/* Local blob previews must stay in the browser; no image optimizer or external upload. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import './component-stability.css';
export type UploadProgress={value:number;max:number;label:string};
type Item={id:string;file:File;url?:string;state:'queued'|'uploading'|'done'|'failed';error?:string;progress:UploadProgress};
export function DocumentUpload({onUpload,disabled=false,count=0}:{onUpload:(file:File,progress?:(p:UploadProgress)=>void)=>Promise<void>;disabled?:boolean;count?:number}) {
 const [items,setItems]=useState<Item[]>([]),urls=useRef<string[]>([]),running=useRef(false);
 useEffect(()=>()=>{urls.current.forEach(URL.revokeObjectURL);},[]);
 const update=(id:string,patch:Partial<Item>)=>setItems(old=>old.map(i=>i.id===id?{...i,...patch}:i));
 async function run(batch:Item[]) {if(running.current)return;running.current=true;try{for(const item of batch){update(item.id,{state:'uploading',error:undefined});try{await onUpload(item.file,p=>update(item.id,{progress:p}));update(item.id,{state:'done',progress:{value:1,max:1,label:'ذخیره شد'}});}catch(e){update(item.id,{state:'failed',error:(e as Error).message});}}}finally{running.current=false;}}
 function add(files:FileList|null) {if(!files||disabled||running.current)return;const batch=Array.from(files).map(file=>{const valid=['image/jpeg','image/png','application/pdf'].includes(file.type)&&file.size>0&&file.size<=10*1024*1024;const url=valid?URL.createObjectURL(file):undefined;if(url)urls.current.push(url);return {id:crypto.randomUUID(),file,url,state:valid?'queued':'failed',error:valid?undefined:'فقط JPG، PNG یا PDF تا ۱۰ مگابایت پذیرفته می‌شود.',progress:{value:0,max:1,label:'آماده بارگذاری'}} as Item;});setItems(old=>[...old,...batch]);void run(batch.filter(i=>i.state==='queued'));}
 const uploading=items.some(i=>i.state==='uploading'||i.state==='queued');
 return <div className="ux-upload" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();add(e.dataTransfer.files);}}>
 <p>JPG، PNG یا PDF، حداکثر ۱۰ مگابایت برای هر فایل و ۱۰ مدرک در پرونده. فایل را اینجا رها کنید یا انتخاب کنید.</p>
 <div className="p-actions"><label className="ux-file-button">انتخاب مدرک از گالری یا فایل<input type="file" aria-label="انتخاب مدرک" multiple accept="image/jpeg,image/png,application/pdf" disabled={disabled||uploading||count>=10} onChange={e=>{add(e.currentTarget.files);e.currentTarget.value='';}}/></label><label className="ux-file-button">گرفتن عکس با دوربین<input type="file" aria-label="گرفتن عکس با دوربین" accept="image/jpeg,image/png" capture="environment" disabled={disabled||uploading||count>=10} onChange={e=>{add(e.currentTarget.files);e.currentTarget.value='';}}/></label></div>
 <p className="p-muted">در دستگاهی که دوربین پشتیبانی نشود، انتخاب فایل در دسترس است.</p>
 {items.map(item=><div className="ux-upload-item" key={item.id}>{item.url&&item.file.type.startsWith('image/')&&<img src={item.url} alt={`پیش‌نمایش ${item.file.name}`} width="96" height="96"/>}<div className="ux-upload-details"><b>{item.file.name}</b>{item.url&&item.file.type==='application/pdf'&&<a href={item.url} target="_blank" rel="noopener noreferrer">پیش‌نمایش PDF</a>}<small>{Math.ceil(item.file.size/1024).toLocaleString('fa-IR')} کیلوبایت{item.file.type==='application/pdf'?' · PDF':''}</small><progress aria-label={`پیشرفت ${item.file.name}`} value={item.progress.value} max={item.progress.max}/></div><div className="ux-upload-feedback"><span className="ux-upload-message" role={item.error?'alert':'status'}>{item.error||item.progress.label}</span><button type="button" className="p-secondary ux-upload-retry" aria-label={`تلاش دوباره برای ${item.file.name}`} aria-hidden={item.state!=='failed'} style={{visibility:item.state==='failed'?'visible':'hidden'}} disabled={disabled||uploading||item.state!=='failed'} onClick={()=>void run([item])}>تلاش دوباره</button></div></div>)}
 </div>;
}
