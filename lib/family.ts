import 'server-only';
import { all, id, now, one, run, tx } from './db.ts';
import { sha256, token } from './crypto.ts';
import { audit, getEntitlement } from './auth.ts';
import { notify } from './notifications.ts';
import { requireCircleAdmin, requireCircleMember, revokeGrantsWithoutSharedCircle } from './authz.ts';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Circle = { id: string; name: string; created_by: string; created_at: number; role: 'admin' | 'member'; member_count: number };
export type Member = { user_id: string; display_name: string; email: string; role: 'admin' | 'member'; joined_at: number };
export type Invitation = {
  id: string; label: string | null; created_at: number; expires_at: number;
  accepted_at: number | null; revoked_at: number | null; accepted_by_name: string | null;
};

export function createCircle(userId: string, name: string): string {
  const circleId = id();
  const t = now();
  tx(() => {
    run('INSERT INTO family_circle (id, name, created_by, created_at) VALUES (?,?,?,?)', circleId, name.trim(), userId, t);
    run(
      'INSERT INTO family_membership (id, circle_id, user_id, role, joined_at) VALUES (?,?,?,?,?)',
      id(), circleId, userId, 'admin', t,
    );
    audit(userId, 'circle.created', 'family_circle', circleId);
  });
  return circleId;
}

export function listCircles(userId: string): Circle[] {
  return all<Circle>(
    `SELECT c.id, c.name, c.created_by, c.created_at, m.role,
            (SELECT COUNT(*) FROM family_membership mm WHERE mm.circle_id = c.id AND mm.left_at IS NULL) AS member_count
       FROM family_circle c
       JOIN family_membership m ON m.circle_id = c.id AND m.user_id = ? AND m.left_at IS NULL
      ORDER BY c.created_at`,
    userId,
  );
}

export function getCircle(userId: string, circleId: string): Circle | null {
  requireCircleMember(userId, circleId);
  return (
    one<Circle>(
      `SELECT c.id, c.name, c.created_by, c.created_at, m.role,
              (SELECT COUNT(*) FROM family_membership mm WHERE mm.circle_id = c.id AND mm.left_at IS NULL) AS member_count
         FROM family_circle c
         JOIN family_membership m ON m.circle_id = c.id AND m.user_id = ? AND m.left_at IS NULL
        WHERE c.id = ?`,
      userId, circleId,
    ) ?? null
  );
}

export function listMembers(userId: string, circleId: string): Member[] {
  requireCircleMember(userId, circleId);
  return all<Member>(
    `SELECT m.user_id, u.display_name, u.email, m.role, m.joined_at
       FROM family_membership m JOIN user u ON u.id = m.user_id
      WHERE m.circle_id = ? AND m.left_at IS NULL ORDER BY m.joined_at`,
    circleId,
  );
}

/**
 * Creates an invitation and returns the raw token ONCE. Only its SHA-256 is stored,
 * so a stolen database cannot be used to join a circle.
 */
export function createInvitation(userId: string, circleId: string, label?: string): { inviteId: string; token: string } {
  requireCircleAdmin(userId, circleId);
  const seats = getEntitlement(userId).max_members;
  const current = one<{ n: number }>(
    'SELECT COUNT(*) AS n FROM family_membership WHERE circle_id = ? AND left_at IS NULL',
    circleId,
  )?.n ?? 0;
  const pending = one<{ n: number }>(
    'SELECT COUNT(*) AS n FROM family_invitation WHERE circle_id = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?',
    circleId, now(),
  )?.n ?? 0;
  if (current + pending >= seats) {
    throw new Error(`plan_limit:This circle is limited to ${seats} members on your current plan.`);
  }

  const raw = token(32);
  const inviteId = id();
  const t = now();
  tx(() => {
    run(
      'INSERT INTO family_invitation (id, circle_id, token_hash, label, created_by, created_at, expires_at) VALUES (?,?,?,?,?,?,?)',
      inviteId, circleId, sha256(raw), label?.trim() || null, userId, t, t + INVITE_TTL_MS,
    );
    audit(userId, 'invitation.created', 'family_invitation', inviteId);
  });
  return { inviteId, token: raw };
}

