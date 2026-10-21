import 'server-only';
import { all, id, now, one, run } from './db.ts';

/**
 * Every private read and write in the app goes through a function in this file.
 * The rule is uniform: ownership or an explicit, unrevoked grant, checked in SQL,
 * on the server. Nothing is authorised by a hidden element, a client-side check,
 * or by belonging to the same family circle.
 */

export type Scope = 'findings' | 'findings_and_content';

export type ScanAccess =
  | { allowed: false }
  | { allowed: true; via: 'owner'; scope: 'findings_and_content' }
  | { allowed: true; via: 'grant'; scope: Scope; reviewRequestId: string | null };

/** Can `userId` see scan `scanId`, and how much of it? */
export function scanAccess(userId: string, scanId: string): ScanAccess {
  const owned = one<{ id: string }>(
    'SELECT id FROM scan_case WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL',
    scanId,
    userId,
  );
  if (owned) return { allowed: true, via: 'owner', scope: 'findings_and_content' };

  const grant = one<{ scope: Scope; review_request_id: string | null }>(
    `SELECT g.scope, g.review_request_id
       FROM access_grant g
       JOIN scan_case s ON s.id = g.resource_id
      WHERE g.resource_type = 'scan_case'
        AND g.resource_id = ?
        AND g.grantee_user_id = ?
        AND g.revoked_at IS NULL
        AND s.deleted_at IS NULL
      ORDER BY CASE g.scope WHEN 'findings_and_content' THEN 0 ELSE 1 END
      LIMIT 1`,
    scanId,
    userId,
  );
  if (!grant) return { allowed: false };
  return { allowed: true, via: 'grant', scope: grant.scope, reviewRequestId: grant.review_request_id };
}

export function assertScanOwner(userId: string, scanId: string): void {
  const access = scanAccess(userId, scanId);
  if (!access.allowed || access.via !== 'owner') throw new Error('not_found');
}

export type ReviewAccess =
  | { allowed: false }
  | { allowed: true; role: 'owner' | 'reviewer' };

export function reviewAccess(userId: string, reviewId: string): ReviewAccess {
  const review = one<{ owner_user_id: string }>('SELECT owner_user_id FROM review_request WHERE id = ?', reviewId);
  if (!review) return { allowed: false };
  if (review.owner_user_id === userId) return { allowed: true, role: 'owner' };
  const participant = one<{ id: string }>(
    'SELECT id FROM review_participant WHERE review_request_id = ? AND user_id = ? AND removed_at IS NULL',
    reviewId,
    userId,
  );
  return participant ? { allowed: true, role: 'reviewer' } : { allowed: false };
}

export function circleRole(userId: string, circleId: string): 'admin' | 'member' | null {
  const row = one<{ role: 'admin' | 'member' }>(
    'SELECT role FROM family_membership WHERE circle_id = ? AND user_id = ? AND left_at IS NULL',
    circleId,
    userId,
  );
  return row?.role ?? null;
}

export function requireCircleMember(userId: string, circleId: string): 'admin' | 'member' {
  const role = circleRole(userId, circleId);
  if (!role) throw new Error('not_found');
  return role;
}

export function requireCircleAdmin(userId: string, circleId: string): void {
  if (circleRole(userId, circleId) !== 'admin') throw new Error('not_found');
}

export function recoveryAccess(userId: string, caseId: string): boolean {
  if (one('SELECT id FROM recovery_case WHERE id = ? AND owner_user_id = ?', caseId, userId)) return true;
  return Boolean(
    one(
      `SELECT id FROM access_grant
        WHERE resource_type = 'recovery_case' AND resource_id = ? AND grantee_user_id = ? AND revoked_at IS NULL`,
      caseId,
      userId,
    ),
  );
}

export function attachmentAccess(userId: string, attachmentId: string): boolean {
  if (one('SELECT id FROM attachment WHERE id = ? AND owner_user_id = ?', attachmentId, userId)) return true;
  // Shared only as part of a recovery case the user has an unrevoked grant on.
  return Boolean(
    one(
      `SELECT a.id FROM attachment a
         JOIN recovery_evidence e ON e.attachment_id = a.id
         JOIN access_grant g ON g.resource_type = 'recovery_case' AND g.resource_id = e.recovery_case_id
        WHERE a.id = ? AND g.grantee_user_id = ? AND g.revoked_at IS NULL`,
      attachmentId,
      userId,
    ),
  );
}

