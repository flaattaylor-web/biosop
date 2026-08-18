-- BioSOP schema. The Worker also runs these idempotently on first request,
-- so applying this migration is optional but recommended:
--   npx wrangler d1 migrations apply biosop --remote
CREATE TABLE IF NOT EXISTS protocols (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  current_version_id TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS protocol_versions (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL REFERENCES protocols(id),
  version TEXT NOT NULL,
  sop_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  change_summary TEXT,
  supersedes_version_id TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  detail TEXT
);
CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES protocol_versions(id),
  role TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_identifier TEXT,
  meaning TEXT NOT NULL,
  signed_at TEXT NOT NULL,
  content_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_versions_protocol ON protocol_versions(protocol_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_sig_version ON signatures(version_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sig_unique_role ON signatures(version_id, role);
