import { neshanPointUrl } from './neshan-links';
import { normalizeSearch } from '../../lib/data/cities';
/** Calls the application's Neshan gateway, never the keyed provider API.
 * Only administrative place names enter this boundary; no medical data or GPS.
 */
export type Facility = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  classification: 'name-match-unverified';
  sourceUrl: string;
};
export type FacilityResult = { provider:'neshan'; basis:'city-search'; classification:'name-match-unverified'; city: string; province: string; county:string; facilities: Facility[]; retrievedAt: string };
export type FacilityLocation = { city: string; province?: string; county?: string; cityId?: string };
type LookupOptions = { signal?: AbortSignal; refresh?: boolean; endpoint?:string|null };
type Job = { controller: AbortController; consumers: Set<symbol>; settled: boolean; promise: Promise<FacilityResult> };

const cache = new Map<string, { result: FacilityResult; expires: number }>();
const pending = new Map<string, Job>();
const cacheLifetime = 15 * 60 * 1000, minimumInterval = 1100;
export const defaultHospitalLookupEndpoint='/api/maps/hospitals';
let lastStarted = 0, turn: Promise<void> = Promise.resolve();

export class FacilityLookupError extends Error {
  constructor(public code: 'location' | 'timeout' | 'unavailable' | 'invalid' | 'not-configured') { super(code); this.name = 'FacilityLookupError'; }
}
function abortError() { return new DOMException('Hospital lookup cancelled', 'AbortError'); }
function text(value:unknown,max:number,required=false):string {
 if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new FacilityLookupError('invalid');
 return value.trim();
}
const normalize=normalizeSearch;
export function facilityLocationKey({ city, province = '', county = '' }: FacilityLocation) { return `${normalize(city)}|${normalize(province)}|${normalize(county)}`; }

function endpointValue(endpoint:string|null|undefined) {
 const value=endpoint===undefined?defaultHospitalLookupEndpoint:endpoint?.trim();
 if(!value)throw new FacilityLookupError('not-configured');
 if(value.startsWith('/')&&!value.startsWith('//')&&!/[?#\\]/.test(value))return value;
 try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash)return url.href;}catch{/* Invalid public configuration, never a provider fallback. */}
 throw new FacilityLookupError('not-configured');
}

export function facilitySearchUrl({ city, province = '', county = '' }: FacilityLocation,endpoint?:string|null) {
  const base=endpointValue(endpoint);
  const locality = normalize(city), region = normalize(province), district = normalize(county);
  if (locality.length < 2 || [locality,region,district].some(value=>value.length>100||(value&&!/^[\p{L}\p{M}\d\s‌()\-]+$/u.test(value)))) throw new FacilityLookupError('location');
  const params=new URLSearchParams({city:locality});
  if(region)params.set('province',region);if(district)params.set('county',district);
  return `${base}?${params}`;
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(abortError()); return; }
    const cancel = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}
async function acquire(signal: AbortSignal) {
  const previous = turn;
  let release!: () => void;
  turn = new Promise<void>(resolve => { release = resolve; });
  try {
    await previous;
    if (signal.aborted) throw abortError();
    await delay(Math.max(0, minimumInterval - (Date.now() - lastStarted)), signal);
    if (signal.aborted) throw abortError();
    lastStarted = Date.now();
  } finally { release(); }
}

/** Validate the narrow gateway contract. An invalid success must not appear empty. */
export function parseFacilities(payload: unknown): Facility[] {
  if (!Array.isArray(payload)||payload.length>6) throw new FacilityLookupError('invalid');
  const seen = new Set<string>(), results: Facility[] = [];
  for (const item of payload) {
    if (!item || typeof item !== 'object'||Array.isArray(item))throw new FacilityLookupError('invalid');
    const p = item as Record<string, unknown>;
    const id=text(p.id,256,true),name=text(p.name,180,true),address=text(p.address,500);
    const {latitude,longitude}=p;
    if(p.classification!=='name-match-unverified'||typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<24||latitude>40.5||longitude<43||longitude>64)throw new FacilityLookupError('invalid');
    if (seen.has(id)) continue;
    seen.add(id);
    results.push({id,name,address,latitude,longitude,classification:'name-match-unverified',sourceUrl:neshanPointUrl(latitude,longitude)});
  }
  return results;
}