export function listInvitations(userId: string, circleId: string): Invitation[] {
  requireCircleAdmin(userId, circleId);
  return all<Invitation>(
    `SELECT i.id, i.label, i.created_at, i.expires_at, i.accepted_at, i.revoked_at, u.display_name AS accepted_by_name
       FROM family_invitation i LEFT JOIN user u ON u.id = i.accepted_by
      WHERE i.circle_id = ? ORDER BY i.created_at DESC`,
    circleId,
  );
}

export function revokeInvitation(userId: string, circleId: string, inviteId: string): void {
  requireCircleAdmin(userId, circleId);
  run(
    'UPDATE family_invitation SET revoked_at = ? WHERE id = ? AND circle_id = ? AND accepted_at IS NULL',
    now(), inviteId, circleId,
  );
  audit(userId, 'invitation.revoked', 'family_invitation', inviteId);
}

export type InvitePreview =
  | { ok: false; reason: 'not_found' | 'expired' | 'revoked' | 'used' }
  | { ok: true; circleId: string; circleName: string; invitedBy: string; alreadyMember: boolean };

/** Server-side validation of an invitation token. Never trusts anything in the URL beyond the token. */
export function previewInvitation(rawToken: string, viewerUserId: string | null): InvitePreview {
  const row = one<{
    id: string; circle_id: string; expires_at: number; accepted_at: number | null; revoked_at: number | null;
    circle_name: string; inviter: string;
  }>(
    `SELECT i.id, i.circle_id, i.expires_at, i.accepted_at, i.revoked_at,
            c.name AS circle_name, u.display_name AS inviter
       FROM family_invitation i JOIN family_circle c ON c.id = i.circle_id JOIN user u ON u.id = i.created_by
      WHERE i.token_hash = ?`,
    sha256(rawToken),
  );
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.revoked_at) return { ok: false, reason: 'revoked' };
  if (row.accepted_at) return { ok: false, reason: 'used' };
  if (row.expires_at < now()) return { ok: false, reason: 'expired' };
  const alreadyMember = viewerUserId
    ? Boolean(one('SELECT id FROM family_membership WHERE circle_id = ? AND user_id = ? AND left_at IS NULL', row.circle_id, viewerUserId))
    : false;
  return { ok: true, circleId: row.circle_id, circleName: row.circle_name, invitedBy: row.inviter, alreadyMember };
}

export type AcceptResult = { ok: true; circleId: string } | { ok: false; error: string };

export function acceptInvitation(userId: string, rawToken: string): AcceptResult {
  return tx(() => {
    const row = one<{ id: string; circle_id: string; expires_at: number; accepted_at: number | null; revoked_at: number | null; created_by: string }>(
      'SELECT id, circle_id, expires_at, accepted_at, revoked_at, created_by FROM family_invitation WHERE token_hash = ?',
      sha256(rawToken),
    );
    if (!row) return { ok: false, error: 'This invitation link is not valid.' };
    if (row.revoked_at) return { ok: false, error: 'This invitation was cancelled by the person who sent it.' };
    if (row.accepted_at) return { ok: false, error: 'This invitation has already been used.' };
    if (row.expires_at < now()) return { ok: false, error: 'This invitation has expired. Ask for a new link.' };

    const existing = one('SELECT id FROM family_membership WHERE circle_id = ? AND user_id = ?', row.circle_id, userId);
    const t = now();
    if (existing) {
      run('UPDATE family_membership SET left_at = NULL, joined_at = ? WHERE circle_id = ? AND user_id = ?', t, row.circle_id, userId);
    } else {
      run('INSERT INTO family_membership (id, circle_id, user_id, role, joined_at) VALUES (?,?,?,?,?)', id(), row.circle_id, userId, 'member', t);
    }
    run('UPDATE family_invitation SET accepted_at = ?, accepted_by = ? WHERE id = ?', t, userId, row.id);
    audit(userId, 'invitation.accepted', 'family_circle', row.circle_id);
    notify({
      userId: row.created_by,
      kind: 'invitation_accepted',
      title: 'Someone joined your circle',
      body: 'An invitation you created has been accepted.',
      href: `/family/${row.circle_id}`,
      dedupeKey: `invite_accepted:${row.id}`,
    });
    return { ok: true, circleId: row.circle_id };
  });
}

