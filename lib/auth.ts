import 'server-only';
import { all, id, now, one, run, tx } from './db.ts';
import { hashPassword, sha256, token, verifyPassword } from './crypto.ts';

export const SESSION_COOKIE = 'tc_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type User = {
  id: string;
  email: string;
  display_name: string;
  created_at: number;
};

export type Settings = {
  user_id: string;
  language: string;
  text_scale: string;
  reduce_motion: number;
  theme: string;
  retention_days: number;
  notify_reviews: number;
  notify_invitations: number;
  notify_security: number;
  onboarding_step: number;
  onboarding_done_at: number | null;
};

export type Entitlement = {
  user_id: string;
  plan: string;
  source: string;
  max_members: number;
  max_reviewers: number;
  history_limit: number;
};

/** Fixed-window rate limit, persisted so it survives a dev reload. */
export function rateLimit(bucket: string, limit: number, windowMs: number): boolean {
  const t = now();
  return tx(() => {
    const row = one<{ count: number; window_start: number }>(
      'SELECT count, window_start FROM rate_limit WHERE bucket = ?',
      bucket,
    );
    if (!row || t - row.window_start > windowMs) {
      run(
        'INSERT INTO rate_limit (bucket, count, window_start) VALUES (?, 1, ?) ' +
          'ON CONFLICT(bucket) DO UPDATE SET count = 1, window_start = excluded.window_start',
        bucket,
        t,
      );
      return true;
    }
    if (row.count >= limit) return false;
    run('UPDATE rate_limit SET count = count + 1 WHERE bucket = ?', bucket);
    return true;
  });
}

export function audit(
  actorUserId: string | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  detail?: string,
): void {
  run(
    'INSERT INTO audit_event (id, actor_user_id, action, resource_type, resource_id, detail, created_at) VALUES (?,?,?,?,?,?,?)',
    id(),
    actorUserId,
    action,
    resourceType ?? null,
    resourceId ?? null,
    detail ?? null,
    now(),
  );
}

export type RegisterResult =
  | { ok: true; userId: string; recoveryCode: string }
  | { ok: false; error: string };

export function registerUser(input: {
  email: string;
  displayName: string;
  password: string;
}): RegisterResult {
  const email = input.email.trim();
  const lower = email.toLowerCase();
  if (one('SELECT id FROM user WHERE email_lower = ?', lower)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const { hash, algo } = hashPassword(input.password);
  // A single-use recovery code, shown once. There is no email provider, so this is
  // the only account-recovery route that exists — see LIMITATIONS.md.
  const recoveryCode = `${token(5)}-${token(5)}`.toUpperCase().replace(/_/g, '0');
  const userId = id();
  const t = now();

  tx(() => {
    run(
      'INSERT INTO user (id, email, email_lower, display_name, password_hash, password_algo, recovery_hash, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      userId, email, lower, input.displayName.trim(), hash, algo, sha256(recoveryCode), t, t,
    );
    run('INSERT INTO user_settings (user_id, updated_at) VALUES (?, ?)', userId, t);
    run('INSERT INTO subscription_entitlement (user_id, updated_at) VALUES (?, ?)', userId, t);
    audit(userId, 'account.registered');
  });

  return { ok: true, userId, recoveryCode };
}

export function verifyCredentials(email: string, password: string): string | null {
  const row = one<{ id: string; password_hash: string; deleted_at: number | null }>(
    'SELECT id, password_hash, deleted_at FROM user WHERE email_lower = ?',
    email.trim().toLowerCase(),
  );
  if (!row || row.deleted_at) {
    // Spend comparable time so a missing account is not distinguishable by timing.
    verifyPassword(password, 'scrypt$131072$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    return null;
  }
  return verifyPassword(password, row.password_hash) ? row.id : null;
}

export function getSettings(userId: string): Settings {
  const row = one<Settings>('SELECT * FROM user_settings WHERE user_id = ?', userId);
  if (row) return row;
  run('INSERT INTO user_settings (user_id, updated_at) VALUES (?, ?)', userId, now());
  return one<Settings>('SELECT * FROM user_settings WHERE user_id = ?', userId)!;
}

export function getEntitlement(userId: string): Entitlement {
  const row = one<Entitlement>('SELECT * FROM subscription_entitlement WHERE user_id = ?', userId);
  if (row) return row;
  run('INSERT INTO subscription_entitlement (user_id, updated_at) VALUES (?, ?)', userId, now());
  return one<Entitlement>('SELECT * FROM subscription_entitlement WHERE user_id = ?', userId)!;
}

export function changePassword(userId: string, current: string, next: string): { ok: boolean; error?: string } {
  const row = one<{ password_hash: string }>('SELECT password_hash FROM user WHERE id = ?', userId);
  if (!row || !verifyPassword(current, row.password_hash)) {
    return { ok: false, error: 'Current password is incorrect.' };
  }
  const { hash, algo } = hashPassword(next);
  tx(() => {
    run('UPDATE user SET password_hash = ?, password_algo = ?, updated_at = ? WHERE id = ?', hash, algo, now(), userId);
    audit(userId, 'account.password_changed');
  });
  return { ok: true };
}

export type SessionRow = {
  id: string;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
  user_agent: string | null;
};

export function listSessions(userId: string): SessionRow[] {
  return all<SessionRow>(
    'SELECT id, created_at, last_seen_at, expires_at, user_agent FROM session ' +
      'WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY last_seen_at DESC',
    userId,
    now(),
  );
}

export function revokeSession(userId: string, sessionId: string): void {
  // Ownership is part of the WHERE clause: a session id alone is not authority.
  run('UPDATE session SET revoked_at = ? WHERE id = ? AND user_id = ?', now(), sessionId, userId);
  audit(userId, 'session.revoked', 'session', sessionId);
}

export function revokeOtherSessions(userId: string, keepSessionId: string): void {
  run(
    'UPDATE session SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL',
    now(), userId, keepSessionId,
  );
  audit(userId, 'session.revoked_others');
}

export function deleteAccount(userId: string): void {
  tx(() => {
    // Deleting the last admin of a circle would leave the remaining members unable to
    // manage it, so the longest-standing remaining member is promoted first.
    const orphaned = all<{ circle_id: string }>(
      `SELECT m.circle_id FROM family_membership m
        WHERE m.user_id = ? AND m.left_at IS NULL AND m.role = 'admin'
          AND NOT EXISTS (
            SELECT 1 FROM family_membership o
             WHERE o.circle_id = m.circle_id AND o.user_id != m.user_id
               AND o.left_at IS NULL AND o.role = 'admin')`,
      userId,
    );
    for (const { circle_id } of orphaned) {
      const heir = one<{ user_id: string }>(
        `SELECT user_id FROM family_membership
          WHERE circle_id = ? AND user_id != ? AND left_at IS NULL
          ORDER BY joined_at LIMIT 1`,
        circle_id,
        userId,
      );
      if (heir) {
        run(
          "UPDATE family_membership SET role = 'admin' WHERE circle_id = ? AND user_id = ?",
          circle_id,
          heir.user_id,
        );
      }
    }
    audit(null, 'account.deleted', 'user', userId, 'user-initiated');
    run('DELETE FROM user WHERE id = ?', userId);
  });
}
