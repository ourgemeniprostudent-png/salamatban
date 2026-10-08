/** Reuses only the existing rate-limit table, never the medical service/session. */
import { GeoapifyError } from './geoapify';

type LimitOptions = { now?: () => number; perIpMinute?: number; globalMinute?: number; globalDay?: number };
export function createGeoapifyRateLimit(db: D1Database, secret: string, options: LimitOptions = {}) {
  return async (request: Request) => {
    const now = (options.now ?? Date.now)();
    try {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      // This header is trustworthy only behind Cloudflare, where the route runs.
      // Direct local requests share a single fallback bucket; never use X-Forwarded-For.
      const ip = request.headers.get('cf-connecting-ip') || 'local-unavailable';
      const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`geoapify-rate-limit:${ip}`));
      const digest = [...new Uint8Array(signed)].map(n => n.toString(16).padStart(2, '0')).join('');
      const limits: [string, number, number][] = [
        [`geoapify:ip:${digest}`, options.perIpMinute ?? 12, 60000],
        ['geoapify:global:minute', options.globalMinute ?? 120, 60000],
        // At most three provider calls per lookup (geocode + 1–2 Places).
        // 800 lookups reserve headroom under a 3,000-credit/day free account.
        ['geoapify:global:day', options.globalDay ?? 800, 86400000],
      ];
      for (const [bucket, maximum, windowMs] of limits) {
        const row = await db.prepare('INSERT INTO pilot_rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count,expires_at').bind(bucket, now + windowMs, now, now).first<{ count: number; expires_at: number }>();
        if (!row) throw new GeoapifyError('GEOAPIFY_NOT_CONFIGURED', 503);
        if (row.count > maximum) throw new GeoapifyError('GEOAPIFY_RATE_LIMITED', 429, Math.max(1, Math.ceil((row.expires_at - now) / 1000)));
      }
    } catch (error) { throw error instanceof GeoapifyError ? error : new GeoapifyError('GEOAPIFY_NOT_CONFIGURED', 503); }
  };
}
