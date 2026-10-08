-- Use a dedicated maps quota database. No patient tables are needed or created.
CREATE TABLE IF NOT EXISTS pilot_rate_limits (
  key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
