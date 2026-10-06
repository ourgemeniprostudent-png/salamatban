const encoder = new TextEncoder();
export const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('');
export async function hash(value: string | ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value)), b => b.toString(16).padStart(2,'0')).join('');
}
export async function keyedHash(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))), b=>b.toString(16).padStart(2,'0')).join('');
}
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0; for(let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff === 0;
}
export function randomCode() {
  // Rejection sampling avoids modulo bias.
  let n: number; do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while(n >= 4_294_000_000);
  return String(n % 1_000_000).padStart(6, '0');
}
export async function totp(secret: string, time = Date.now()) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for(const c of secret.toUpperCase().replace(/=+$/, '')) { const n=alphabet.indexOf(c); if(n<0) throw new Error('INVALID_TOTP_SECRET'); bits+=n.toString(2).padStart(5,'0'); }
  const bytes = new Uint8Array(Math.floor(bits.length/8));
  for(let i=0;i<bytes.length;i++) bytes[i]=parseInt(bits.slice(i*8,i*8+8),2);
  if(bytes.length<20) throw new Error('INVALID_TOTP_SECRET');
  const counter = new ArrayBuffer(8); new DataView(counter).setBigUint64(0, BigInt(Math.floor(time/30000)));
  const key = await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC',key,counter)); const off=h[19]&15;
  const n=((h[off]&127)<<24)|(h[off+1]<<16)|(h[off+2]<<8)|h[off+3];
  return String(n%1000000).padStart(6,'0');
}
export async function verifyTotp(secret: string, code: string) {
  if(!/^\d{6}$/.test(code)) return false;
  for(const offset of [-30000,0,30000]) if(equal(await totp(secret,Date.now()+offset),code)) return true;
  return false;
}
