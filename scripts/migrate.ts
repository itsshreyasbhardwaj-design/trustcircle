/** Applies any pending migrations to the configured database and reports what ran. */
import { getDb } from '../lib/db.ts';
import { migrations } from '../lib/migrations.ts';

const db = getDb(); // connecting runs migrate() for us
const applied = db.prepare('SELECT id, applied_at FROM _migration ORDER BY applied_at').all() as Array<{
  id: string;
  applied_at: number;
}>;

console.log(`Database: ${process.env.TRUSTCIRCLE_DB ?? 'data/trustcircle.db'}`);
console.log(`Migrations defined: ${migrations.length}`);
for (const row of applied) {
  console.log(`  applied  ${row.id}  (${new Date(row.applied_at).toISOString()})`);
}
const pending = migrations.filter((m) => !applied.some((a) => a.id === m.id));
console.log(pending.length === 0 ? 'Up to date.' : `PENDING: ${pending.map((m) => m.id).join(', ')}`);
