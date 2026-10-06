CREATE TABLE provider_integrations (
  id TEXT PRIMARY KEY NOT NULL,
  provider_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_base_url TEXT,
  booking_url TEXT,
  credential_env_key TEXT,
  mode TEXT NOT NULL DEFAULT 'test',
  status TEXT NOT NULL DEFAULT 'draft',
  payment_owner TEXT NOT NULL DEFAULT 'provider',
  is_enabled INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_provider_integrations_provider_key ON provider_integrations(provider_key);
