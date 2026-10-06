import { env } from 'cloudflare:workers';
import { money, PilotError, type PilotMode } from './domain';
export type Settings = { mode:PilotMode; origin:string; authSecret:string; merchant:string; smsKey:string; smsTemplate:string; staffTotp:Record<string,string>; priceRial:number; pricingVersion:string; scanUrl:string; scanToken:string; consentVersion:string; consentBody:string; clinicalApproved:boolean; ready:boolean };
export function settings(): Settings {
  const e = env as unknown as Record<string, string | undefined>;
  const value = (name:string) => e[name] ?? process.env[name] ?? '';
  const configuredMode=value('PILOT_MODE');
  if(configuredMode&&!['live','demo'].includes(configuredMode))throw new PilotError('INVALID_PILOT_MODE',503);
  if(!configuredMode&&process.env.NODE_ENV==='production')throw new PilotError('PILOT_MODE_REQUIRED',503);
  const mode = configuredMode === 'live' ? 'live' : 'demo';
  let staffTotp:Record<string,string> = {}; try { staffTotp=JSON.parse(value('STAFF_TOTP_SECRETS')||'{}'); } catch { throw new PilotError('STAFF_MFA_NOT_CONFIGURED',503); }
  return {mode,origin:value('PILOT_ORIGIN')||'http://localhost:4173',authSecret:value('AUTH_SECRET')||(mode==='demo'?'local-demo-secret-never-use-for-real-health-data':''),merchant:value('ZARINPAL_MERCHANT_ID'),smsKey:value('KAVENEGAR_API_KEY'),smsTemplate:value('KAVENEGAR_OTP_TEMPLATE'),staffTotp,priceRial:mode==='demo'?12_000_000:money(value('ASSESSMENT_PRICE_RIAL')),pricingVersion:value('PRICING_VERSION')||'demo-price',scanUrl:value('FILE_SCAN_URL'),scanToken:value('FILE_SCAN_TOKEN'),consentVersion:value('CONSENT_VERSION'),consentBody:value('CONSENT_BODY'),clinicalApproved:value('CLINICAL_CONTENT_APPROVED')==='true',ready:value('PILOT_LAUNCH_READY')==='true'};
}
export function requireLiveReady(c:Settings) {
  if(c.mode==='demo')return;
  if(!c.ready||!c.clinicalApproved||!c.origin.startsWith('https://')||c.authSecret.length<32||!c.smsKey||!c.smsTemplate||!c.merchant||!c.consentVersion||!c.consentBody||!c.scanUrl.startsWith('https://')||!c.scanToken||!Object.keys(c.staffTotp).length||c.pricingVersion==='demo-price') throw new PilotError('PILOT_NOT_READY',503);
}
