ALTER TABLE packets
  ADD COLUMN source TEXT NOT NULL DEFAULT 'demo'
  CHECK (source IN ('demo', 'capture', 'manual'));

DELETE FROM packets
WHERE CAST(id AS INTEGER) BETWEEN 18473 AND 18492;

