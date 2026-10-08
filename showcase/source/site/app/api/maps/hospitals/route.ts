import { env } from 'cloudflare:workers';
import { handleHospitalLookup } from '@/lib/maps/hospital-handler';
import { createGeoapifyRateLimit } from '@/lib/maps/rate-limit';

// Secrets live exclusively in this server boundary; static deployments configure
// this route's public HTTPS URL, never the Geoapify API key, in their browser bundle.
const handler = (request: Request) => {
  const bindings = env as unknown as Record<string, unknown>;
  const value = (name: string) => typeof bindings[name] === 'string' ? bindings[name] as string : process.env[name] || '';
  const apiKey = value('GEOAPIFY_API_KEY');
  const db = bindings.DB as D1Database | undefined;
  return handleHospitalLookup(request, {
    apiKey,
    allowedOrigins: value('GEOAPIFY_ALLOWED_ORIGINS').split(',').map(origin => origin.trim()).filter(Boolean),
    limit: db && apiKey ? createGeoapifyRateLimit(db, value('GEOAPIFY_RATE_LIMIT_SECRET') || apiKey) : undefined,
  });
};
export const GET = handler;
export const OPTIONS = handler;
