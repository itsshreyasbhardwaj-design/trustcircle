import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { migrations } from './migrations.ts';
import { lessons } from './data/lessons.ts';

export type Row = Record<string, unknown>;

const DEFAULT_PATH = resolve(process.cwd(), 'data/trustcircle.db');

function connect(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  migrate(db);
  return db;
}

/** Idempotent: applies any migration whose id is not yet recorded. */
export function migrate(db: DatabaseSync): string[] {
  db.exec('CREATE TABLE IF NOT EXISTS _migration (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const applied = new Set(
    (db.prepare('SELECT id FROM _migration').all() as { id: string }[]).map((r) => r.id),
  );
  const run: string[] = [];
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      db.prepare('INSERT INTO _migration (id, applied_at) VALUES (?, ?)').run(m.id, Date.now());
      db.exec('COMMIT');
      run.push(m.id);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  syncLessons(db);
  return run;
}

/** Lesson text lives in code; this keeps the FK target table in step with it. */
function syncLessons(db: DatabaseSync): void {
  const up = db.prepare(
    'INSERT INTO academy_lesson (slug, title, position) VALUES (?, ?, ?) ' +
      'ON CONFLICT(slug) DO UPDATE SET title = excluded.title, position = excluded.position',
  );
  lessons.forEach((l, i) => up.run(l.slug, l.title.en, i));
}

declare global {
  var __trustcircle_db: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__trustcircle_db) {
    globalThis.__trustcircle_db = connect(process.env.TRUSTCIRCLE_DB ?? DEFAULT_PATH);
  }
  return globalThis.__trustcircle_db;
}

/** Test/script helper: a throwaway in-memory database with the schema applied. */
export function createTestDb(): DatabaseSync {
  return connect(':memory:');
}

export function setDb(db: DatabaseSync): void {
  globalThis.__trustcircle_db = db;
}

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

export function one<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return getDb().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, ...params: unknown[]): void {
  getDb().prepare(sql).run(...(params as never[]));
}

/** Wraps `fn` in a transaction. Nested calls reuse the outer transaction. */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  if (db.isTransaction) return fn();
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export const id = (): string => crypto.randomUUID();
export const now = (): number => Date.now();
