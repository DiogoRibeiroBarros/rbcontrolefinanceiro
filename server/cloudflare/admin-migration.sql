ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, actor_email TEXT NOT NULL, action TEXT NOT NULL, target_user_id TEXT, metadata TEXT, ip TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit(created_at);
