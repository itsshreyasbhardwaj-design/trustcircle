/** Generates .env.local with a local encryption secret. Never commits, never leaves the machine. */
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = '.env.local';
const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
if (/^TRUSTCIRCLE_SECRET=/m.test(existing)) {
  console.log('[setup-secret] TRUSTCIRCLE_SECRET already present in .env.local — left untouched.');
  process.exit(0);
}
appendFileSync(file, `${existing && !existing.endsWith('\n') ? '\n' : ''}TRUSTCIRCLE_SECRET=${randomBytes(48).toString('base64url')}\n`);
console.log('[setup-secret] wrote a new TRUSTCIRCLE_SECRET to .env.local');
console.log('[setup-secret] losing this value makes already-saved message content unreadable.');
