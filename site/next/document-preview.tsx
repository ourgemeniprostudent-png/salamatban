/* eslint-disable @next/next/no-img-element -- Scoped Blob preview in a static bundle; no Next image server exists. */
import {useEffect,useState} from 'react';
import {Dialog,Button,Icon} from './ui';
import type {NextBackend} from './store';
export function DocumentPreview({phone,id,backend,onClose}:{phone:string;id:string;backend:NextBackend;onClose:()=>void}){
 const [file,F]=useState<{url:string;name:string;mime:string}|null>(null),[error,E]=useState('');
 useEffect(()=>{let alive=true,url='';void backend.file(phone,id).then(f=>{url=URL.createObjectURL(f.blob);if(alive)F({url,name:f.name,mime:f.blob.type});else URL.revokeObjectURL(url);}).catch(e=>{if(alive)E(e.message);});return ()=>{alive=false;if(url)URL.revokeObjectURL(url);};},[backend,phone,id]);
 return <Dialog title={file?.name||'پیش‌نمایش مدرک'} onClose={onClose} wide><div className="n-document-preview">{error?<p role="alert">{error}</p>:file?<>{file.mime.startsWith('image/')?<img src={file.url} alt={file.name}/>:<iframe title={'اصل مدرک: '+file.name} src={file.url}/>}<a className="n-secondary" href={file.url} download={file.name}><Icon name="download" size={18}/> دریافت اصل مدرک</a><small>اگر مرورگر PDF را نمایش نداد، اصل فایل را دریافت کنید.</small></>:<p role="status">در حال دریافت مدرک…</p>}</div><Button secondary onClick={onClose}>بازگشت به پرونده</Button></Dialog>;
}
