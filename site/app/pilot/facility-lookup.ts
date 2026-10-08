import { neshanPointUrl } from './neshan-links';
import { cities,findCityById,normalizeSearch,type City } from '../../lib/data/cities';
/** Calls the application's Geoapify gateway, never the keyed provider API.
 * Only administrative place names enter this boundary; no medical data or GPS.
 */
export type Facility = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  kind:'hospital'|'clinic';
  categories:string[];
  classification: 'provider-category-unverified';
  sourceUrl: string;
};
export type FacilityResult = { provider:'geoapify'; basis:'city-radius'; classification:'provider-category-unverified'; mode:'live'|'snapshot'; snapshotGeneratedAt?:string; cityId?:string; city: string; province: string; county:string; center:{latitude:number;longitude:number}; radiusMeters:10000|20000; filteredCount:number; facilities: Facility[]; retrievedAt: string };
export type FacilityLocation = { city: string; province?: string; county?: string; cityId?: string };
type LookupOptions = { signal?: AbortSignal; refresh?: boolean; endpoint?:string|null; snapshotUrl?:string|null };
type Job<T> = { controller: AbortController; consumers: Set<symbol>; settled: boolean; promise: Promise<T> };
type Snapshot={generatedAt:string;entries:Map<string,FacilityResult>};

const cache = new Map<string, { result: FacilityResult; expires: number }>();
const pending = new Map<string, Job<FacilityResult>>();
const snapshots=new Map<string,Snapshot>(),pendingSnapshots=new Map<string,Job<Snapshot>>();
const cacheLifetime = 15 * 60 * 1000, minimumInterval = 1100;
export const defaultHospitalLookupEndpoint='/api/maps/hospitals';
let lastStarted = 0, turn: Promise<void> = Promise.resolve();

