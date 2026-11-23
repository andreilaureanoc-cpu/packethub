CREATE TABLE IF NOT EXISTS packets (
  id TEXT PRIMARY KEY,
  time TEXT NOT NULL,
  src TEXT NOT NULL,
  dst TEXT NOT NULL,
  protocol TEXT NOT NULL,
  info_json TEXT NOT NULL,
  size TEXT NOT NULL,
  dropped INTEGER CHECK (dropped IN (0, 1))
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  ip TEXT NOT NULL,
  service TEXT NOT NULL,
  latency TEXT NOT NULL,
  load TEXT NOT NULL,
  status TEXT NOT NULL
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

CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  page TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS access_logs_accessed_at_idx
  ON access_logs(accessed_at);
