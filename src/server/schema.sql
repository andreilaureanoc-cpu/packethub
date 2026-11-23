CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  token_id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS packets (
  id TEXT PRIMARY KEY,
  time TEXT NOT NULL,
  src TEXT NOT NULL,
  dst TEXT NOT NULL,
  protocol TEXT NOT NULL,
  info_json TEXT NOT NULL,
  size TEXT NOT NULL,
  dropped INTEGER CHECK (dropped IN (0, 1)),
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'demo'
    CHECK (source IN ('demo', 'capture', 'manual'))
);

CREATE TABLE IF NOT EXISTS packet_storage (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_bytes INTEGER NOT NULL CHECK (total_bytes >= 0)
);

INSERT OR IGNORE INTO packet_storage (id, total_bytes)
SELECT 1, COALESCE(SUM(
  length(CAST(id AS BLOB)) +
  length(CAST(time AS BLOB)) +
  length(CAST(src AS BLOB)) +
  length(CAST(dst AS BLOB)) +
  length(CAST(protocol AS BLOB)) +
  length(CAST(info_json AS BLOB)) +
  length(CAST(size AS BLOB)) +
  length(CAST(COALESCE(source, '') AS BLOB)) +
  length(CAST(COALESCE(created_by_user_id, '') AS BLOB)) +
  CASE WHEN dropped IS NULL THEN 0 ELSE 1 END
), 0)
FROM packets;

CREATE TRIGGER IF NOT EXISTS packets_storage_after_insert
AFTER INSERT ON packets
BEGIN
  UPDATE packet_storage
  SET total_bytes = total_bytes +
    length(CAST(NEW.id AS BLOB)) +
    length(CAST(NEW.time AS BLOB)) +
    length(CAST(NEW.src AS BLOB)) +
    length(CAST(NEW.dst AS BLOB)) +
    length(CAST(NEW.protocol AS BLOB)) +
    length(CAST(NEW.info_json AS BLOB)) +
    length(CAST(NEW.size AS BLOB)) +
    length(CAST(COALESCE(NEW.source, '') AS BLOB)) +
    length(CAST(COALESCE(NEW.created_by_user_id, '') AS BLOB)) +
    CASE WHEN NEW.dropped IS NULL THEN 0 ELSE 1 END
  WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS packets_storage_after_update
AFTER UPDATE ON packets
BEGIN
  UPDATE packet_storage
  SET total_bytes = total_bytes
    - length(CAST(OLD.id AS BLOB))
    - length(CAST(OLD.time AS BLOB))
    - length(CAST(OLD.src AS BLOB))
    - length(CAST(OLD.dst AS BLOB))
    - length(CAST(OLD.protocol AS BLOB))
    - length(CAST(OLD.info_json AS BLOB))
    - length(CAST(OLD.size AS BLOB))
    - length(CAST(COALESCE(OLD.source, '') AS BLOB))
    - length(CAST(COALESCE(OLD.created_by_user_id, '') AS BLOB))
    - CASE WHEN OLD.dropped IS NULL THEN 0 ELSE 1 END
    + length(CAST(NEW.id AS BLOB))
    + length(CAST(NEW.time AS BLOB))
    + length(CAST(NEW.src AS BLOB))
    + length(CAST(NEW.dst AS BLOB))
    + length(CAST(NEW.protocol AS BLOB))
    + length(CAST(NEW.info_json AS BLOB))
    + length(CAST(NEW.size AS BLOB))
    + length(CAST(COALESCE(NEW.source, '') AS BLOB))
    + length(CAST(COALESCE(NEW.created_by_user_id, '') AS BLOB))
    + CASE WHEN NEW.dropped IS NULL THEN 0 ELSE 1 END
  WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS packets_storage_after_delete
AFTER DELETE ON packets
BEGIN
  UPDATE packet_storage
  SET total_bytes = total_bytes
    - length(CAST(OLD.id AS BLOB))
    - length(CAST(OLD.time AS BLOB))
    - length(CAST(OLD.src AS BLOB))
    - length(CAST(OLD.dst AS BLOB))
    - length(CAST(OLD.protocol AS BLOB))
    - length(CAST(OLD.info_json AS BLOB))
    - length(CAST(OLD.size AS BLOB))
    - length(CAST(COALESCE(OLD.source, '') AS BLOB))
    - length(CAST(COALESCE(OLD.created_by_user_id, '') AS BLOB))
    - CASE WHEN OLD.dropped IS NULL THEN 0 ELSE 1 END
  WHERE id = 1;
END;

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  ip TEXT NOT NULL,
  service TEXT NOT NULL,
  latency TEXT NOT NULL,
  load TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS capture (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  interface TEXT NOT NULL,
  command TEXT NOT NULL,
  duration TEXT NOT NULL,
  filter TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS layers (
  id TEXT PRIMARY KEY,
  protocols_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS packets_protocol_idx ON packets(protocol);
CREATE INDEX IF NOT EXISTS packets_created_by_user_idx
  ON packets(created_by_user_id);
CREATE INDEX IF NOT EXISTS nodes_created_by_user_idx
  ON nodes(created_by_user_id);

CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  page TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS access_logs_accessed_at_idx
  ON access_logs(accessed_at);
