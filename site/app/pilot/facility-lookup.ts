/** Public map lookup. No clinical answers, identity, address or device position enter this API. */
export type Facility = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  sourceUrl: string;
};
export type FacilityResult = { city: string; province: string; facilities: Facility[]; retrievedAt: string };
export type FacilityLocation = { city: string; province?: string; county?: string; cityId?: string };
type LookupOptions = { signal?: AbortSignal; refresh?: boolean };
type Job = { controller: AbortController; consumers: Set<symbol>; settled: boolean; promise: Promise<FacilityResult> };

const cache = new Map<string, { result: FacilityResult; expires: number }>();
const pending = new Map<string, Job>();
const cacheLifetime = 15 * 60 * 1000, minimumInterval = 1100;
let lastStarted = 0, turn: Promise<void> = Promise.resolve();

export class FacilityLookupError extends Error {
  constructor(public code: 'location' | 'timeout' | 'unavailable' | 'invalid') { super(code); this.name = 'FacilityLookupError'; }
}
function abortError() { return new DOMException('Hospital lookup cancelled', 'AbortError'); }
function clean(value: unknown, length: number) { return typeof value === 'string' ? value.trim().slice(0, length) : ''; }
function normalize(value: string) { return value.replace(/ي|ى/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\s]+/g, ' ').trim(); }
export function facilityLocationKey({ city, province = '', county = '' }: FacilityLocation) { return `${normalize(city)}|${normalize(province)}|${normalize(county)}`; }

export function facilitySearchUrl({ city, province = '', county = '' }: FacilityLocation) {
  const locality = normalize(city), region = normalize(province), district = normalize(county);
  if (locality.length < 2 || locality.length > 100 || region.length > 100 || district.length > 100) throw new FacilityLookupError('location');
  const parts = [...new Set([locality, district, region, 'ایران'].filter(Boolean))];
  const params = new URLSearchParams({ q: `[hospital] ${parts.join('، ')}`, countrycodes: 'ir', format: 'jsonv2', limit: '6', addressdetails: '1', extratags: '1', namedetails: '1', 'accept-language': 'fa' });
  return `https://nominatim.openstreetmap.org/search?${params}`;
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

/** Nominatim may also return roads/bus stops named “hospital”; never label those as care facilities. */
export function parseFacilities(payload: unknown): Facility[] {
  if (!Array.isArray(payload)) throw new FacilityLookupError('invalid');
  const seen = new Set<string>(), results: Facility[] = [];
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    if ((p.category || p.class) !== 'amenity' || p.type !== 'hospital') continue;
    if (!['string', 'number'].includes(typeof p.lat) || !['string', 'number'].includes(typeof p.lon) || String(p.lat).trim() === '' || String(p.lon).trim() === '') continue;
    const latitude = Number(p.lat), longitude = Number(p.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    const namedetails = p.namedetails && typeof p.namedetails === 'object' ? p.namedetails as Record<string, unknown> : {};
    const extratags = p.extratags && typeof p.extratags === 'object' ? p.extratags as Record<string, unknown> : {};
    const address = p.address && typeof p.address === 'object' ? p.address as Record<string, unknown> : {};
    if (address.country_code && address.country_code !== 'ir') continue;
    const name = clean(namedetails['name:fa'], 180) || clean(p.name, 180) || clean(namedetails.name, 180) || clean(address.hospital, 180) || clean(address.amenity, 180);
    if (!name) continue;
    const osmType = clean(p.osm_type, 12), osmId = String(p.osm_id || '');
    const hasOsmId = ['node', 'way', 'relation'].includes(osmType) && /^\d+$/.test(osmId);
    const id = hasOsmId ? `${osmType}/${osmId}` : `${latitude},${longitude}:${name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const rawPhone = clean(extratags['contact:phone'] || extratags.phone, 40).replace(/[۰-۹]/g, n => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(n))).replace(/[٠-٩]/g, n => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n)));
    const phone = /^[+\d\s().-]+$/.test(rawPhone) ? rawPhone.replace(/[\s().-]/g, '') : '';
    results.push({ id, name, address: clean(p.display_name, 500), latitude, longitude, ...(/^\+?\d{5,15}$/.test(phone) ? { phone } : {}), sourceUrl: hasOsmId ? `https://www.openstreetmap.org/${id}` : `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}` });
    if (results.length === 6) break;
  }
  return results;
}

export function lookupFacilities(location: FacilityLocation, { signal, refresh = false }: LookupOptions = {}): Promise<FacilityResult> {
  if (signal?.aborted) return Promise.reject(abortError());
  const key = facilityLocationKey(location);
  const existing = cache.get(key);
  if (!refresh && existing && existing.expires > Date.now()) return Promise.resolve(existing.result);
  let job = pending.get(key);
  if (!job || job.controller.signal.aborted) {
    const controller = new AbortController();
    const created: Job = { controller, consumers: new Set(), settled: false, promise: Promise.resolve(null as unknown as FacilityResult) };
    created.promise = (async () => {
      const url = facilitySearchUrl(location);
      await acquire(controller.signal);
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 9000);
      try {
        const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new FacilityLookupError('unavailable');
        const facilities = parseFacilities(await response.json());
        if (controller.signal.aborted) throw abortError();
        const result = { city: normalize(location.city), province: normalize(location.province || ''), facilities, retrievedAt: new Date().toISOString() };
        cache.delete(key);
        cache.set(key, { result, expires: Date.now() + cacheLifetime });
        if (cache.size > 24) cache.delete(cache.keys().next().value!);
        return result;
      } catch (error) {
        if (timedOut) throw new FacilityLookupError('timeout');
        if (controller.signal.aborted) throw abortError();
        throw error instanceof FacilityLookupError ? error : new FacilityLookupError('unavailable');
      } finally { clearTimeout(timeout); }
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
