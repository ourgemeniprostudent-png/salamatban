/** Public geographic boundary, separate from medical record auth and demo storage. */
import { findCityById, normalizeSearch } from '../data/cities';
import { GeoapifyError, searchGeoapifyHospitals, type GeoapifyCity, type GeoapifyProviderOptions } from './geoapify';

export type HospitalHandlerOptions = GeoapifyProviderOptions & {
  allowedOrigins?: readonly string[];
  limit?: (request: Request) => Promise<void>;
};
export const defaultMapOrigins = ['https://ourgemeniprostudent-png.github.io'] as const;
const allowedKeys = new Set(['cityId', 'city', 'province', 'county']);
function place(value: string | null, required = false) {
  const result = normalizeSearch(value ?? '');
  if ((!result && required) || result.length > 100 || (result && !/^[\p{L}\p{M}\d\s‌()\-]+$/u.test(result))) throw new GeoapifyError('GEOAPIFY_INVALID_LOCATION', 400);
  return result;
}
export function requestCity(url: URL): GeoapifyCity {
  if (url.href.length > 1500) throw new GeoapifyError('GEOAPIFY_INVALID_LOCATION', 400);
  for (const key of url.searchParams.keys()) if (!allowedKeys.has(key) || url.searchParams.getAll(key).length !== 1) throw new GeoapifyError('GEOAPIFY_INVALID_LOCATION', 400);
  const cityId = url.searchParams.get('cityId');
  if (cityId) {
    if (cityId.length > 80) throw new GeoapifyError('GEOAPIFY_INVALID_LOCATION', 400);
    const city = findCityById(cityId);
    if (!city) throw new GeoapifyError('GEOAPIFY_INVALID_LOCATION', 400);
    // The canonical catalog owns the query. Supplied labels cannot override it.
    return { cityId: city.id, city: city.name, province: city.province, county: city.county || '' };
  }
  return { city: place(url.searchParams.get('city'), true), province: place(url.searchParams.get('province')), county: place(url.searchParams.get('county')) };
}
function validOrigin(value: string) {
  try { const url = new URL(value); return url.origin === value && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))); } catch { return false; }
}

export async function handleHospitalLookup(request: Request, options: HospitalHandlerOptions): Promise<Response> {
  const url = new URL(request.url), origin = request.headers.get('origin');
  const allowed = new Set([url.origin, ...defaultMapOrigins, ...(options.allowedOrigins ?? []).filter(validOrigin)]);
  const cors: Record<string, string> = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', Vary: 'Origin' };
  const respond = (data: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(data, { status, headers: { ...cors, ...extra } });
  if (origin && !allowed.has(origin)) return respond({ error: 'GEOAPIFY_BAD_ORIGIN' }, 403);
  if (origin) cors['Access-Control-Allow-Origin'] = origin;
  if (request.method === 'OPTIONS') {
    if (request.headers.get('access-control-request-method') && request.headers.get('access-control-request-method') !== 'GET') return respond({ error: 'GEOAPIFY_METHOD_NOT_ALLOWED' }, 405);
    return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Accept', 'Access-Control-Max-Age': '600' } });
  }
  if (request.method !== 'GET') return respond({ error: 'GEOAPIFY_METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET, OPTIONS' });
  try {
    if (request.body || Number(request.headers.get('content-length') || 0) > 0) throw new GeoapifyError('GEOAPIFY_INVALID_LOCATION', 400);
    const city = requestCity(url);
    if (!options.apiKey.trim() || !options.limit) throw new GeoapifyError('GEOAPIFY_NOT_CONFIGURED', 503);
    // CORS is not a quota control. A durable/server-enforced limiter is required.
    await options.limit(request);
    return respond(await searchGeoapifyHospitals(city, options));
  } catch (error) {
    const issue = error instanceof GeoapifyError ? error : new GeoapifyError('GEOAPIFY_UNAVAILABLE');
    return respond({ error: issue.code }, issue.status, issue.retryAfter ? { 'Retry-After': String(issue.retryAfter) } : {});
  }
}
