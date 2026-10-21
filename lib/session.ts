import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { now, one, run } from './db.ts';
import { sha256, token } from './crypto.ts';
import { audit, SESSION_COOKIE, SESSION_TTL_MS, type User } from './auth.ts';

/**
 * Request-scoped session handling.
 *
 * Split from `lib/auth.ts` so the service layer stays importable outside a request —
 * by the test suite and by the CLI scripts — without dragging in `next/headers`.
 */

export async function startSession(userId: string, userAgent?: string): Promise<void> {
  const raw = token(32);
  const t = now();
  run(
    'INSERT INTO session (id, user_id, created_at, last_seen_at, expires_at, user_agent) VALUES (?,?,?,?,?,?)',
    sha256(raw), userId, t, t, t + SESSION_TTL_MS, userAgent?.slice(0, 200) ?? null,
  );
  audit(userId, 'session.started');
  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}


export async function endSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    run('UPDATE session SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', now(), sha256(raw));
  }
  jar.delete(SESSION_COOKIE);
}

/** Resolves the session cookie to a user. Cached per request. */

export const currentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const sid = sha256(raw);
  const row = one<User & { session_id: string; last_seen_at: number }>(
    `SELECT u.id, u.email, u.display_name, u.created_at, s.id AS session_id, s.last_seen_at
       FROM session s JOIN user u ON u.id = s.user_id
      WHERE s.id = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.deleted_at IS NULL`,
    sid,
    now(),
  );
  if (!row) return null;
  // Rolling last_seen, written at most once a minute to avoid a write per request.
  if (now() - row.last_seen_at > 60_000) {
    run('UPDATE session SET last_seen_at = ? WHERE id = ?', now(), sid);
  }
  return { id: row.id, email: row.email, display_name: row.display_name, created_at: row.created_at };
});


export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}


export async function currentSessionId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  return raw ? sha256(raw) : null;
}

/** Hard delete. Every child row is removed by ON DELETE CASCADE. */