export function removeMember(actorId: string, circleId: string, targetUserId: string): void {
  requireCircleAdmin(actorId, circleId);
  if (actorId === targetUserId) throw new Error('Use "leave circle" to remove yourself.');
  tx(() => {
    run('UPDATE family_membership SET left_at = ? WHERE circle_id = ? AND user_id = ? AND left_at IS NULL', now(), circleId, targetUserId);
    // Removing someone also ends every share they held in this circle's reviews.
    run(
      `UPDATE access_grant SET revoked_at = ?
        WHERE grantee_user_id = ? AND revoked_at IS NULL
          AND review_request_id IN (SELECT id FROM review_request WHERE circle_id = ?)`,
      now(), targetUserId, circleId,
    );
    run(
      `UPDATE review_participant SET removed_at = ?
        WHERE user_id = ? AND removed_at IS NULL
          AND review_request_id IN (SELECT id FROM review_request WHERE circle_id = ?)`,
      now(), targetUserId, circleId,
    );
    revokeGrantsWithoutSharedCircle(targetUserId);
    audit(actorId, 'circle.member_removed', 'family_circle', circleId, targetUserId);
    notify({
      userId: targetUserId,
      kind: 'access_revoked',
      title: 'You were removed from a circle',
      body: 'Any cases that were shared with you through that circle are no longer accessible.',
      href: '/family',
    });
  });
}

export function leaveCircle(userId: string, circleId: string): void {
  const role = requireCircleMember(userId, circleId);
  const admins = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM family_membership WHERE circle_id = ? AND role = 'admin' AND left_at IS NULL",
    circleId,
  )?.n ?? 0;
  const members = one<{ n: number }>(
    'SELECT COUNT(*) AS n FROM family_membership WHERE circle_id = ? AND left_at IS NULL',
    circleId,
  )?.n ?? 0;
  if (role === 'admin' && admins === 1 && members > 1) {
    throw new Error('You are the only admin. Make someone else an admin first, or remove the other members.');
  }
  tx(() => {
    run('UPDATE family_membership SET left_at = ? WHERE circle_id = ? AND user_id = ?', now(), circleId, userId);
    run(
      `UPDATE access_grant SET revoked_at = ?
        WHERE grantee_user_id = ? AND revoked_at IS NULL
          AND review_request_id IN (SELECT id FROM review_request WHERE circle_id = ?)`,
      now(), userId, circleId,
    );
    revokeGrantsWithoutSharedCircle(userId);
    audit(userId, 'circle.left', 'family_circle', circleId);
  });
}

export function promoteMember(actorId: string, circleId: string, targetUserId: string): void {
  requireCircleAdmin(actorId, circleId);
  run("UPDATE family_membership SET role = 'admin' WHERE circle_id = ? AND user_id = ? AND left_at IS NULL", circleId, targetUserId);
  audit(actorId, 'circle.member_promoted', 'family_circle', circleId, targetUserId);
}

/** Everyone the user could ask for a second opinion: fellow members of their circles. */
export function possibleReviewers(userId: string): Array<{ user_id: string; display_name: string; email: string; circle_id: string; circle_name: string }> {
  return all(
    `SELECT DISTINCT m2.user_id, u.display_name, u.email, c.id AS circle_id, c.name AS circle_name
       FROM family_membership m1
       JOIN family_membership m2 ON m2.circle_id = m1.circle_id AND m2.user_id != m1.user_id AND m2.left_at IS NULL
       JOIN family_circle c ON c.id = m1.circle_id
       JOIN user u ON u.id = m2.user_id
      WHERE m1.user_id = ? AND m1.left_at IS NULL AND u.deleted_at IS NULL
      ORDER BY u.display_name`,
    userId,
  );
}
