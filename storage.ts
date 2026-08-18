/**
 * Where protocols live. Default: this browser only (IndexedDB). "server" is an
 * opt-in for teams that deploy with a database and want shared storage.
 *
 * The preference itself is a tiny non-sensitive flag kept in localStorage.
 */
import type { SopDocument } from '../types';
import { localStore } from './localStore';
import * as remote from './api';

export type StorageMode = 'browser' | 'server';
const KEY = 'biosop.storageMode';

export function getStorageMode(): StorageMode {
  try { return (localStorage.getItem(KEY) as StorageMode) || 'browser'; } catch { return 'browser'; }
}
export function setStorageMode(m: StorageMode): void {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
}

/** One facade; every persistence call in the UI goes through here. */
export const protocolStorage = {
  mode: getStorageMode,

  async save(sop: SopDocument, changeSummary?: string, actor?: string) {
    return getStorageMode() === 'server' ? remote.saveProtocol(sop, changeSummary, actor) : localStore.saveProtocol(sop, { changeSummary, actor });
  },
  async list() {
    return getStorageMode() === 'server' ? remote.listProtocols() : localStore.listProtocols();
  },
  async load(id: string) {
    if (getStorageMode() === 'server') return remote.loadProtocol(id);
    const v = await localStore.getProtocol(id);
    if (!v) throw new Error('Protocol not found.');
    return { sop: v.sop, version: v.version, versionId: v.versionId };
  },
  async listVersions(protocolId: string) {
    return getStorageMode() === 'server' ? remote.listVersions(protocolId) : localStore.listVersions(protocolId);
  },
  async diffVersions(a: string, b: string) {
    if (getStorageMode() === 'server') return remote.diffVersions(a, b);
    return (await localStore.diffVersions(a, b)) ?? [];
  },
  async sign(versionId: string, input: { role: 'PREPARED' | 'REVIEWED' | 'APPROVED'; signerName: string; signerIdentifier?: string; meaning: string }) {
    return getStorageMode() === 'server' ? remote.signVersion(versionId, input) : localStore.addSignature({ versionId, ...input });
  },
  async signatures(versionId: string) {
    return getStorageMode() === 'server' ? remote.getSignatures(versionId) : localStore.verifySignatures(versionId);
  },
  async audit(entityId?: string) {
    return getStorageMode() === 'server' ? remote.getAuditLog(entityId) : localStore.getAuditLog(entityId);
  },
};