export function parseFacilityResult(payload:unknown,location:FacilityLocation):FacilityResult {
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new FacilityLookupError('invalid');
 const p=payload as Record<string,unknown>;
 if(p.provider!=='neshan'||p.basis!=='city-search'||p.classification!=='name-match-unverified')throw new FacilityLookupError('invalid');
 const city=text(p.city,100,true),province=text(p.province,100),county=text(p.county,100),retrievedAt=text(p.retrievedAt,80,true);
 if(facilityLocationKey({city,province,county})!==facilityLocationKey(location)||!Number.isFinite(Date.parse(retrievedAt)))throw new FacilityLookupError('invalid');
 return {provider:'neshan',basis:'city-search',classification:'name-match-unverified',city,province,county,retrievedAt,facilities:parseFacilities(p.facilities)};
}

async function boundedJson(response:Response) {
 const maximum=64000;
 if(Number(response.headers.get('content-length'))>maximum){await response.body?.cancel().catch(()=>{});throw new FacilityLookupError('invalid');}
 const reader=response.body?.getReader();if(!reader)throw new FacilityLookupError('invalid');
 const parts:Uint8Array[]=[];let total=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>maximum)throw new FacilityLookupError('invalid');parts.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const all=new Uint8Array(total);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}
 try{return JSON.parse(new TextDecoder().decode(all));}catch{throw new FacilityLookupError('invalid');}
}

export function lookupFacilities(location: FacilityLocation, { signal, refresh = false,endpoint }: LookupOptions = {}): Promise<FacilityResult> {
  if (signal?.aborted) return Promise.reject(abortError());
  let url:string;
  try{url=facilitySearchUrl(location,endpoint);}catch(error){return Promise.reject(error);}
  const key = `${endpointValue(endpoint)}|${facilityLocationKey(location)}`;
  const existing = cache.get(key);
  if (!refresh && existing && existing.expires > Date.now()) return Promise.resolve(existing.result);
  let job = pending.get(key);
  if (!job || job.controller.signal.aborted) {
    const controller = new AbortController();
    const created: Job = { controller, consumers: new Set(), settled: false, promise: Promise.resolve(null as unknown as FacilityResult) };
    created.promise = (async () => {
      await acquire(controller.signal);
      let timer:ReturnType<typeof setTimeout>|undefined,timedOut=false;
      const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timedOut=true;controller.abort();reject(new FacilityLookupError('timeout'));},14000);});
      try {
        const work=(async()=>{
          const response=await fetch(url,{method:'GET',signal:controller.signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',headers:{Accept:'application/json'}});
          const payload=await boundedJson(response);
          if(!response.ok){
            if(response.status===503&&payload?.error==='NESHAN_NOT_CONFIGURED')throw new FacilityLookupError('not-configured');
            throw new FacilityLookupError(response.status===504?'timeout':'unavailable');
          }
          const result=parseFacilityResult(payload,location);
          if(controller.signal.aborted)throw abortError();
          cache.delete(key);cache.set(key,{result,expires:Date.now()+cacheLifetime});
          if(cache.size>24)cache.delete(cache.keys().next().value!);
          return result;
        })();
        return await Promise.race([work,timeout]);
      } catch (error) {
        if(timedOut)throw new FacilityLookupError('timeout');
        if(error instanceof FacilityLookupError)throw error;
        if (controller.signal.aborted) throw abortError();
        throw error instanceof FacilityLookupError ? error : new FacilityLookupError('unavailable');
      } finally { clearTimeout(timer); }
    })().finally(() => { created.settled = true; if (pending.get(key) === created) pending.delete(key); });
    job = created;
    pending.set(key, created);
  }
  const active = job, consumer = Symbol();
  active.consumers.add(consumer);
  return new Promise((resolve, reject) => {
    const done = () => { signal?.removeEventListener('abort', cancel); active.consumers.delete(consumer); };
    const cancel = () => { done(); if (!active.settled && active.consumers.size === 0) active.controller.abort(); reject(abortError()); };
    signal?.addEventListener('abort', cancel, { once: true });
    active.promise.then(result => { done(); if (!signal?.aborted) resolve(result); }, error => { done(); if (!signal?.aborted) reject(error); });
  });
}
