/** Independently deployable geographic API. No patient app, auth or health DB. */
import { handleHospitalLookup } from '../lib/maps/hospital-handler';
import { createNeshanRateLimit } from '../lib/maps/rate-limit';

export type MapsWorkerEnv = {
  DB?: D1Database;
  NESHAN_API_KEY?: string;
  NESHAN_RATE_LIMIT_SECRET?: string;
  NESHAN_ALLOWED_ORIGINS?: string;
};
const mapsWorker = {
  fetch(request: Request, env: MapsWorkerEnv): Promise<Response> | Response {
    if (new URL(request.url).pathname !== '/api/maps/hospitals') return Response.json({ error: 'NOT_FOUND' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    const apiKey = env.NESHAN_API_KEY || '';
    return handleHospitalLookup(request, {
      apiKey,
      allowedOrigins: (env.NESHAN_ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean),
      limit: env.DB && apiKey ? createNeshanRateLimit(env.DB, env.NESHAN_RATE_LIMIT_SECRET || apiKey) : undefined,
    });
  },
};

export default mapsWorker;