export function grantAccess(input: {
  resourceType: 'scan_case' | 'recovery_case';
  resourceId: string;
  granteeUserId: string;
  grantedBy: string;
  reviewRequestId: string | null;
  scope: Scope;
}): void {
  run(
    `INSERT INTO access_grant (id, resource_type, resource_id, grantee_user_id, granted_by, review_request_id, scope, created_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(resource_type, resource_id, grantee_user_id, review_request_id)
       DO UPDATE SET revoked_at = NULL, scope = excluded.scope, created_at = excluded.created_at`,
    id(),
    input.resourceType,
    input.resourceId,
    input.granteeUserId,
    input.grantedBy,
    input.reviewRequestId,
    input.scope,
    now(),
  );
}

/** Revokes every grant attached to a review. Takes effect on the next read. */
export function revokeReviewGrants(ownerUserId: string, reviewId: string): number {
  const review = one<{ owner_user_id: string }>('SELECT owner_user_id FROM review_request WHERE id = ?', reviewId);
  if (!review || review.owner_user_id !== ownerUserId) throw new Error('not_found');
  const open = all<{ id: string }>(
    'SELECT id FROM access_grant WHERE review_request_id = ? AND revoked_at IS NULL',
    reviewId,
  );
  run('UPDATE access_grant SET revoked_at = ? WHERE review_request_id = ? AND revoked_at IS NULL', now(), reviewId);
  return open.length;
}

export function revokeGrant(ownerUserId: string, grantId: string): void {
  run(
    'UPDATE access_grant SET revoked_at = ? WHERE id = ? AND granted_by = ? AND revoked_at IS NULL',
    now(),
    grantId,
    ownerUserId,
  );
}

export type GrantRow = {
  id: string;
  resource_type: string;
  resource_id: string;
  scope: Scope;
  created_at: number;
  grantee_name: string;
  grantee_email: string;
  review_request_id: string | null;
  resource_title: string | null;
};

export function listGrantsBy(ownerUserId: string): GrantRow[] {
  return all<GrantRow>(
    `SELECT g.id, g.resource_type, g.resource_id, g.scope, g.created_at, g.review_request_id,
            u.display_name AS grantee_name, u.email AS grantee_email,
            COALESCE(s.title, r.title) AS resource_title
       FROM access_grant g
       JOIN user u ON u.id = g.grantee_user_id
       LEFT JOIN scan_case s ON s.id = g.resource_id AND g.resource_type = 'scan_case'
       LEFT JOIN recovery_case r ON r.id = g.resource_id AND g.resource_type = 'recovery_case'
      WHERE g.granted_by = ? AND g.revoked_at IS NULL
      ORDER BY g.created_at DESC`,
    ownerUserId,
  );
}

/**
 * Enforces the invariant that sharing requires a shared circle.
 *
 * Called whenever membership changes. Any grant between two people who no longer
 * share a circle is revoked — in both directions, and regardless of which review it
 * came from. This is the authoritative rule; a grant is never left alive because it
 * happened to be created before the membership changed.
 */
export function revokeGrantsWithoutSharedCircle(userId: string): number {
  const stale = all<{ id: string }>(
    `SELECT g.id FROM access_grant g
      WHERE g.revoked_at IS NULL
        AND (g.grantee_user_id = ? OR g.granted_by = ?)
        AND NOT EXISTS (
          SELECT 1 FROM family_membership m1
            JOIN family_membership m2 ON m2.circle_id = m1.circle_id
           WHERE m1.user_id = g.granted_by AND m2.user_id = g.grantee_user_id
             AND m1.left_at IS NULL AND m2.left_at IS NULL
        )`,
    userId,
    userId,
  );
  for (const row of stale) {
    run('UPDATE access_grant SET revoked_at = ? WHERE id = ?', now(), row.id);
  }
  return stale.length;
}
