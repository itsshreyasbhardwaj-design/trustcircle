import 'server-only';
import { all, id, now, one, run } from './db.ts';

/**
 * In-app notification centre.
 *
 * `notify()` is the single delivery abstraction. Today it has exactly one channel:
 * a row in the database, read in the app. Push and email are not configured and are
 * not pretended — `channels()` reports what is actually wired up, and the UI shows it.
 */
export type NotificationKind =
  | 'invitation_received'
  | 'invitation_accepted'
  | 'review_requested'
  | 'review_comment'
  | 'review_state'
  | 'review_resolved'
  | 'access_revoked'
  | 'follow_up_due'
  | 'security_event';

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  created_at: number;
  read_at: number | null;
};

const PREF_COLUMN: Partial<Record<NotificationKind, 'notify_reviews' | 'notify_invitations' | 'notify_security'>> = {
  invitation_received: 'notify_invitations',
  invitation_accepted: 'notify_invitations',
  review_requested: 'notify_reviews',
  review_comment: 'notify_reviews',
  review_state: 'notify_reviews',
  review_resolved: 'notify_reviews',
  follow_up_due: 'notify_reviews',
  security_event: 'notify_security',
};

export function notify(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  /** Supplying this makes delivery idempotent — the unique index drops duplicates. */
  dedupeKey?: string;
}): void {
  const column = PREF_COLUMN[input.kind];
  if (column) {
    const pref = one<Record<string, number>>(`SELECT ${column} AS enabled FROM user_settings WHERE user_id = ?`, input.userId);
    // Security events are always delivered; everything else honours the preference.
    if (pref && pref.enabled === 0 && input.kind !== 'security_event') return;
  }
  try {
    run(
      'INSERT INTO notification (id, user_id, kind, title, body, href, dedupe_key, created_at) VALUES (?,?,?,?,?,?,?,?)',
      id(), input.userId, input.kind, input.title, input.body, input.href ?? null, input.dedupeKey ?? null, now(),
    );
  } catch (err) {
    // A duplicate dedupe_key is the expected, intended failure here.
    if (!(err instanceof Error) || !/UNIQUE/i.test(err.message)) throw err;
  }
}

export function listNotifications(userId: string, limit = 50): NotificationRow[] {
  return all<NotificationRow>(
    'SELECT id, kind, title, body, href, created_at, read_at FROM notification ' +
      'WHERE user_id = ? AND dismissed_at IS NULL ORDER BY created_at DESC LIMIT ?',
    userId, limit,
  );
}

export function unreadCount(userId: string): number {
  return (
    one<{ n: number }>(
      'SELECT COUNT(*) AS n FROM notification WHERE user_id = ? AND read_at IS NULL AND dismissed_at IS NULL',
      userId,
    )?.n ?? 0
  );
}

export function markRead(userId: string, notificationId: string): void {
  run('UPDATE notification SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL', now(), notificationId, userId);
}

export function markAllRead(userId: string): void {
  run('UPDATE notification SET read_at = ? WHERE user_id = ? AND read_at IS NULL', now(), userId);
}

export function dismiss(userId: string, notificationId: string): void {
  run('UPDATE notification SET dismissed_at = ? WHERE id = ? AND user_id = ?', now(), notificationId, userId);
}

/** What delivery actually exists right now. Rendered verbatim in the UI. */
export function channels(): Array<{ name: string; status: 'active' | 'not_configured'; note: string }> {
  return [
    { name: 'In-app notification centre', status: 'active', note: 'Delivered immediately and visible the next time the page loads.' },
    { name: 'Email', status: 'not_configured', note: 'No email provider is configured, so TrustCircle sends no email at all. Invitations are shared by copying a link.' },
    { name: 'Push / SMS', status: 'not_configured', note: 'Not configured. Nothing is sent to your phone outside the app.' },
  ];
}
