/** Standalone geography gateway: no patient app, sessions or medical database. */
import { createServer, type IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { handleHospitalLookup } from '../lib/maps/hospital-handler';
import { createGeoapifyRateLimit } from '../lib/maps/rate-limit';
import type { GeoapifyProviderOptions } from '../lib/maps/geoapify';

type Config = {
  apiKey: string; rateLimitSecret: string; databasePath: string; publicOrigin: string;
  host: string; port: number; allowedOrigins: string[]; trustLoopbackProxy: boolean;
};
type Options = Config & {
  provider?: Omit<GeoapifyProviderOptions, 'apiKey'>;
  quota?: { now?: () => number; perIpMinute?: number; globalMinute?: number; globalDay?: number };
};

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.MAPS_PORT || 8789), host = env.MAPS_HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !isIP(host)) throw new Error('Invalid maps listening address.');
  const publicOrigin = env.MAPS_PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
  let parsed: URL;
  try { parsed = new URL(publicOrigin); } catch { throw new Error('Invalid MAPS_PUBLIC_ORIGIN.'); }
  if (parsed.origin !== publicOrigin || (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)))) throw new Error('MAPS_PUBLIC_ORIGIN must be an HTTPS origin or local HTTP origin.');
  if (env.MAPS_TRUST_PROXY && env.MAPS_TRUST_PROXY !== 'loopback') throw new Error('MAPS_TRUST_PROXY only accepts loopback.');
  const apiKey = (env.GEOAPIFY_API_KEY || '').trim();
  return { apiKey, rateLimitSecret: env.GEOAPIFY_RATE_LIMIT_SECRET || apiKey, databasePath: resolve(env.MAPS_DB_PATH || '.maps-data/rate-limits.sqlite'), publicOrigin, host, port,
    allowedOrigins: (env.GEOAPIFY_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean), trustLoopbackProxy: env.MAPS_TRUST_PROXY === 'loopback' };
}

function normalizedIp(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const candidate = value.startsWith('::ffff:') ? value.slice(7) : value;
  return isIP(candidate) ? candidate : undefined;
}
export function clientAddress(socketAddress: string | undefined, realIp: string | string[] | undefined, trustLoopbackProxy: boolean): string {
  const socket = normalizedIp(socketAddress);
  const loopback = socket === '::1' || !!socket?.startsWith('127.');
  // Only an explicitly trusted local reverse proxy can set this single-value
  // header. X-Forwarded-For and incoming CF-Connecting-IP are never accepted.
  if (trustLoopbackProxy && loopback && typeof realIp === 'string') {
    const forwarded = normalizedIp(realIp.trim());
    if (forwarded) return forwarded;
  }
  return socket || 'local-unavailable';
}

export function createMapsServer(options: Options) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 or newer is required.');
  mkdirSync(dirname(options.databasePath), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(options.databasePath);
  chmodSync(options.databasePath, 0o600);
  database.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS pilot_rate_limits (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);');
  const cleanup = () => database.prepare('DELETE FROM pilot_rate_limits WHERE expires_at <= ?').run(Date.now());
  cleanup();
  const housekeeping = setInterval(() => { try { cleanup(); } catch { /* Quota queries still fail closed if storage becomes unavailable. */ } }, 3600000); housekeeping.unref();
  // The common limiter needs only this narrow D1-shaped interface. SQL remains
  // bound and atomic in a dedicated persistent SQLite file across restarts.
  const adapter = { prepare(sql: string) { return { bind(...values: SQLInputValue[]) { return { async first() { return database.prepare(sql).get(...values) || null; } }; } }; } } as unknown as D1Database;
  const limit = options.apiKey ? createGeoapifyRateLimit(adapter, options.rateLimitSecret || options.apiKey, options.quota) : undefined;
  const incomingHeaders = (incoming: IncomingMessage) => {
    const headers = new Headers();
    for (const key of ['origin', 'accept', 'content-length', 'access-control-request-method', 'access-control-request-headers']) {
      const value = incoming.headers[key];
      if (typeof value === 'string') headers.set(key, value);
    }
    headers.set('cf-connecting-ip', clientAddress(incoming.socket.remoteAddress, incoming.headers['x-real-ip'], options.trustLoopbackProxy));
    return headers;
  };
  const server = createServer({ maxHeaderSize: 8192 }, async (incoming, outgoing) => {
    incoming.resume();
    try {
      const path = incoming.url || '/';
      // Never derive the public origin or CORS trust from attacker-controlled
      // Host/X-Forwarded-Host headers or an absolute-form request target.
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) { outgoing.writeHead(400).end(); return; }
      const url = new URL(path, options.publicOrigin);
      if (url.origin !== options.publicOrigin || (incoming.method === 'GET' && (incoming.headers['transfer-encoding'] || Number(incoming.headers['content-length'] || 0) > 0))) {
        outgoing.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end('{"error":"GEOAPIFY_INVALID_LOCATION"}'); return;
      }
      const response = url.pathname === '/healthz' && incoming.method === 'GET'
        ? Response.json({ status: 'ok', service: 'maps-gateway' }, { headers: { 'Cache-Control': 'no-store' } })
        : url.pathname === '/api/maps/hospitals'
          ? await handleHospitalLookup(new Request(url, { method: incoming.method, headers: incomingHeaders(incoming) }), { ...options.provider, apiKey: options.apiKey, allowedOrigins: options.allowedOrigins, limit })
          : Response.json({ error: 'NOT_FOUND' }, { status: 404 });
      outgoing.writeHead(response.status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...Object.fromEntries(response.headers) });
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      // No upstream URLs, keys, patient data or raw requests enter error output.
      if (!outgoing.headersSent) outgoing.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      outgoing.end('{"error":"GEOAPIFY_UNAVAILABLE"}');
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000; server.maxHeadersCount = 40;
  let closed = false;
  async function close() {
    if (closed) return; closed = true;
    await new Promise<void>((resolveClose, reject) => server.close(error => error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolveClose()));
    clearInterval(housekeeping); database.close();
  }
  return { server, close };
}
