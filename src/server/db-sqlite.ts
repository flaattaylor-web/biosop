/**
 * Node backend: better-sqlite3 file database. Only imported by the Node server
 * (never by the Worker bundle).
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ProtocolStore, SqlDriver } from './db';

export function sqliteDriver(path: string): SqlDriver {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return {
    async run(sql, params = []) {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes) };
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    async batch(stmts) {
      const tx = db.transaction(() => { for (const s of stmts) db.prepare(s.sql).run(...(s.params ?? [])); });
      tx();
    },
    async exec(sql) {
      db.exec(sql);
    },
  };
}

export function createSqliteStore(path: string): ProtocolStore {
  return new ProtocolStore(sqliteDriver(path));
}
