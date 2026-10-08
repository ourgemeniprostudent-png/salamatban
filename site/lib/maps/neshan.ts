/** Server provider adapter. Never import this module from client or demo code.
 * The legacy official Search sample establishes the accepted item shape. The
 * current official MCP geocoder only evidences top-level coordinate extraction.
 * Unknown successful response shapes fail explicitly; they are not empty results.
 * No live schema or medical-category coverage is claimed without a keyed check.
 */
export class NeshanError extends Error {
  constructor(public code: string, public status = 502, public retryAfter?: number) { super(code); this.name = 'NeshanError'; }
}
export type NeshanCity = { city: string; province: string; county: string; cityId?: string };
export type NeshanFacility = { id: string; name: string; address: string; latitude: number; longitude: number; classification: 'name-match-unverified' };
export type NeshanResult = NeshanCity & { provider: 'neshan'; facilities: NeshanFacility[]; retrievedAt: string; basis: 'city-search'; classification: 'name-match-unverified'; filteredCount: number };
export type NeshanProviderOptions = { apiKey: string; fetcher?: typeof fetch; timeoutMs?: number; maxBytes?: number; now?: () => number };
const geocodeEndpoint = 'https://api.neshan.org/geocoding/v1';
const searchEndpoint = 'https://api.neshan.org/v1/search';
const object = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const boundedText = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const coordinate = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/** Broad Iran envelope validates data shape, not city containment or proximity. */
function point(latitude: unknown, longitude: unknown) {
  if (!coordinate(latitude, 24, 40.5) || !coordinate(longitude, 43, 64)) throw new NeshanError('NESHAN_UNSUPPORTED_RESPONSE');
  return { latitude: latitude as number, longitude: longitude as number };
}
export function parseNeshanGeocode(payload: unknown) {
  const value = object(payload);
  if (!value) throw new NeshanError('NESHAN_UNSUPPORTED_RESPONSE');
  return point(value.lat ?? value.latitude, value.lng ?? value.longitude);
}
function parseNeshanSearchDetails(payload: unknown): { facilities: NeshanFacility[]; filteredCount: number } {
  const value = object(payload);
  if (!value || !Array.isArray(value.items) || value.items.length > 100) throw new NeshanError('NESHAN_UNSUPPORTED_RESPONSE');
  const facilities: NeshanFacility[] = [], seen = new Set<string>(); let filteredCount = 0;
  for (const entry of value.items) {
    const item = object(entry), location = object(item?.location);
    if (!item || !location || !boundedText(item.title, 180)) throw new NeshanError('NESHAN_UNSUPPORTED_RESPONSE');
    const coordinates = point(location.y, location.x);
    const name = boundedText(item.title, 180), address = boundedText(item.address, 500);
    // No medical-category enum has been verified. Do not infer it from category,
    // marker icons, tile styling or a synthetic fixture. Label this basis in output.
    const markers = [item.type, item.category].filter((value): value is string => typeof value === 'string').map(value => value.toLowerCase());
    const roadOrArea = markers.some(value => ['street', 'road', 'highway', 'route', 'square', 'neighbourhood', 'neighborhood', 'city', 'province', 'bus_stop', 'railway'].includes(value));
    const nonCareTitle = /داروخانه|پارکینگ|ایستگاه|خیابان|میدان|رستوران|پمپ بنزین|\b(?:pharmacy|parking|station|street|road|bus[ _-]?stop|restaurant)\b/iu.test(name);
    const medicalPrefix = /^(?:بیمارستان|درمانگاه|کلینیک|پلی[ ‌-]?کلینیک|مرکز[ ‌]+(?:درمانی|پزشکی))(?=[\s‌]|$)|^(?:hospital|clinic)\b/iu.test(name);
    if (roadOrArea || nonCareTitle || !medicalPrefix) { filteredCount++; continue; }
    const identity = `${coordinates.latitude},${coordinates.longitude}:${name}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    facilities.push({ id: identity, name, address, ...coordinates, classification: 'name-match-unverified' });
  }
  return { facilities: facilities.slice(0, 6), filteredCount };
}
export function parseNeshanSearch(payload: unknown): NeshanFacility[] { return parseNeshanSearchDetails(payload).facilities; }

async function boundedJson(response: Response, maxBytes: number) {
  const size = response.headers.get('content-length');
  if (size && Number(size) > maxBytes) { await response.body?.cancel().catch(() => {}); throw new NeshanError('NESHAN_RESPONSE_TOO_LARGE'); }
  const reader = response.body?.getReader();
  if (!reader) throw new NeshanError('NESHAN_UNSUPPORTED_RESPONSE');
  const parts: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.byteLength;
      if (length > maxBytes) throw new NeshanError('NESHAN_RESPONSE_TOO_LARGE');
      parts.push(part.value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new NeshanError('NESHAN_UNSUPPORTED_RESPONSE'); }
}

async function providerJson(url: URL, options: NeshanProviderOptions) {
  const controller = new AbortController(), timeoutMs = options.timeoutMs ?? 6000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Race as well as abort: an injected/obsolete fetch implementation may ignore abort.
  const work = (async () => {
    const response = await (options.fetcher ?? fetch)(url.href, { method: 'GET', headers: { 'Api-Key': options.apiKey, Accept: 'application/json' }, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!response.ok) throw new NeshanError('NESHAN_UNAVAILABLE');
    return boundedJson(response, options.maxBytes ?? 128_000);
  })();
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new NeshanError('NESHAN_TIMEOUT', 504)); }, timeoutMs); });
  try { return await Promise.race([work, timeout]); }
  catch (error) { throw error instanceof NeshanError ? error : new NeshanError('NESHAN_UNAVAILABLE'); }
  finally { clearTimeout(timer); }
}

export async function searchNeshanHospitals(city: NeshanCity, options: NeshanProviderOptions): Promise<NeshanResult> {
  if (!options.apiKey.trim()) throw new NeshanError('NESHAN_NOT_CONFIGURED', 503);
  const address = [...new Set(['ایران', city.province, city.county, city.city].filter(Boolean))].join('، ');
  const geocode = new URL(geocodeEndpoint); geocode.searchParams.set('json', JSON.stringify({ address }));
  const center = parseNeshanGeocode(await providerJson(geocode, options));
  const groups = await Promise.all(['بیمارستان', 'درمانگاه'].map(async term => {
    const search = new URL(searchEndpoint);
    search.searchParams.set('term', term); search.searchParams.set('lat', String(center.latitude)); search.searchParams.set('lng', String(center.longitude));
    return parseNeshanSearchDetails(await providerJson(search, options));
  }));
  // Interleave the two search groups so a full hospital group cannot hide clinics.
  const combined = Array.from({ length: Math.max(...groups.map(group => group.facilities.length)) }, (_, index) => groups.flatMap(group => group.facilities[index] ? [group.facilities[index]] : [])).flat();
  const facilities = [...new Map(combined.map(facility => [facility.id, facility])).values()].slice(0, 6);
  return { ...city, provider: 'neshan', facilities, retrievedAt: new Date((options.now ?? Date.now)()).toISOString(), basis: 'city-search', classification: 'name-match-unverified', filteredCount: groups.reduce((count, group) => count + group.filteredCount, 0) };
}
