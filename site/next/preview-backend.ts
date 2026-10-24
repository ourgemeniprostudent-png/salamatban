import {initialSnapshot,demoPeople,type Actor} from './model';
import {projectView} from './views';
import {prepareFile} from './files';
import type {NextBackend} from './store';
/** Ephemeral fixture view: no auth storage, IndexedDB, session, broadcast or mutable operations. */
export function createPreviewBackend(phone:string):NextBackend{
 const person=demoPeople.find(p=>p.phone===phone&&p.role==='member'&&p.phone!=='09000000001');if(!person)throw Error('نمونهٔ آماده پیدا نشد.');
 const snapshot=initialSnapshot(),user:Actor={...person,id:phone},record=snapshot.cases.find(c=>c.phone===phone)!;
 return {mode:'browser-demo',readOnly:true,auth:{fetch:async()=>Response.json({user,csrf:'read-only-preview'}),enterSample:async()=>{throw Error('انتخاب حساب در نمای فقط‌خواندنی انجام نمی‌شود.');},dispose(){}},me:async()=>user,view:async()=>projectView(snapshot,user),mutate:async()=>{throw Error('این نمونه فقط برای مشاهده است؛ پروندهٔ خودتان تغییر نکرده است.');},async file(subject,id){if(subject!==phone)throw Error('به این مدرک دسترسی ندارید.');const file=record.files.find(f=>f.id===id);if(!file?.fixture)throw Error('مدرک پیدا نشد.');const response=await fetch(new URL(file.fixture,document.baseURI));if(!response.ok)throw Error('دریافت مدرک انجام نشد؛ دوباره تلاش کنید.');return {name:file.name,blob:await response.blob()};},uploaded:prepareFile,logout:async()=>{},subscribe:()=>()=>{},dispose(){}};
}