export class FacilityLookupError extends Error {
  constructor(public code: 'location' | 'location-unconfirmed' | 'timeout' | 'unavailable' | 'invalid' | 'not-configured' | 'not-covered' | 'rate-limited',public retryAfterSeconds=0) { super(code); this.name = 'FacilityLookupError'; }
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
const medicalCategories=new Set(['healthcare.hospital','healthcare.clinic_or_praxis','healthcare.clinic_or_praxis.general']);
function isIranPoint(latitude:unknown,longitude:unknown):boolean {
 return typeof latitude==='number'&&typeof longitude==='number'&&Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>=24&&latitude<=40.5&&longitude>=43&&longitude<=64;
}
export function parseFacilities(payload: unknown): Facility[] {
  if (!Array.isArray(payload)||payload.length>6) throw new FacilityLookupError('invalid');
  const seen = new Set<string>(), results: Facility[] = [];
  for (const item of payload) {
    if (!item || typeof item !== 'object'||Array.isArray(item))throw new FacilityLookupError('invalid');
    const p = item as Record<string, unknown>;
    const id=text(p.id,200,true),name=text(p.name,180,true),address=text(p.address,500);
    const {latitude,longitude}=p;
    if(p.classification!=='provider-category-unverified'||!isIranPoint(latitude,longitude))throw new FacilityLookupError('invalid');
    if((p.kind!=='hospital'&&p.kind!=='clinic')||!Array.isArray(p.categories)||p.categories.length<1||p.categories.length>3||!p.categories.every(category=>typeof category==='string'&&medicalCategories.has(category)))throw new FacilityLookupError('invalid');
    const categories=[...new Set(p.categories as string[])];
    if(p.kind==='hospital'?!categories.includes('healthcare.hospital'):categories.includes('healthcare.hospital')||!categories.some(category=>category==='healthcare.clinic_or_praxis'||category==='healthcare.clinic_or_praxis.general'))throw new FacilityLookupError('invalid');
    if (seen.has(id)) continue;
    seen.add(id);
    results.push({id,name,address,latitude:latitude as number,longitude:longitude as number,kind:p.kind,categories,classification:'provider-category-unverified',sourceUrl:neshanPointUrl(latitude as number,longitude as number)});
  }
  return results;
}

export function parseFacilityResult(payload:unknown,location:FacilityLocation):FacilityResult {
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new FacilityLookupError('invalid');
 const p=payload as Record<string,unknown>;
 if(p.provider!=='geoapify'||p.basis!=='city-radius'||p.classification!=='provider-category-unverified')throw new FacilityLookupError('invalid');
 const city=text(p.city,100,true),province=text(p.province,100),county=text(p.county,100),retrievedAt=text(p.retrievedAt,80,true);
 if(facilityLocationKey({city,province,county})!==facilityLocationKey(location)||!Number.isFinite(Date.parse(retrievedAt)))throw new FacilityLookupError('invalid');
 if(!p.center||typeof p.center!=='object'||Array.isArray(p.center))throw new FacilityLookupError('invalid');
 const center=p.center as Record<string,unknown>;
 if(!isIranPoint(center.latitude,center.longitude)||(p.radiusMeters!==10000&&p.radiusMeters!==20000)||typeof p.filteredCount!=='number'||!Number.isSafeInteger(p.filteredCount)||p.filteredCount<0||p.filteredCount>1000)throw new FacilityLookupError('invalid');
 return {provider:'geoapify',basis:'city-radius',classification:'provider-category-unverified',mode:'live',city,province,county,retrievedAt,center:{latitude:center.latitude as number,longitude:center.longitude as number},radiusMeters:p.radiusMeters,filteredCount:p.filteredCount,facilities:parseFacilities(p.facilities)};
}

/** A fixed same-site file only; city/medical data never enter this download URL. */
function snapshotPath(value:string|null|undefined):string {
 if(!value||!/^\.?\/(?!\/)/.test(value)||/[?#\\]/.test(value)||value.split('/').includes('..'))throw new FacilityLookupError('not-configured');
 return value;
}
const placeKey=(value:string)=>normalize(value).replace(/ /g,'');
function snapshotCity(location:FacilityLocation):City {
 let candidates:City[];
 if(location.cityId){
  const selected=findCityById(location.cityId);
  if(!selected||placeKey(selected.name)!==placeKey(location.city))throw new FacilityLookupError('location-unconfirmed');
  candidates=[selected];
 }else candidates=cities.filter(city=>placeKey(city.name)===placeKey(location.city));
 if(location.province)candidates=candidates.filter(city=>placeKey(city.province)===placeKey(location.province!));
 if(location.county)candidates=candidates.filter(city=>placeKey(city.county||'')===placeKey(location.county!));
 if(candidates.length>1)throw new FacilityLookupError('location-unconfirmed');
 if(candidates.length!==1)throw new FacilityLookupError('not-covered');
 return candidates[0];
}
export function parseFacilitySnapshot(payload:unknown):Snapshot {
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new FacilityLookupError('invalid');
 const p=payload as Record<string,unknown>;
 if(p.schemaVersion!==1||p.provider!=='geoapify'||p.mode!=='snapshot'||!Array.isArray(p.entries)||p.entries.length>100)throw new FacilityLookupError('invalid');
 const generatedAt=text(p.generatedAt,80,true);if(!Number.isFinite(Date.parse(generatedAt)))throw new FacilityLookupError('invalid');
 const entries=new Map<string,FacilityResult>();
 for(const item of p.entries){
  if(!item||typeof item!=='object'||Array.isArray(item))throw new FacilityLookupError('invalid');
  const cityId=text(item.cityId,80,true),city=findCityById(cityId);
  if(!city||entries.has(cityId))throw new FacilityLookupError('invalid');
  const result=parseFacilityResult(item,{city:city.name,province:city.province,county:city.county||''});
  entries.set(cityId,{...result,cityId,mode:'snapshot',snapshotGeneratedAt:generatedAt});
 }
 return {generatedAt,entries};
}

function retryDelay(value:string|null) {
 const seconds=value===null?30:/^\d+$/.test(value)?Number(value):Math.ceil((Date.parse(value)-Date.now())/1000);
 return Number.isFinite(seconds)?Math.max(1,Math.min(3600,seconds)):30;
}

async function boundedJson(response:Response,maximum=64000) {
 if(Number(response.headers.get('content-length'))>maximum){await response.body?.cancel().catch(()=>{});throw new FacilityLookupError('invalid');}
 const reader=response.body?.getReader();if(!reader)throw new FacilityLookupError('invalid');
 const parts:Uint8Array[]=[];let total=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>maximum)throw new FacilityLookupError('invalid');parts.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const all=new Uint8Array(total);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}
 try{return JSON.parse(new TextDecoder().decode(all));}catch{throw new FacilityLookupError('invalid');}
}

function shared<T>(key:string,jobs:Map<string,Job<T>>,signal:AbortSignal|undefined,work:(controller:AbortController)=>Promise<T>):Promise<T>{
 if(signal?.aborted)return Promise.reject(abortError());
 let job=jobs.get(key);
 if(!job||job.controller.signal.aborted){
  const controller=new AbortController();
  const created:Job<T>={controller,consumers:new Set(),settled:false,promise:Promise.resolve(null as T)};
  created.promise=work(controller).finally(()=>{created.settled=true;if(jobs.get(key)===created)jobs.delete(key);});
  job=created;jobs.set(key,created);
 }
 const active=job,consumer=Symbol();active.consumers.add(consumer);
 return new Promise((resolve,reject)=>{
  const done=()=>{signal?.removeEventListener('abort',cancel);active.consumers.delete(consumer);};
  const cancel=()=>{done();if(!active.settled&&active.consumers.size===0)active.controller.abort();reject(abortError());};
  signal?.addEventListener('abort',cancel,{once:true});
  active.promise.then(result=>{done();if(!signal?.aborted)resolve(result);},error=>{done();if(!signal?.aborted)reject(error);});
 });
}
async function requestJson(url:string,controller:AbortController,maximum=64000){
 let timer:ReturnType<typeof setTimeout>|undefined,timedOut=false;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timedOut=true;controller.abort();reject(new FacilityLookupError('timeout'));},20000);});
 try{
  return await Promise.race([(async()=>{
   const response=await fetch(url,{method:'GET',signal:controller.signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',headers:{Accept:'application/json'}});
   const payload=await boundedJson(response,maximum);
   if(!response.ok){
    if(response.status===503&&payload?.error==='GEOAPIFY_NOT_CONFIGURED')throw new FacilityLookupError('not-configured');
    if(response.status===429)throw new FacilityLookupError('rate-limited',retryDelay(response.headers.get('retry-after')));
    if(response.status===422&&payload?.error==='GEOAPIFY_LOCATION_UNCONFIRMED')throw new FacilityLookupError('location-unconfirmed');
    if(response.status===400&&payload?.error==='GEOAPIFY_INVALID_LOCATION')throw new FacilityLookupError('location');
    if(['GEOAPIFY_UNSUPPORTED_RESPONSE','GEOAPIFY_RESPONSE_TOO_LARGE'].includes(payload?.error))throw new FacilityLookupError('invalid');
    throw new FacilityLookupError(response.status===504?'timeout':'unavailable');
   }
   if(controller.signal.aborted)throw abortError();return payload;
  })(),timeout]);
 }catch(error){
  if(timedOut)throw new FacilityLookupError('timeout');
  if(error instanceof FacilityLookupError)throw error;
  if(controller.signal.aborted)throw abortError();
  throw new FacilityLookupError('unavailable');
 }finally{clearTimeout(timer);}
}
function loadSnapshot(url:string,signal:AbortSignal,refresh:boolean):Promise<Snapshot>{
 if(signal.aborted)return Promise.reject(abortError());
 if(!refresh&&snapshots.has(url))return Promise.resolve(snapshots.get(url)!);
 return shared(url,pendingSnapshots,signal,async controller=>{
  const snapshot=parseFacilitySnapshot(await requestJson(url,controller,2_000_000));
  if(controller.signal.aborted)throw abortError();
  snapshots.set(url,snapshot);if(snapshots.size>3)snapshots.delete(snapshots.keys().next().value!);
  return snapshot;
 });
}
/** Explicit live configuration wins. Its errors never trigger a snapshot/provider fallback. */
export function lookupFacilities(location:FacilityLocation,{signal,refresh=false,endpoint,snapshotUrl}:LookupOptions={}):Promise<FacilityResult>{
 if(signal?.aborted)return Promise.reject(abortError());
 const snapshotMode=endpoint===null&&!!snapshotUrl;
 let url:string,selected:City|undefined;
 try{
  if(snapshotMode){url=snapshotPath(snapshotUrl);selected=snapshotCity(location);}
  else url=facilitySearchUrl(location,endpoint);
 }catch(error){return Promise.reject(error);}
 const key=snapshotMode?`snapshot:${url}|${selected!.id}`:`live:${endpointValue(endpoint)}|${facilityLocationKey(location)}`;
 const existing=cache.get(key);
 if(!refresh&&existing&&existing.expires>Date.now())return Promise.resolve(existing.result);
 return shared(key,pending,signal,async controller=>{
  let result:FacilityResult;
  if(snapshotMode){
   const snapshot=await loadSnapshot(url,controller.signal,refresh),entry=snapshot.entries.get(selected!.id);
   if(!entry)throw new FacilityLookupError('not-covered');result=entry;
  }else{
   await acquire(controller.signal);
   result=parseFacilityResult(await requestJson(url,controller),location);
  }
  if(controller.signal.aborted)throw abortError();
  cache.delete(key);cache.set(key,{result,expires:Date.now()+cacheLifetime});
  if(cache.size>100)cache.delete(cache.keys().next().value!);
  return result;
 });
}
