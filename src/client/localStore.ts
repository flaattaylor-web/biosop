/**
 * Browser-local protocol vault (IndexedDB).
 *
 * Same behaviour as the server ProtocolStore — immutable versions, content-hash
 * bound signatures, append-only audit log — but the data never leaves this
 * browser profile. Reuses the pure helpers from the server store so the hashes
 * and diffs are byte-identical to what a server would compute.
 */
import type { SopDocument, KitIndexEntry } from '../types';
import {
  contentHash, deepDiff, DiffEntry, ProtocolSummary, SaveResult, LoadedVersion, SignatureRole, SignatureRecord, AuditRow, AuditEntry,
} from '../server/db';
import { randomId } from '../server/hash';

const DB_NAME = 'biosop-vault';
const DB_VERSION = 2;

interface ProtocolRec { id: string; documentId: string; title: string; category: string | null; currentVersionId: string | null; createdAt: string; createdBy: string | null; archived: 0 | 1 }
interface VersionRec { id: string; protocolId: string; version: string; sop: SopDocument; contentHash: string; createdAt: string; createdBy: string | null; changeSummary: string | null; supersedesVersionId: string | null }
interface SignatureRec { id: string; versionId: string; role: SignatureRole; signerName: string; signerIdentifier: string | null; meaning: string; signedAt: string; contentHash: string }
interface AuditRec extends Omit<AuditRow, 'id'> { id?: number }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('protocols')) db.createObjectStore('protocols', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('versions')) {
        const v = db.createObjectStore('versions', { keyPath: 'id' });
        v.createIndex('byProtocol', 'protocolId', { unique: false });
      }
      if (!db.objectStoreNames.contains('signatures')) {
        const s = db.createObjectStore('signatures', { keyPath: 'id' });
        s.createIndex('byVersion', 'versionId', { unique: false });
        s.createIndex('byVersionRole', ['versionId', 'role'], { unique: true });
      }
      if (!db.objectStoreNames.contains('audit')) {
        const a = db.createObjectStore('audit', { keyPath: 'id', autoIncrement: true });
        a.createIndex('byEntity', 'entity_id', { unique: false });
      }
      // v2: user-discovered commercial kits ("My kits")
      if (!db.objectStoreNames.contains('kits')) db.createObjectStore('kits', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
const now = () => new Date().toISOString();
function bumpVersion(v: string): string {
  const m = /^(\d+)\.(\d+)$/.exec(v || '');
  return m ? `${m[1]}.${Number(m[2]) + 1}` : `${v || '1.0'}.1`;
}

export function isIndexedDbAvailable(): boolean {
  try { return typeof indexedDB !== 'undefined'; } catch { return false; }
}

export class LocalProtocolStore {
  private dbp: Promise<IDBDatabase> | null = null;
  private db(): Promise<IDBDatabase> { if (!this.dbp) this.dbp = openDb(); return this.dbp; }

  private async putAudit(tx: IDBTransaction, e: AuditEntry): Promise<void> {
    const rec: AuditRec = {
      ts: now(), actor: e.actor ?? null, action: e.action, entity_type: e.entityType, entity_id: e.entityId,
      field: e.field ?? null, old_value: e.oldValue ?? null, new_value: e.newValue ?? null, detail: e.detail ?? null,
    };
    await reqToPromise(tx.objectStore('audit').add(rec));
  }

  async logAudit(e: AuditEntry): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['audit'], 'readwrite');
    await this.putAudit(tx, e);
    await txDone(tx);
  }

  async getAuditLog(entityId?: string, limit = 200): Promise<AuditRow[]> {
    const db = await this.db();
    const tx = db.transaction(['audit'], 'readonly');
    const store = tx.objectStore('audit');
    const all = entityId ? await reqToPromise(store.index('byEntity').getAll(entityId)) : await reqToPromise(store.getAll());
    return (all as AuditRow[]).sort((a, b) => b.id - a.id).slice(0, Math.min(Math.max(1, limit), 2000));
  }

  async saveProtocol(sop: SopDocument, opts: { actor?: string; changeSummary?: string } = {}): Promise<SaveResult> {
    if (!sop || !sop.id || !sop.title) throw new Error('SOP must have an id and a title.');
    const hash = await contentHash(sop);
    const ts = now();
    const db = await this.db();
    const tx = db.transaction(['protocols', 'versions', 'audit'], 'readwrite');
    const protocols = tx.objectStore('protocols');
    const versions = tx.objectStore('versions');
    const existing = (await reqToPromise(protocols.get(sop.id))) as ProtocolRec | undefined;

    if (!existing) {
      const versionId = randomId();
      const version = sop.version || '1.0';
      await reqToPromise(protocols.put({ id: sop.id, documentId: sop.documentId || sop.id, title: sop.title, category: sop.category ?? null, currentVersionId: versionId, createdAt: ts, createdBy: opts.actor ?? null, archived: 0 } as ProtocolRec));
      await reqToPromise(versions.put({ id: versionId, protocolId: sop.id, version, sop: { ...sop, version }, contentHash: hash, createdAt: ts, createdBy: opts.actor ?? null, changeSummary: opts.changeSummary ?? 'Initial version', supersedesVersionId: null } as VersionRec));
      await this.putAudit(tx, { actor: opts.actor, action: 'PROTOCOL_CREATED', entityType: 'protocol', entityId: sop.id, newValue: version, detail: sop.title });
      await txDone(tx);
      return { protocolId: sop.id, versionId, version, created: true };
    }

    const current = existing.currentVersionId ? ((await reqToPromise(versions.get(existing.currentVersionId))) as VersionRec | undefined) : undefined;
    if (current && current.contentHash === hash) {
      await this.putAudit(tx, { actor: opts.actor, action: 'NO_OP_SAVE', entityType: 'protocol', entityId: sop.id, detail: 'Content unchanged; no new version created.' });
      await txDone(tx);
      return { protocolId: sop.id, versionId: current.id, version: current.version, created: false };
    }

    let version = sop.version || '1.0';
    if (current && version === current.version) version = bumpVersion(current.version);
    const versionId = randomId();
    await reqToPromise(versions.put({ id: versionId, protocolId: sop.id, version, sop: { ...sop, version }, contentHash: hash, createdAt: ts, createdBy: opts.actor ?? null, changeSummary: opts.changeSummary ?? null, supersedesVersionId: current?.id ?? null } as VersionRec));
    await reqToPromise(protocols.put({ ...existing, currentVersionId: versionId, title: sop.title, category: sop.category ?? null, documentId: sop.documentId || existing.documentId }));
    await this.putAudit(tx, { actor: opts.actor, action: 'PROTOCOL_VERSION_CREATED', entityType: 'protocol', entityId: sop.id, field: 'version', oldValue: current?.version ?? undefined, newValue: version, detail: opts.changeSummary });
    await txDone(tx);
    return { protocolId: sop.id, versionId, version, created: true };
  }

  async listProtocols(): Promise<ProtocolSummary[]> {
    const db = await this.db();
    const tx = db.transaction(['protocols', 'versions'], 'readonly');
    const ps = (await reqToPromise(tx.objectStore('protocols').getAll())) as ProtocolRec[];
    const out: ProtocolSummary[] = [];
    for (const p of ps) {
      if (p.archived) continue;
      const vs = (await reqToPromise(tx.objectStore('versions').index('byProtocol').getAll(p.id))) as VersionRec[];
      const cur = vs.find((v) => v.id === p.currentVersionId);
      out.push({
        id: p.id, documentId: p.documentId, title: p.title, category: p.category, currentVersion: cur?.version ?? null,
        currentVersionId: p.currentVersionId, versionCount: vs.length, createdAt: p.createdAt,
        updatedAt: vs.reduce((m, v) => (v.createdAt > m ? v.createdAt : m), p.createdAt),
      });
    }
    return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  private toLoaded(v: VersionRec): LoadedVersion {
    return { sop: v.sop, version: v.version, versionId: v.id, protocolId: v.protocolId, contentHash: v.contentHash, createdAt: v.createdAt, createdBy: v.createdBy, changeSummary: v.changeSummary, supersedesVersionId: v.supersedesVersionId };
  }

  async getProtocol(protocolId: string): Promise<LoadedVersion | null> {
    const db = await this.db();
    const tx = db.transaction(['protocols', 'versions'], 'readonly');
    const p = (await reqToPromise(tx.objectStore('protocols').get(protocolId))) as ProtocolRec | undefined;
    if (!p?.currentVersionId) return null;
    const v = (await reqToPromise(tx.objectStore('versions').get(p.currentVersionId))) as VersionRec | undefined;
    return v ? this.toLoaded(v) : null;
  }

  async getVersion(versionId: string): Promise<LoadedVersion | null> {
    const db = await this.db();
    const v = (await reqToPromise(db.transaction(['versions'], 'readonly').objectStore('versions').get(versionId))) as VersionRec | undefined;
    return v ? this.toLoaded(v) : null;
  }

  async listVersions(protocolId: string): Promise<Omit<LoadedVersion, 'sop'>[]> {
    const db = await this.db();
    const vs = (await reqToPromise(db.transaction(['versions'], 'readonly').objectStore('versions').index('byProtocol').getAll(protocolId))) as VersionRec[];
    return vs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((v) => { const { sop, ...rest } = this.toLoaded(v); void sop; return rest; });
  }

  async archiveProtocol(protocolId: string, actor?: string): Promise<boolean> {
    const db = await this.db();
    const tx = db.transaction(['protocols', 'audit'], 'readwrite');
    const p = (await reqToPromise(tx.objectStore('protocols').get(protocolId))) as ProtocolRec | undefined;
    if (!p || p.archived) return false;
    await reqToPromise(tx.objectStore('protocols').put({ ...p, archived: 1 }));
    await this.putAudit(tx, { actor, action: 'PROTOCOL_ARCHIVED', entityType: 'protocol', entityId: protocolId });
    await txDone(tx);
    return true;
  }

  async diffVersions(a: string, b: string): Promise<DiffEntry[] | null> {
    const va = await this.getVersion(a); const vb = await this.getVersion(b);
    if (!va || !vb) return null;
    return deepDiff(va.sop, vb.sop);
  }

  async addSignature(input: { versionId: string; role: SignatureRole; signerName: string; signerIdentifier?: string; meaning: string; actor?: string }): Promise<SignatureRecord> {
    if (!['PREPARED', 'REVIEWED', 'APPROVED'].includes(input.role)) throw new Error('Invalid signature role.');
    if (!input.signerName?.trim()) throw new Error('Signer name is required.');
    if (!input.meaning?.trim()) throw new Error('Signature meaning is required.');
    const db = await this.db();
    const tx = db.transaction(['versions', 'signatures', 'audit'], 'readwrite');
    const v = (await reqToPromise(tx.objectStore('versions').get(input.versionId))) as VersionRec | undefined;
    if (!v) throw new Error('Version not found.');
    const dup = await reqToPromise(tx.objectStore('signatures').index('byVersionRole').get([input.versionId, input.role]));
    if (dup) throw new Error(`A ${input.role} signature already exists on this version.`);
    const id = randomId(); const ts = now();
    await reqToPromise(tx.objectStore('signatures').add({ id, versionId: input.versionId, role: input.role, signerName: input.signerName.trim(), signerIdentifier: input.signerIdentifier ?? null, meaning: input.meaning.trim(), signedAt: ts, contentHash: v.contentHash } as SignatureRec));
    await this.putAudit(tx, { actor: input.actor ?? input.signerName, action: 'SIGNATURE_ADDED', entityType: 'version', entityId: input.versionId, field: input.role, newValue: input.signerName, detail: input.meaning });
    await txDone(tx);
    return { id, versionId: input.versionId, role: input.role, signerName: input.signerName.trim(), signerIdentifier: input.signerIdentifier ?? null, meaning: input.meaning.trim(), signedAt: ts, contentHash: v.contentHash, stillValid: true };
  }

  async verifySignatures(versionId: string): Promise<SignatureRecord[]> {
    const db = await this.db();
    const tx = db.transaction(['versions', 'signatures'], 'readonly');
    const v = (await reqToPromise(tx.objectStore('versions').get(versionId))) as VersionRec | undefined;
    if (!v) return [];
    const currentHash = await contentHash(v.sop);
    const rows = (await reqToPromise(tx.objectStore('signatures').index('byVersion').getAll(versionId))) as SignatureRec[];
    return rows.sort((a, b) => (a.signedAt < b.signedAt ? -1 : 1)).map((r) => ({ ...r, stillValid: r.contentHash === v.contentHash && v.contentHash === currentHash }));
  }

  // ------------------------------------------------------------ My kits (discovered from the web)

  async listKits(): Promise<KitIndexEntry[]> {
    const db = await this.db();
    const rows = (await reqToPromise(db.transaction(['kits'], 'readonly').objectStore('kits').getAll())) as KitIndexEntry[];
    return rows.sort((a, b) => a.productName.localeCompare(b.productName));
  }
  async putKit(kit: KitIndexEntry): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['kits', 'audit'], 'readwrite');
    await reqToPromise(tx.objectStore('kits').put({ ...kit, source: 'discovered' }));
    await this.putAudit(tx, { action: 'KIT_ADDED', entityType: 'kit', entityId: kit.id, detail: `${kit.vendorShort} ${kit.productName} (${kit.catalogNumbers.join(', ')})` });
    await txDone(tx);
  }
  async removeKit(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['kits', 'audit'], 'readwrite');
    await reqToPromise(tx.objectStore('kits').delete(id));
    await this.putAudit(tx, { action: 'KIT_REMOVED', entityType: 'kit', entityId: id });
    await txDone(tx);
  }

  // ------------------------------------------------------------ vault backup / restore / wipe

  async exportVault(): Promise<VaultFile> {
    const db = await this.db();
    const tx = db.transaction(['protocols', 'versions', 'signatures', 'audit', 'kits'], 'readonly');
    return {
      format: 'biosop-vault', formatVersion: 1, exportedAt: now(),
      kits: (await reqToPromise(tx.objectStore('kits').getAll())) as KitIndexEntry[],
      protocols: (await reqToPromise(tx.objectStore('protocols').getAll())) as ProtocolRec[],
      versions: (await reqToPromise(tx.objectStore('versions').getAll())) as VersionRec[],
      signatures: (await reqToPromise(tx.objectStore('signatures').getAll())) as SignatureRec[],
      audit: (await reqToPromise(tx.objectStore('audit').getAll())) as AuditRec[],
    };
  }

  /** Merge a vault file in. Existing records with the same id are left untouched (never overwritten). */
  async importVault(v: VaultFile): Promise<{ protocols: number; versions: number; signatures: number; audit: number }> {
    if (v?.format !== 'biosop-vault') throw new Error('Not a BioSOP vault file.');
    const db = await this.db();
    const tx = db.transaction(['protocols', 'versions', 'signatures', 'audit', 'kits'], 'readwrite');
    const counts = { protocols: 0, versions: 0, signatures: 0, audit: 0, kits: 0 };
    for (const k of v.kits || []) if (!(await reqToPromise(tx.objectStore('kits').get(k.id)))) { await reqToPromise(tx.objectStore('kits').add(k)); counts.kits++; }
    for (const p of v.protocols || []) if (!(await reqToPromise(tx.objectStore('protocols').get(p.id)))) { await reqToPromise(tx.objectStore('protocols').add(p)); counts.protocols++; }
    for (const r of v.versions || []) if (!(await reqToPromise(tx.objectStore('versions').get(r.id)))) { await reqToPromise(tx.objectStore('versions').add(r)); counts.versions++; }
    for (const s of v.signatures || []) if (!(await reqToPromise(tx.objectStore('signatures').get(s.id)))) { await reqToPromise(tx.objectStore('signatures').add(s)); counts.signatures++; }
    for (const a of v.audit || []) { const { id, ...rest } = a; void id; await reqToPromise(tx.objectStore('audit').add(rest)); counts.audit++; }
    await this.putAudit(tx, { action: 'VAULT_IMPORTED', entityType: 'vault', entityId: 'local', detail: JSON.stringify(counts) });
    await txDone(tx);
    return counts;
  }

  async wipe(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['protocols', 'versions', 'signatures', 'audit', 'kits'], 'readwrite');
    for (const s of ['protocols', 'versions', 'signatures', 'audit', 'kits']) await reqToPromise(tx.objectStore(s).clear());
    await txDone(tx);
  }

  async stats(): Promise<{ protocols: number; versions: number; signatures: number; audit: number; approxBytes: number }> {
    const v = await this.exportVault();
    return { protocols: v.protocols.length, versions: v.versions.length, signatures: v.signatures.length, audit: v.audit.length, approxBytes: JSON.stringify(v).length };
  }
}

