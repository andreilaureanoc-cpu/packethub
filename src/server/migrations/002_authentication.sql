CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE revoked_tokens (
  token_id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

ALTER TABLE packets
  ADD COLUMN created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE nodes
  ADD COLUMN created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX packets_created_by_user_idx ON packets(created_by_user_id);
CREATE INDEX nodes_created_by_user_idx ON nodes(created_by_user_id);
