import {createDemoBackend} from '../demo/backend';
import {demoPeople} from './model';
/** Extra fictional members live only in the next lane. The preserved root auth bundle is unchanged. */
export async function createBrowserAuth(){
 const base=await createDemoBackend(),key='salamatban-next-extra-member:'+new URL('.',document.baseURI).pathname;
 const extras=demoPeople.filter(p=>p.role==='member'&&!['09000000001','09000000002'].includes(p.phone));
 const challenges=new Map<string,{phone:string;code:string;expires:number;attempts:number}>();
 const current=()=>extras.find(p=>p.phone===sessionStorage.getItem(key));
 const user=(p:typeof extras[number])=>({id:'next-sample-'+p.phone,phone:p.phone,name:p.name,role:'member' as const,organizationId:'salamatban-demo'});
 async function fetchAuth(url:string,options:RequestInit={}){
  if(!['/api/pilot/me','/api/pilot/auth/request','/api/pilot/auth/verify','/api/pilot/auth/logout'].includes(url))return Response.json({error:'AUTH_SCOPE_ONLY'},{status:403});
  const data=typeof options.body==='string'?JSON.parse(options.body||'{}') as {phone?:string;challenge?:string;code?:string}:{};
  if(url==='/api/pilot/me'&&current())return Response.json({user:user(current()!),csrf:'next-fictional-member-only'});
  if(url==='/api/pilot/auth/logout'&&current()){
   const active=await base.fetch('/api/pilot/me');if(active.ok){const v=await active.json() as {csrf:string};const ended=await base.fetch('/api/pilot/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':v.csrf},body:'{}'});if(!ended.ok)return ended;}
   sessionStorage.removeItem(key);return Response.json({ok:true});
  }
  const extra=extras.find(p=>p.phone===data.phone);
  if(extra&&url==='/api/pilot/auth/request'){
   const challenge=crypto.randomUUID(),code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
   challenges.set(challenge,{phone:extra.phone,code,expires:Date.now()+180000,attempts:0});
   return Response.json({challenge,demoCode:code,expiresIn:180});
  }
  if(extra&&url==='/api/pilot/auth/verify'){
   const c=challenges.get(data.challenge||'');if(!c||c.phone!==extra.phone||c.expires<Date.now()||c.attempts++>=5||c.code!==data.code)return Response.json({error:'INVALID_CODE'},{status:401});
   challenges.delete(data.challenge!);sessionStorage.setItem(key,extra.phone);return Response.json({user:user(extra),csrf:'next-fictional-member-only'});
  }
  const response=await base.fetch(url,options);if(url==='/api/pilot/auth/verify'&&response.ok)sessionStorage.removeItem(key);return response;
 }
 return {fetch:fetchAuth,dispose:()=>base.dispose(),async enterSample(phone:string){const extra=extras.find(p=>p.phone===phone);if(extra){const request=await fetchAuth('/api/pilot/auth/request',{method:'POST',body:JSON.stringify({phone})}),v=await request.json() as {challenge:string;demoCode:string};const checked=await fetchAuth('/api/pilot/auth/verify',{method:'POST',body:JSON.stringify({phone,challenge:v.challenge,code:v.demoCode})});if(!checked.ok)throw Error('ورود به نمونه انجام نشد.');}else{await base.enterSample(phone);sessionStorage.removeItem(key);}}};
}
