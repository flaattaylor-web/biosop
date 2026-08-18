/**
 * Persistence: immutable protocol versions, content-hash-bound signatures, and an
 * append-only audit log.
 *
 * Runs on two backends with IDENTICAL SQL:
 *   - Node:        better-sqlite3 (file on disk)          → createSqliteStore(path)
 *   - Cloudflare:  D1 (hosted SQLite)                      → createD1Store(env.DB)
 *
 * Everything is async so callers don't care which backend they have.
 */
import type { SopDocument } from '../types';
import { sha256Hex, randomId } from './hash';

// ---------------------------------------------------------------------------
// Driver interface — the only thing each backend has to provide
// ---------------------------------------------------------------------------

export interface SqlDriver {
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  /** Execute several statements atomically (best effort on D1: batch). */
  batch(stmts: { sql: string; params?: unknown[] }[]): Promise<void>;
  /** Run multiple DDL statements (schema creation). */
  exec(sql: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS protocols (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT,
    current_version_id TEXT,
    created_at TEXT NOT NULL,
    created_by TEXT,
    archived INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS protocol_versions (
    id TEXT PRIMARY KEY,
    protocol_id TEXT NOT NULL REFERENCES protocols(id),
    version TEXT NOT NULL,
    sop_json TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT,
    change_summary TEXT,
    supersedes_version_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
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
  )`,
  `CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY,
    version_id TEXT NOT NULL REFERENCES protocol_versions(id),
    role TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    signer_identifier TEXT,
    meaning TEXT NOT NULL,
    signed_at TEXT NOT NULL,
    content_hash TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_versions_protocol ON protocol_versions(protocol_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sig_version ON signatures(version_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_sig_unique_role ON signatures(version_id, role)`,
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Deterministic JSON: sorted keys at every level, so equal content hashes equal. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

export async function contentHash(sop: SopDocument): Promise<string> {
  // `version` is assigned by the store, not authored content — a bump must not
  // change the hash, or signatures would invalidate on their own version.
  const { accuracyAuditReport, equipmentInventoryCheck, auditReport, reactionCalculation, version, ...content } =
    sop as SopDocument & { accuracyAuditReport?: unknown };
  void accuracyAuditReport; void equipmentInventoryCheck; void auditReport; void reactionCalculation; void version;
  return sha256Hex(stableStringify(content));
}

function now(): string {
  return new Date().toISOString();
}

function bumpVersion(v: string): string {
  const m = /^(\d+)\.(\d+)$/.exec(v || '');
  if (!m) return `${v || '1.0'}.1`;
  return `${m[1]}.${Number(m[2]) + 1}`;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export interface DiffEntry { path: string; before: unknown; after: unknown }

export function deepDiff(a: unknown, b: unknown, path = '', out: DiffEntry[] = []): DiffEntry[] {
  if (a === b) return out;
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) deepDiff(a[k], b[k], path ? `${path}.${k}` : k, out);
    return out;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) deepDiff(a[i], b[i], `${path}[${i}]`, out);
    return out;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: path || '(root)', before: a, after: b });
  return out;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  actor?: string; action: string; entityType: string; entityId: string;
  field?: string; oldValue?: string; newValue?: string; detail?: string;
}
export interface AuditRow {
  id: number; ts: string; actor: string | null; action: string; entity_type: string; entity_id: string;
  field: string | null; old_value: string | null; new_value: string | null; detail: string | null;
}
interface ProtocolRow {
  id: string; document_id: string; title: string; category: string | null; current_version_id: string | null;
  created_at: string; created_by: string | null; archived: number;
}
interface VersionRow {
  id: string; protocol_id: string; version: string; sop_json: string; content_hash: string; created_at: string;
  created_by: string | null; change_summary: string | null; supersedes_version_id: string | null;
}
export interface ProtocolSummary {
  id: string; documentId: string; title: string; category: string | null; currentVersion: string | null;
  currentVersionId: string | null; versionCount: number; createdAt: string; updatedAt: string;
}
export interface SaveResult { protocolId: string; versionId: string; version: string; created: boolean }
export interface LoadedVersion {
  sop: SopDocument; version: string; versionId: string; protocolId: string; contentHash: string;
  createdAt: string; createdBy: string | null; changeSummary: string | null; supersedesVersionId: string | null;
}
export type SignatureRole = 'PREPARED' | 'REVIEWED' | 'APPROVED';
export interface SignatureRecord {
  id: string; versionId: string; role: SignatureRole; signerName: string; signerIdentifier: string | null;
  meaning: string; signedAt: string; contentHash: string; stillValid: boolean;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class ProtocolStore {
  private ready: Promise<void> | null = null;
  constructor(private readonly db: SqlDriver) {}

  /** Idempotent schema creation, run once per store instance. */
  init(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => { for (const s of SCHEMA_STATEMENTS) await this.db.exec(s); })();
    }
    return this.ready;
  }

  async logAudit(e: AuditEntry): Promise<void> {
    await this.init();
    await this.db.run(
      `INSERT INTO audit_log (ts, actor, action, entity_type, entity_id, field, old_value, new_value, detail) VALUES (?,?,?,?,?,?,?,?,?)`,
      [now(), e.actor ?? null, e.action, e.entityType, e.entityId, e.field ?? null, e.oldValue ?? null, e.newValue ?? null, e.detail ?? null]
    );
  }

  async getAuditLog(entityId?: string, limit = 200): Promise<AuditRow[]> {
    await this.init();
    const lim = Math.min(Math.max(1, limit), 2000);
    return entityId
      ? this.db.all<AuditRow>('SELECT * FROM audit_log WHERE entity_id = ? ORDER BY id DESC LIMIT ?', [entityId, lim])
      : this.db.all<AuditRow>('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?', [lim]);
  }

  async saveProtocol(sop: SopDocument, opts: { actor?: string; changeSummary?: string } = {}): Promise<SaveResult> {
    await this.init();
    if (!sop || !sop.id || !sop.title) throw new Error('SOP must have an id and a title.');
    const hash = await contentHash(sop);
    const ts = now();
    const existing = await this.db.get<ProtocolRow>('SELECT * FROM protocols WHERE id = ?', [sop.id]);

    if (!existing) {
      const versionId = randomId();
      const version = sop.version || '1.0';
      await this.db.batch([
        { sql: `INSERT INTO protocols (id, document_id, title, category, current_version_id, created_at, created_by, archived) VALUES (?,?,?,?,?,?,?,0)`,
          params: [sop.id, sop.documentId || sop.id, sop.title, sop.category ?? null, versionId, ts, opts.actor ?? null] },
        { sql: `INSERT INTO protocol_versions (id, protocol_id, version, sop_json, content_hash, created_at, created_by, change_summary, supersedes_version_id) VALUES (?,?,?,?,?,?,?,?,NULL)`,
          params: [versionId, sop.id, version, JSON.stringify({ ...sop, version }), hash, ts, opts.actor ?? null, opts.changeSummary ?? 'Initial version'] },
        { sql: `INSERT INTO audit_log (ts, actor, action, entity_type, entity_id, field, old_value, new_value, detail) VALUES (?,?,?,?,?,?,?,?,?)`,
          params: [ts, opts.actor ?? null, 'PROTOCOL_CREATED', 'protocol', sop.id, null, null, version, sop.title] },
      ]);
      return { protocolId: sop.id, versionId, version, created: true };
    }

    const current = existing.current_version_id
      ? await this.db.get<VersionRow>('SELECT * FROM protocol_versions WHERE id = ?', [existing.current_version_id])
      : undefined;

    if (current && current.content_hash === hash) {
      await this.logAudit({ actor: opts.actor, action: 'NO_OP_SAVE', entityType: 'protocol', entityId: sop.id, detail: 'Content unchanged; no new version created.' });
      return { protocolId: sop.id, versionId: current.id, version: current.version, created: false };
    }

    let version = sop.version || '1.0';
    if (current && version === current.version) version = bumpVersion(current.version);
    const versionId = randomId();
    await this.db.batch([
      { sql: `INSERT INTO protocol_versions (id, protocol_id, version, sop_json, content_hash, created_at, created_by, change_summary, supersedes_version_id) VALUES (?,?,?,?,?,?,?,?,?)`,
        params: [versionId, sop.id, version, JSON.stringify({ ...sop, version }), hash, ts, opts.actor ?? null, opts.changeSummary ?? null, current?.id ?? null] },
      { sql: 'UPDATE protocols SET current_version_id = ?, title = ?, category = ?, document_id = ? WHERE id = ?',
        params: [versionId, sop.title, sop.category ?? null, sop.documentId || existing.document_id, sop.id] },
      { sql: `INSERT INTO audit_log (ts, actor, action, entity_type, entity_id, field, old_value, new_value, detail) VALUES (?,?,?,?,?,?,?,?,?)`,
        params: [ts, opts.actor ?? null, 'PROTOCOL_VERSION_CREATED', 'protocol', sop.id, 'version', current?.version ?? null, version, opts.changeSummary ?? null] },
    ]);
    return { protocolId: sop.id, versionId, version, created: true };
  }

  async listProtocols(): Promise<ProtocolSummary[]> {
    await this.init();
    const rows = await this.db.all<ProtocolRow & { version_count: number; updated_at: string; current_version: string | null }>(`
      SELECT p.*,
        (SELECT COUNT(*) FROM protocol_versions v WHERE v.protocol_id = p.id) AS version_count,
        (SELECT MAX(created_at) FROM protocol_versions v WHERE v.protocol_id = p.id) AS updated_at,
        (SELECT version FROM protocol_versions v WHERE v.id = p.current_version_id) AS current_version
      FROM protocols p WHERE p.archived = 0 ORDER BY updated_at DESC`);
    return rows.map((r) => ({
      id: r.id, documentId: r.document_id, title: r.title, category: r.category, currentVersion: r.current_version,
      currentVersionId: r.current_version_id, versionCount: Number(r.version_count), createdAt: r.created_at, updatedAt: r.updated_at,
    }));
  }

  private rowToLoaded(v: VersionRow): LoadedVersion {
    return {
      sop: JSON.parse(v.sop_json) as SopDocument, version: v.version, versionId: v.id, protocolId: v.protocol_id,
      contentHash: v.content_hash, createdAt: v.created_at, createdBy: v.created_by, changeSummary: v.change_summary,
      supersedesVersionId: v.supersedes_version_id,
    };
  }

  async getProtocol(protocolId: string): Promise<LoadedVersion | null> {
    await this.init();
    const p = await this.db.get<ProtocolRow>('SELECT * FROM protocols WHERE id = ?', [protocolId]);
    if (!p || !p.current_version_id) return null;
    const v = await this.db.get<VersionRow>('SELECT * FROM protocol_versions WHERE id = ?', [p.current_version_id]);
    return v ? this.rowToLoaded(v) : null;
  }

  async getVersion(versionId: string): Promise<LoadedVersion | null> {
    await this.init();
    const v = await this.db.get<VersionRow>('SELECT * FROM protocol_versions WHERE id = ?', [versionId]);
    return v ? this.rowToLoaded(v) : null;
  }

  async listVersions(protocolId: string): Promise<Omit<LoadedVersion, 'sop'>[]> {
    await this.init();
    const rows = await this.db.all<VersionRow>('SELECT * FROM protocol_versions WHERE protocol_id = ? ORDER BY created_at DESC', [protocolId]);
    return rows.map((v) => { const { sop, ...rest } = this.rowToLoaded(v); void sop; return rest; });
  }

  async archiveProtocol(protocolId: string, actor?: string): Promise<boolean> {
    await this.init();
    const r = await this.db.run('UPDATE protocols SET archived = 1 WHERE id = ? AND archived = 0', [protocolId]);
    if (r.changes > 0) {
      await this.logAudit({ actor, action: 'PROTOCOL_ARCHIVED', entityType: 'protocol', entityId: protocolId });
      return true;
    }
    return false;
  }

  async diffVersions(versionIdA: string, versionIdB: string): Promise<DiffEntry[] | null> {
    const a = await this.getVersion(versionIdA);
    const b = await this.getVersion(versionIdB);
    if (!a || !b) return null;
    return deepDiff(a.sop, b.sop);
  }

  async addSignature(input: { versionId: string; role: SignatureRole; signerName: string; signerIdentifier?: string; meaning: string; actor?: string }): Promise<SignatureRecord> {
    await this.init();
    const v = await this.db.get<VersionRow>('SELECT * FROM protocol_versions WHERE id = ?', [input.versionId]);
    if (!v) throw new Error('Version not found.');
    if (!['PREPARED', 'REVIEWED', 'APPROVED'].includes(input.role)) throw new Error('Invalid signature role.');
    if (!input.signerName?.trim()) throw new Error('Signer name is required.');
    if (!input.meaning?.trim()) throw new Error('Signature meaning is required.');
    const dup = await this.db.get('SELECT id FROM signatures WHERE version_id = ? AND role = ?', [input.versionId, input.role]);
    if (dup) throw new Error(`A ${input.role} signature already exists on this version.`);
    const id = randomId();
    const ts = now();
    await this.db.batch([
      { sql: `INSERT INTO signatures (id, version_id, role, signer_name, signer_identifier, meaning, signed_at, content_hash) VALUES (?,?,?,?,?,?,?,?)`,
        params: [id, input.versionId, input.role, input.signerName.trim(), input.signerIdentifier ?? null, input.meaning.trim(), ts, v.content_hash] },
      { sql: `INSERT INTO audit_log (ts, actor, action, entity_type, entity_id, field, old_value, new_value, detail) VALUES (?,?,?,?,?,?,?,?,?)`,
        params: [ts, input.actor ?? input.signerName, 'SIGNATURE_ADDED', 'version', input.versionId, input.role, null, input.signerName, input.meaning] },
    ]);
    return {
      id, versionId: input.versionId, role: input.role, signerName: input.signerName.trim(), signerIdentifier: input.signerIdentifier ?? null,
      meaning: input.meaning.trim(), signedAt: ts, contentHash: v.content_hash, stillValid: true,
    };
  }

  async verifySignatures(versionId: string): Promise<SignatureRecord[]> {
    await this.init();
    const v = await this.db.get<VersionRow>('SELECT * FROM protocol_versions WHERE id = ?', [versionId]);
    if (!v) return [];
    const currentHash = await contentHash(JSON.parse(v.sop_json) as SopDocument);
    const rows = await this.db.all<{ id: string; version_id: string; role: SignatureRole; signer_name: string; signer_identifier: string | null; meaning: string; signed_at: string; content_hash: string }>(
      'SELECT * FROM signatures WHERE version_id = ? ORDER BY signed_at', [versionId]);
    return rows.map((r) => ({
      id: r.id, versionId: r.version_id, role: r.role, signerName: r.signer_name, signerIdentifier: r.signer_identifier,
      meaning: r.meaning, signedAt: r.signed_at, contentHash: r.content_hash,
      stillValid: r.content_hash === v.content_hash && v.content_hash === currentHash,
    }));
  }
}

// ---------------------------------------------------------------------------
// D1 driver (Cloudflare) — no Node imports here so it bundles for Workers.
// ---------------------------------------------------------------------------

/** Minimal structural type for a D1 binding, so we don't need the CF types at runtime. */
export interface D1Like {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      run(): Promise<{ meta?: { changes?: number } }>;
      all<T = unknown>(): Promise<{ results?: T[] }>;
      first<T = unknown>(): Promise<T | null>;
    };
  };
  batch(stmts: unknown[]): Promise<unknown>;
  exec(sql: string): Promise<unknown>;
}

export function d1Driver(d1: D1Like): SqlDriver {
  return {
    async run(sql, params = []) {
      const r = await d1.prepare(sql).bind(...params).run();
      return { changes: r.meta?.changes ?? 0 };
    },
    async all<T>(sql: string, params: unknown[] = []) {
      const r = await d1.prepare(sql).bind(...params).all<T>();
      return r.results ?? [];
    },
    async get<T>(sql: string, params: unknown[] = []) {
      const r = await d1.prepare(sql).bind(...params).first<T>();
      return r ?? undefined;
    },
    async batch(stmts) {
      await d1.batch(stmts.map((s) => d1.prepare(s.sql).bind(...(s.params ?? []))));
    },
    async exec(sql) {
      // D1's exec() wants single-line statements; normalise whitespace.
      await d1.exec(sql.replace(/\s+/g, ' ').trim());
    },
  };
}

export function createD1Store(d1: D1Like): ProtocolStore {
  return new ProtocolStore(d1Driver(d1));
}
