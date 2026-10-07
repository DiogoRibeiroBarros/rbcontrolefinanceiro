CREATE TABLE IF NOT EXISTS subscription_limits (
  user_id TEXT PRIMARY KEY,
  max_devices INTEGER NOT NULL DEFAULT 1,
  max_apps INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_limits_user ON subscription_limits(user_id);
