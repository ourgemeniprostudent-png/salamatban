/** Independently deployable geographic API. No patient app, auth or health DB. */
import { handleHospitalLookup } from '../lib/maps/hospital-handler';
import { createGeoapifyRateLimit } from '../lib/maps/rate-limit';

export type MapsWorkerEnv = {
  DB?: D1Database;
  GEOAPIFY_API_KEY?: string;
  GEOAPIFY_RATE_LIMIT_SECRET?: string;
  GEOAPIFY_ALLOWED_ORIGINS?: string;
};
const mapsWorker = {
  fetch(request: Request, env: MapsWorkerEnv): Promise<Response> | Response {
    if (new URL(request.url).pathname !== '/api/maps/hospitals') return Response.json({ error: 'NOT_FOUND' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    const apiKey = env.GEOAPIFY_API_KEY || '';
    return handleHospitalLookup(request, {
      apiKey,
      allowedOrigins: (env.GEOAPIFY_ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean),
      limit: env.DB && apiKey ? createGeoapifyRateLimit(env.DB, env.GEOAPIFY_RATE_LIMIT_SECRET || apiKey) : undefined,
    });
  },
};

export default mapsWorker;
