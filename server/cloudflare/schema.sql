CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active');
CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL, current_period_end TEXT, trial_ends_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS installations (id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, platform TEXT NOT NULL, app_version TEXT, last_seen TEXT NOT NULL, revoked_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS licenses (id TEXT PRIMARY KEY, installation_id TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL, issued_at TEXT NOT NULL, valid_until TEXT NOT NULL, offline_grace_until TEXT NOT NULL, payload TEXT NOT NULL, signature TEXT NOT NULL, FOREIGN KEY(installation_id) REFERENCES installations(id));
CREATE TABLE IF NOT EXISTS refresh_tokens (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS access_tokens (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE INDEX IF NOT EXISTS idx_installations_user ON installations(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_installation ON licenses(installation_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_user ON access_tokens(user_id);
