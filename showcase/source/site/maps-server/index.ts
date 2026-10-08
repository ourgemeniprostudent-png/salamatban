import { configFromEnv, createMapsServer } from './server';

try {
  const config = configFromEnv(), app = createMapsServer(config);
  app.server.on('error', () => { console.error('Maps gateway could not listen. Check host/port and local configuration.'); void app.close().finally(() => { process.exitCode = 1; }); });
  app.server.listen(config.port, config.host, () => console.log(`Maps gateway listening on ${config.host}:${config.port}; upstream credentials are server-only.`));
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close().catch(() => { process.exitCode = 1; }); });
} catch {
  console.error('Maps gateway startup failed. Check Node.js 24+, origin/port configuration and writable SQLite directory.');
  process.exitCode = 1;
}