export interface VaultFile {
  format: 'biosop-vault'; formatVersion: 1; exportedAt: string;
  protocols: ProtocolRec[]; versions: VersionRec[]; signatures: SignatureRec[]; audit: AuditRec[]; kits?: KitIndexEntry[];
}

// ---------------------------------------------------------------- optional passphrase encryption (AES-GCM, PBKDF2)

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 310_000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function b64(u8: Uint8Array): string { let s = ''; u8.forEach((b) => (s += String.fromCharCode(b))); return btoa(s); }
function unb64(s: string): Uint8Array { const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }

export interface EncryptedVaultFile { format: 'biosop-vault-encrypted'; formatVersion: 1; kdf: 'PBKDF2-SHA256'; iterations: number; salt: string; iv: string; ciphertext: string }

export async function encryptVault(vault: VaultFile, passphrase: string): Promise<EncryptedVaultFile> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(JSON.stringify(vault)));
  return { format: 'biosop-vault-encrypted', formatVersion: 1, kdf: 'PBKDF2-SHA256', iterations: 310_000, salt: b64(salt), iv: b64(iv), ciphertext: b64(new Uint8Array(ct)) };
}

export async function decryptVault(file: EncryptedVaultFile, passphrase: string): Promise<VaultFile> {
  const key = await deriveKey(passphrase, unb64(file.salt));
  let pt: ArrayBuffer;
  try { pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(file.iv) as BufferSource }, key, unb64(file.ciphertext) as BufferSource); }
  catch { throw new Error('Wrong passphrase or corrupted file.'); }
  return JSON.parse(dec.decode(pt)) as VaultFile;
}

export const localStore = new LocalProtocolStore();
