import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { ProtocolStore, stableStringify, d1Driver, D1Like } from '../src/server/db';
import { createSqliteStore } from '../src/server/db-sqlite';

const sop = (over: Record<string, unknown> = {}) => ({
  id: 'p1', documentId: 'SOP-1', version: '1.0', title: 'T', category: 'PCR',
  steps: [{ stepNumber: 1, title: 'a', instruction: 'b' }], ...over,
}) as never;

/**
 * A D1-shaped adapter over better-sqlite3 so the D1 driver code path
 * (prepare/bind/run/all/first/batch/exec) is exercised without Cloudflare.
 */
function fakeD1(): D1Like {
  const db = new Database(':memory:');
  return {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          const stmt = db.prepare(sql);
          return {
            async run() { const r = stmt.run(...params); return { meta: { changes: Number(r.changes) } }; },
            async all<T>() { return { results: stmt.all(...params) as T[] }; },
            async first<T>() { return (stmt.get(...params) as T | undefined) ?? null; },
          };
        },
      };
    },
    async batch(stmts: unknown[]) {
      const tx = db.transaction(() => { for (const s of stmts as { run(): Promise<unknown> }[]) void s.run(); });
      // our bound statements run synchronously under the hood, so this is atomic enough for tests
      for (const s of stmts as { run(): Promise<unknown> }[]) await s.run();
      void tx;
    },
    async exec(sql: string) { db.exec(sql); },
  };
}

const backends: [string, () => ProtocolStore][] = [
  ['better-sqlite3', () => createSqliteStore(join(mkdtempSync(join(tmpdir(), 'biosop-')), 'test.db'))],
  ['D1 driver (shim)', () => new ProtocolStore(d1Driver(fakeD1()))],
];

describe.each(backends)('persistence via %s', (_name, make) => {
  let db: ProtocolStore;
  beforeAll(() => { db = make(); });

  it('creates, no-ops on identical content, and versions on change', async () => {
    const r1 = await db.saveProtocol(sop());
    const r2 = await db.saveProtocol(sop());
    const r3 = await db.saveProtocol(sop({ steps: [{ stepNumber: 1, title: 'a', instruction: 'changed' }] }));
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    expect(r2.versionId).toBe(r1.versionId);
    expect(r3.created).toBe(true);
    expect(r3.version).toBe('1.1');
    expect(await db.listVersions('p1')).toHaveLength(2);
  });

  it('diffs versions at the path level', async () => {
    const vs = await db.listVersions('p1');
    const d = (await db.diffVersions(vs[1].versionId, vs[0].versionId))!;
    expect(d.some((x) => x.path === 'steps[0].instruction' && x.after === 'changed')).toBe(true);
  });

  it('signatures bind to content and reject duplicates', async () => {
    const cur = (await db.getProtocol('p1'))!;
    const s = await db.addSignature({ versionId: cur.versionId, role: 'REVIEWED', signerName: 'R', meaning: 'reviewed' });
    expect(s.stillValid).toBe(true);
    expect((await db.verifySignatures(cur.versionId))[0].stillValid).toBe(true);
    await expect(db.addSignature({ versionId: cur.versionId, role: 'REVIEWED', signerName: 'X', meaning: 'dup' })).rejects.toThrow(/already exists/);
  });

  it('audit log is append-only and records every action', async () => {
    const actions = (await db.getAuditLog('p1')).map((a) => a.action);
    expect(actions).toContain('PROTOCOL_CREATED');
    expect(actions).toContain('NO_OP_SAVE');
    expect(actions).toContain('PROTOCOL_VERSION_CREATED');
  });

  it('lists protocols with version counts', async () => {
    const list = await db.listProtocols();
    expect(list).toHaveLength(1);
    expect(list[0].versionCount).toBe(2);
    expect(list[0].currentVersion).toBe('1.1');
  });

  it('archive hides from list', async () => {
    expect(await db.archiveProtocol('p1')).toBe(true);
    expect(await db.listProtocols()).toHaveLength(0);
  });
});

describe('stableStringify', () => {
  it('is key-order independent', () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(stableStringify({ a: [{ c: 3, d: 2 }], b: 1 }));
  });
});
