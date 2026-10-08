/** Server-only geographic provider. Never import into client/demo bundles.
 * Geoapify categories describe public map records, not clinical suitability.
 * API keys, provider URLs and upstream error bodies never leave this boundary.
 */
import { normalizeSearch } from '../data/cities';

export class GeoapifyError extends Error {
  constructor(public code: string, public status = 502, public retryAfter?: number) { super(code); this.name = 'GeoapifyError'; }
}
export type GeoapifyCity = { city: string; province: string; county: string; cityId?: string };
export type MapPoint = { latitude: number; longitude: number };
export type MedicalCategory = 'healthcare.hospital' | 'healthcare.clinic_or_praxis' | 'healthcare.clinic_or_praxis.general';
export type GeoapifyFacility = MapPoint & { id: string; name: string; address: string; kind: 'hospital' | 'clinic'; categories: MedicalCategory[]; classification: 'provider-category-unverified' };
export type GeoapifyResult = GeoapifyCity & { provider: 'geoapify'; basis: 'city-radius'; classification: 'provider-category-unverified'; center: MapPoint; radiusMeters: 10000 | 20000; facilities: GeoapifyFacility[]; retrievedAt: string; filteredCount: number };
export type GeoapifyProviderOptions = { apiKey: string; fetcher?: typeof fetch; timeoutMs?: number; maxBytes?: number; now?: () => number };
const geocodeEndpoint = 'https://api.geoapify.com/v1/geocode/search';
const placesEndpoint = 'https://api.geoapify.com/v2/places';
const object = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const numberBetween = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const text = (value: unknown, limit: number, secret = '') => typeof value === 'string' ? (secret ? value.split(secret).join('[redacted]') : value).replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, limit) : '';
function point(latitude: unknown, longitude: unknown): MapPoint | undefined {
  return numberBetween(latitude, 24, 40.5) && numberBetween(longitude, 43, 64) ? { latitude, longitude } : undefined;
}
const locationName = (value: unknown) => normalizeSearch(text(value, 250)).replace(/^(?:استان|شهرستان|شهر|بخش)\s+/u, '').replace(/\s+(?:province|county|city|district)$/u, '').replace(/[\s‌-]/g, '');
/** No substring/fuzzy match: a same-name settlement in another county must not win. */
export function parseGeoapifyGeocode(payload: unknown, city: GeoapifyCity): MapPoint {
  const value = object(payload);
  if (!value || !Array.isArray(value.results) || value.results.length > 10) throw new GeoapifyError('GEOAPIFY_UNSUPPORTED_RESPONSE');
  const matches = value.results.flatMap(entry => {
    const row = object(entry);
    if (!row) throw new GeoapifyError('GEOAPIFY_UNSUPPORTED_RESPONSE');
    const coordinates = point(row.lat, row.lon);
    if (!coordinates || row.country_code !== 'ir' || row.result_type !== 'city') return [];
    if (![row.city, row.name].some(name => locationName(name) === locationName(city.city))) return [];
    if (city.province && locationName(row.state) !== locationName(city.province)) return [];
    if (city.county && locationName(row.county) !== locationName(city.county)) return [];
    return [coordinates];
  });
  const unique = [...new Map(matches.map(row => [`${row.latitude.toFixed(5)},${row.longitude.toFixed(5)}`, row])).values()];
  if (unique.length !== 1) throw new GeoapifyError('GEOAPIFY_LOCATION_UNCONFIRMED', 422);
  return unique[0];
}
export function distanceMeters(a: MapPoint, b: MapPoint): number {
  const rad = Math.PI / 180, dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const term = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(Math.max(0, 1 - term)));
}
const knownCategories: readonly MedicalCategory[] = ['healthcare.hospital', 'healthcare.clinic_or_praxis', 'healthcare.clinic_or_praxis.general'];
// Source data sometimes misclassifies a dental practice or pharmacy as a clinic.
// Conservative omissions are preferable to presenting such records as general care.
const excludedName = /داروخانه|دندان|دندون|ماما(?:یی|ئی)|زایشگاه|زایمان|ترک[ ‌]*اعتیاد|اعتیاد|متادون|تصویربرداری|تصویر[ ‌]*برداری|رادیولوژی|سونوگرافی|آزمایشگاه|فیزیوتراپی|زیبایی|توانبخشی|مطب|ایستگاه|پارکینگ|خیابان|رستوران|\b(?:dent(?:al|ist)|pharmacy|maternity|midwi(?:fe|fery)|addiction|methadone|radiology|imaging|laboratory|physiotherapy|cosmetic|optical|psychiatr\w*|practice|parking|station|street|restaurant)\b/iu;
// Unicode word boundaries avoid treating city names such as شیروان/چشمه as
// روان/چشم specialties. These are omissions, never a positive suitability claim.
const specialtyName = /(?<![\p{L}\p{M}])(?:روان(?:[ ‌]?(?:پزشکی|شناسی|درمانی))?|چشم(?:[ ‌]?پزشکی)?|پوست|قلب|عروق|گوارش|کبد|غدد|نازایی|ناباروری|اورولوژی|تغذیه|لاغری|خواب|دیابت|آلرژی|اطفال|کودکان|زخم|ارتوپدی|هسته[ ‌]ای|کاشت[ ‌](?:مو|ابرو))(?![\p{L}\p{M}])|\b(?:cardio\w*|vascular|gastro\w*|diabet\w*|allerg\w*|p[ae]+diatric\w*|fertility|nutrition|slimming|sleep|wound|nuclear medicine|hair transplant)\b/iu;
const specialistClinicName = /(?<![\p{L}\p{M}])تخصصی(?![\p{L}\p{M}])|\b(?:specialist|specialty|specialised|specialized)\b/iu;
const diagnosticOrAdministrativeName = /(?<![\p{L}\p{M}])(?:تشخیص|تشخیصی|ژنتیک(?:ی)?|طب[ ‌]سوزنی|جراحی|درد|رژیم|انتقال[ ‌]خون|مدیریت[ ‌]حوادث)(?![\p{L}\p{M}])/u;
const practiceName = /^(?:دکتر|پزشک)(?=[\s‌]|$)|^(?:doctor|dr\.?)\b/iu;
const hospitalName = /بیمارستان|\bhospital\b|مرکز[ ‌]آموزشی(?:[ ‌]و)?[ ‌]درمانی/iu;
const clinicName = /^(?:درمانگاه|کلینیک|پلی[ ‌-]?کلینیک|مرکز[ ‌]+(?:درمانی|پزشکی|سلامت))(?=[\s‌]|$)|\b(?:clinic|polyclinic|medical cent(?:er|re))\b/iu;
const excludedCategory = (category: string) => category.startsWith('healthcare.dentist') || category === 'healthcare.pharmacy' || (category.startsWith('healthcare.clinic_or_praxis.') && category !== 'healthcare.clinic_or_praxis.general');
export function parseGeoapifyPlaces(payload: unknown, center: MapPoint, radiusMeters: number, secret = ''): { facilities: GeoapifyFacility[]; filteredCount: number } {
  const value = object(payload);
  if (!value || value.type !== 'FeatureCollection' || !Array.isArray(value.features) || value.features.length > 20) throw new GeoapifyError('GEOAPIFY_UNSUPPORTED_RESPONSE');
  const facilities: GeoapifyFacility[] = [], seen = new Set<string>(); let filteredCount = 0;
  for (const entry of value.features) {
    const feature = object(entry), row = object(feature?.properties);
    if (!feature || feature.type !== 'Feature' || !row || !Array.isArray(row.categories) || row.categories.length > 100 || !row.categories.every(value => typeof value === 'string')) throw new GeoapifyError('GEOAPIFY_UNSUPPORTED_RESPONSE');
    const name = text(row.name, 180, secret), coordinates = point(row.lat, row.lon), normalizedName = normalizeSearch(name);
    const allCategories = row.categories as string[];
    const categories = knownCategories.filter(category => allCategories.includes(category));
    const hospital = categories.includes('healthcare.hospital');
    const clinic = categories.some(category => category.startsWith('healthcare.clinic_or_praxis')) && clinicName.test(normalizedName);
    if (!name || !coordinates || distanceMeters(center, coordinates) > radiusMeters + 25 || excludedName.test(normalizedName) || specialtyName.test(normalizedName) || diagnosticOrAdministrativeName.test(normalizedName) || allCategories.some(excludedCategory) || (hospital && !hospitalName.test(normalizedName)) || (!hospital && (practiceName.test(normalizedName) || specialistClinicName.test(normalizedName) || !clinic))) { filteredCount++; continue; }
    const geometry = object(feature.geometry);
    if (geometry?.type === 'Point' && Array.isArray(geometry.coordinates)) {
      const geometryPoint = point(geometry.coordinates[1], geometry.coordinates[0]);
      if (!geometryPoint || distanceMeters(coordinates, geometryPoint) > 100) { filteredCount++; continue; }
    }
    // Duplicate labels at one location must not consume all six cards even when
    // distinct OSM objects have different provider place IDs.
    const identity = `${normalizeSearch(name)}:${coordinates.latitude.toFixed(5)},${coordinates.longitude.toFixed(5)}`;
    const providerId = text(row.place_id, 200, secret);
    if (seen.has(identity) || (providerId && seen.has(providerId))) continue;
    seen.add(identity); if (providerId) seen.add(providerId);
    facilities.push({ id: providerId || identity.slice(0, 200), name, address: text(row.formatted, 500, secret), ...coordinates, kind: hospital ? 'hospital' : 'clinic', categories, classification: 'provider-category-unverified' });
  }
  facilities.sort((a, b) => distanceMeters(center, a) - distanceMeters(center, b) || a.id.localeCompare(b.id));
  return { facilities: facilities.slice(0, 6), filteredCount };
}
async function boundedJson(response: Response, maxBytes: number): Promise<unknown> {
  const size = response.headers.get('content-length');
  if (size && Number(size) > maxBytes) { await response.body?.cancel().catch(() => {}); throw new GeoapifyError('GEOAPIFY_RESPONSE_TOO_LARGE'); }
  const reader = response.body?.getReader();
  if (!reader) throw new GeoapifyError('GEOAPIFY_UNSUPPORTED_RESPONSE');
  const parts: Uint8Array[] = []; let length = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > maxBytes) throw new GeoapifyError('GEOAPIFY_RESPONSE_TOO_LARGE'); parts.push(part.value); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new GeoapifyError('GEOAPIFY_UNSUPPORTED_RESPONSE'); }
}
async function providerJson(url: URL, options: GeoapifyProviderOptions) {
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  url.searchParams.set('apiKey', options.apiKey);
  const work = (async () => {
    const response = await (options.fetcher ?? fetch)(url.href, { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!response.ok || response.redirected) throw new GeoapifyError('GEOAPIFY_UNAVAILABLE');
    return boundedJson(response, options.maxBytes ?? 192_000);
  })();
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new GeoapifyError('GEOAPIFY_TIMEOUT', 504)); }, options.timeoutMs ?? 4000); });
  try { return await Promise.race([work, timeout]); }
  catch (error) { throw error instanceof GeoapifyError ? error : new GeoapifyError('GEOAPIFY_UNAVAILABLE'); }
  finally { clearTimeout(timer); }
}
export async function searchGeoapifyHospitals(city: GeoapifyCity, options: GeoapifyProviderOptions): Promise<GeoapifyResult> {
  if (!options.apiKey.trim()) throw new GeoapifyError('GEOAPIFY_NOT_CONFIGURED', 503);
  const geocode = new URL(geocodeEndpoint);
  geocode.searchParams.set('text', [...new Set([city.city, city.county, city.province, 'ایران'].filter(Boolean))].join('، '));
  geocode.searchParams.set('format', 'json'); geocode.searchParams.set('limit', '3'); geocode.searchParams.set('lang', 'fa');
  const center = parseGeoapifyGeocode(await providerJson(geocode, options), city);
  let radiusMeters: 10000 | 20000 = 10000;
  async function places(radius: number) {
    const url = new URL(placesEndpoint);
    url.searchParams.set('categories', 'healthcare.hospital,healthcare.clinic_or_praxis');
    url.searchParams.set('filter', `circle:${center.longitude},${center.latitude},${radius}`);
    url.searchParams.set('bias', `proximity:${center.longitude},${center.latitude}`);
    url.searchParams.set('limit', '20'); url.searchParams.set('lang', 'fa');
    return parseGeoapifyPlaces(await providerJson(url, options), center, radius, options.apiKey);
  }
  let result = await places(radiusMeters);
  if (!result.facilities.length) { radiusMeters = 20000; result = await places(radiusMeters); }
  return { ...city, provider: 'geoapify', basis: 'city-radius', classification: 'provider-category-unverified', center, radiusMeters, ...result, retrievedAt: new Date((options.now ?? Date.now)()).toISOString() };
}
