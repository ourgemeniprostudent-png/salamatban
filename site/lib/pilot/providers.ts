import { PilotError } from './domain';
import type { Settings } from './config';

async function providerJson(url: string, body: unknown) {
  try {
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('HTTP');
    return await r.json() as {data?:{code:number;authority?:string;ref_id?:number|string};return?:{status:number}};
  } catch { throw new PilotError('PROVIDER_UNAVAILABLE',503); }
}
export async function sendOtp(c:Settings, phone:string, code:string) {
  try {
    const r=await fetch(`https://api.kavenegar.com/v1/${c.smsKey}/verify/lookup.json`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({receptor:phone,token:code,template:c.smsTemplate,type:'sms'}),signal:AbortSignal.timeout(15000)});
    const result=await r.json() as {return?:{status:number}};
    if(!r.ok||result.return?.status!==200)throw new Error('SMS');
  }catch{throw new PilotError('SMS_UNAVAILABLE',503);}
}
export async function requestPayment(c:Settings, order:{id:string;amount_rial:number}) {
  const r=await providerJson('https://payment.zarinpal.com/pg/v4/payment/request.json',{
    merchant_id:c.merchant,amount:order.amount_rial,currency:'IRR',description:'خدمت ارزیابی سلامت‌بان',
    callback_url:`${c.origin}/api/pilot/payment/callback`,metadata:{order_id:order.id},
  });
  if(r.data?.code!==100||!/^A[A-Za-z0-9]{35}$/.test(r.data.authority||'')) throw new PilotError('PAYMENT_REQUEST_FAILED',503);
  return r.data.authority!;
}
export async function verifyPayment(c:Settings, authority:string, amount:number) {
  const r=await providerJson('https://payment.zarinpal.com/pg/v4/payment/verify.json',{merchant_id:c.merchant,amount,authority});
  if((r.data?.code===100||r.data?.code===101)&&r.data.ref_id) return String(r.data.ref_id);
  // A non-success is not proof of no charge. Reconciliation remains required.
  throw new PilotError('PAYMENT_UNCONFIRMED',409);
}
export async function scanFile(c:Settings, bytes:ArrayBuffer, checksum:string, mime:string) {
  try {
    const r=await fetch(c.scanUrl,{method:'POST',headers:{Authorization:`Bearer ${c.scanToken}`,'Content-Type':mime,'X-Content-SHA256':checksum},body:bytes,signal:AbortSignal.timeout(30000)});
    const result=await r.json() as {clean?:boolean;sha256?:string};
    if(!r.ok||result.sha256!==checksum||result.clean!==true) throw new Error('UNSAFE');
  } catch { throw new PilotError('FILE_NOT_CLEARED',422); }
}
