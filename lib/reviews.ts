import 'server-only';
import { all, id, now, one, run, tx } from './db.ts';
import { audit, getEntitlement } from './auth.ts';
import { notify } from './notifications.ts';
import { grantAccess, reviewAccess, revokeReviewGrants } from './authz.ts';
import { circleRole } from './authz.ts';

export const REVIEW_STATES = [
  'draft',
  'awaiting_review',
  'under_review',
  'more_info_requested',
  'reviewed',
  'closed',
  'cancelled',
] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

/**
 * Reviewer verdicts. There is deliberately no "this is safe" option: a trusted
 * contact cannot certify a message or a payment, and offering a button that looks
 * like certification would be the most harmful thing this product could ship.
 */
export const VERDICTS = {
  see_warning_signs: 'I see warning signs',
  verify_independently: 'We should verify this independently',
  need_more_info: 'I need more information',
  cannot_determine: 'I cannot tell whether this is legitimate',
} as const;
export type Verdict = keyof typeof VERDICTS;

export const STATE_LABEL: Record<ReviewState, string> = {
  draft: 'Draft',
  awaiting_review: 'Awaiting review',
  under_review: 'Under review',
  more_info_requested: 'More information requested',
  reviewed: 'Reviewed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

/** Who may move a review from which state to which. Enforced server-side. */
const TRANSITIONS: Record<ReviewState, Partial<Record<ReviewState, Array<'owner' | 'reviewer'>>>> = {
  draft: { awaiting_review: ['owner'], cancelled: ['owner'] },
  awaiting_review: { under_review: ['reviewer'], more_info_requested: ['reviewer'], reviewed: ['reviewer'], cancelled: ['owner'] },
  under_review: { more_info_requested: ['reviewer'], reviewed: ['reviewer'], cancelled: ['owner'] },
  more_info_requested: { awaiting_review: ['owner'], under_review: ['reviewer'], reviewed: ['reviewer'], cancelled: ['owner'] },
  reviewed: { closed: ['owner'], under_review: ['reviewer'] },
  closed: {},
  cancelled: {},
};

export function canTransition(from: ReviewState, to: ReviewState, role: 'owner' | 'reviewer'): boolean {
  return TRANSITIONS[from][to]?.includes(role) ?? false;
}

export type ReviewRow = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  circle_id: string | null;
  scan_case_id: string | null;
  state: ReviewState;
  question: string;
  share_content: number;
  created_at: number;
  updated_at: number;
  scan_title: string | null;
  scan_outcome: string | null;
  reviewer_count: number;
  responded_count: number;
  comment_count: number;
};

const REVIEW_SELECT = `
  SELECT r.id, r.owner_user_id, u.display_name AS owner_name, r.circle_id, r.scan_case_id, r.state,
         r.question, r.share_content, r.created_at, r.updated_at,
         s.title AS scan_title, s.outcome AS scan_outcome,
         (SELECT COUNT(*) FROM review_participant p WHERE p.review_request_id = r.id AND p.removed_at IS NULL) AS reviewer_count,
         (SELECT COUNT(*) FROM review_participant p WHERE p.review_request_id = r.id AND p.removed_at IS NULL AND p.verdict IS NOT NULL) AS responded_count,
         (SELECT COUNT(*) FROM review_comment c WHERE c.review_request_id = r.id) AS comment_count
    FROM review_request r
    JOIN user u ON u.id = r.owner_user_id
    LEFT JOIN scan_case s ON s.id = r.scan_case_id`;

export function createReview(
  userId: string,
  input: { scanId: string; question: string; reviewerIds: string[]; shareContent: boolean; circleId?: string | null },
): string {
  const owned = one('SELECT id FROM scan_case WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL', input.scanId, userId);
  if (!owned) throw new Error('not_found');

  const maxReviewers = getEntitlement(userId).max_reviewers;
  const reviewers = [...new Set(input.reviewerIds)].filter((r) => r !== userId).slice(0, Math.max(maxReviewers, 1));
  if (reviewers.length === 0) throw new Error('Pick at least one person to ask.');
  if (input.reviewerIds.length > maxReviewers) {
    throw new Error(`plan_limit:Your plan allows ${maxReviewers} reviewer${maxReviewers === 1 ? '' : 's'} per request.`);
  }

  // Reviewers must share a circle with the requester — you cannot share with a stranger.
  const allowed = new Set(
    all<{ user_id: string }>(
      `SELECT DISTINCT m2.user_id FROM family_membership m1
         JOIN family_membership m2 ON m2.circle_id = m1.circle_id AND m2.left_at IS NULL
        WHERE m1.user_id = ? AND m1.left_at IS NULL`,
      userId,
    ).map((r) => r.user_id),
  );
  for (const r of reviewers) if (!allowed.has(r)) throw new Error('not_found');

  // Record the circle the request runs through, derived from a circle actually shared
  // with the first reviewer rather than taken from the client.
  const derivedCircle =
    input.circleId ??
    one<{ circle_id: string }>(
      `SELECT m1.circle_id FROM family_membership m1
         JOIN family_membership m2 ON m2.circle_id = m1.circle_id
        WHERE m1.user_id = ? AND m2.user_id = ? AND m1.left_at IS NULL AND m2.left_at IS NULL
        LIMIT 1`,
      userId,
      reviewers[0]!,
    )?.circle_id ??
    null;

  const reviewId = id();
  const t = now();
  tx(() => {
    run(
      `INSERT INTO review_request (id, owner_user_id, circle_id, scan_case_id, state, question, share_findings, share_content, created_at, updated_at)
       VALUES (?,?,?,?,?,?,1,?,?,?)`,
      reviewId, userId, derivedCircle, input.scanId, 'draft', input.question.trim().slice(0, 1000),
      input.shareContent ? 1 : 0, t, t,
    );
    for (const reviewerId of reviewers) {
      run('INSERT INTO review_participant (id, review_request_id, user_id) VALUES (?,?,?)', id(), reviewId, reviewerId);
    }
    audit(userId, 'review.created', 'review_request', reviewId);
  });
  return reviewId;
}

/** Sending is what creates the access grants. A draft shares nothing. */
export function sendReview(userId: string, reviewId: string): void {
  const review = one<{ owner_user_id: string; state: ReviewState; scan_case_id: string; share_content: number }>(
    'SELECT owner_user_id, state, scan_case_id, share_content FROM review_request WHERE id = ?',
    reviewId,
  );
  if (!review || review.owner_user_id !== userId) throw new Error('not_found');
  if (!canTransition(review.state, 'awaiting_review', 'owner')) throw new Error('This request cannot be sent from its current state.');

  const reviewers = all<{ user_id: string }>(
    'SELECT user_id FROM review_participant WHERE review_request_id = ? AND removed_at IS NULL',
    reviewId,
  );
  tx(() => {
    run('UPDATE review_request SET state = ?, updated_at = ? WHERE id = ?', 'awaiting_review', now(), reviewId);
    for (const r of reviewers) {
      grantAccess({
        resourceType: 'scan_case',
        resourceId: review.scan_case_id,
        granteeUserId: r.user_id,
        grantedBy: userId,
        reviewRequestId: reviewId,
        scope: review.share_content ? 'findings_and_content' : 'findings',
      });
      notify({
        userId: r.user_id,
        kind: 'review_requested',
        title: 'Someone asked for your second opinion',
        body: 'A trusted contact shared one case with you and would like your view on it.',
        href: `/reviews/${reviewId}`,
        dedupeKey: `review_sent:${reviewId}:${r.user_id}`,
      });
    }
    audit(userId, 'review.sent', 'review_request', reviewId, `${reviewers.length} reviewers`);
  });
}

export function listReviewsIOwn(userId: string): ReviewRow[] {
  return all<ReviewRow>(`${REVIEW_SELECT} WHERE r.owner_user_id = ? ORDER BY r.updated_at DESC`, userId);
}

export function listReviewsAskedOfMe(userId: string): ReviewRow[] {
  return all<ReviewRow>(
    `${REVIEW_SELECT}
      JOIN review_participant p ON p.review_request_id = r.id AND p.user_id = ? AND p.removed_at IS NULL
     WHERE r.state NOT IN ('draft','cancelled') ORDER BY r.updated_at DESC`,
    userId,
  );
}

export function pendingForMe(userId: string): number {
  return (
    one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM review_request r
         JOIN review_participant p ON p.review_request_id = r.id AND p.user_id = ? AND p.removed_at IS NULL
        WHERE r.state IN ('awaiting_review','under_review','more_info_requested') AND p.verdict IS NULL`,
      userId,
    )?.n ?? 0
  );
}

export type ReviewDetail = {
  review: ReviewRow;
  role: 'owner' | 'reviewer';
  participants: Array<{ user_id: string; display_name: string; verdict: Verdict | null; responded_at: number | null }>;
  comments: Array<{ id: string; author_user_id: string; author_name: string; body: string; verdict: Verdict | null; created_at: number }>;
  myVerdict: Verdict | null;
};

export function getReview(userId: string, reviewId: string): ReviewDetail | null {
  const access = reviewAccess(userId, reviewId);
  if (!access.allowed) return null;
  const review = one<ReviewRow>(`${REVIEW_SELECT} WHERE r.id = ?`, reviewId);
  if (!review) return null;
  if (access.role === 'reviewer' && (review.state === 'draft' || review.state === 'cancelled')) return null;

  const participants = all<{ user_id: string; display_name: string; verdict: Verdict | null; responded_at: number | null }>(
    `SELECT p.user_id, u.display_name, p.verdict, p.responded_at
       FROM review_participant p JOIN user u ON u.id = p.user_id
      WHERE p.review_request_id = ? AND p.removed_at IS NULL ORDER BY u.display_name`,
    reviewId,
  );
  const comments = all<{ id: string; author_user_id: string; author_name: string; body: string; verdict: Verdict | null; created_at: number }>(
    `SELECT c.id, c.author_user_id, u.display_name AS author_name, c.body, c.verdict, c.created_at
       FROM review_comment c JOIN user u ON u.id = c.author_user_id
      WHERE c.review_request_id = ? ORDER BY c.created_at`,
    reviewId,
  );
  return {
    review,
    role: access.role,
    participants,
    comments,
    myVerdict: participants.find((p) => p.user_id === userId)?.verdict ?? null,
  };
}

export function addComment(userId: string, reviewId: string, body: string, verdict?: Verdict): void {
  const access = reviewAccess(userId, reviewId);
  if (!access.allowed) throw new Error('not_found');
  const review = one<{ state: ReviewState; owner_user_id: string }>(
    'SELECT state, owner_user_id FROM review_request WHERE id = ?',
    reviewId,
  );
  if (!review) throw new Error('not_found');
  if (review.state === 'closed' || review.state === 'cancelled') throw new Error('This review is closed.');
  if (access.role === 'reviewer' && review.state === 'draft') throw new Error('not_found');

  const trimmed = body.trim().slice(0, 4000);
  if (!trimmed) throw new Error('Write something first.');

  tx(() => {
    run(
      'INSERT INTO review_comment (id, review_request_id, author_user_id, body, verdict, created_at) VALUES (?,?,?,?,?,?)',
      id(), reviewId, userId, trimmed, verdict ?? null, now(),
    );

    let nextState: ReviewState = review.state;
    if (access.role === 'reviewer') {
      run(
        'UPDATE review_participant SET verdict = COALESCE(?, verdict), responded_at = ? WHERE review_request_id = ? AND user_id = ?',
        verdict ?? null, now(), reviewId, userId,
      );
      if (verdict === 'need_more_info') nextState = 'more_info_requested';
      else if (verdict) nextState = 'reviewed';
      else if (review.state === 'awaiting_review') nextState = 'under_review';
    } else if (review.state === 'more_info_requested') {
      nextState = 'awaiting_review';
    }

    if (nextState !== review.state && canTransition(review.state, nextState, access.role)) {
      run('UPDATE review_request SET state = ?, updated_at = ? WHERE id = ?', nextState, now(), reviewId);
    } else {
      run('UPDATE review_request SET updated_at = ? WHERE id = ?', now(), reviewId);
    }

    const recipients = all<{ user_id: string }>(
      `SELECT user_id FROM review_participant WHERE review_request_id = ? AND removed_at IS NULL AND user_id != ?
        UNION SELECT owner_user_id FROM review_request WHERE id = ? AND owner_user_id != ?`,
      reviewId, userId, reviewId, userId,
    );
    for (const r of recipients) {
      notify({
        userId: r.user_id,
        kind: 'review_comment',
        title: 'New comment on a second opinion',
        body: verdict ? VERDICTS[verdict] : 'Someone added a comment.',
        href: `/reviews/${reviewId}`,
      });
    }
    audit(userId, 'review.commented', 'review_request', reviewId, verdict ?? 'comment');
  });
}

export function setState(userId: string, reviewId: string, next: ReviewState): void {
  const access = reviewAccess(userId, reviewId);
  if (!access.allowed) throw new Error('not_found');
  const review = one<{ state: ReviewState; owner_user_id: string }>('SELECT state, owner_user_id FROM review_request WHERE id = ?', reviewId);
  if (!review) throw new Error('not_found');
  if (!canTransition(review.state, next, access.role)) {
    throw new Error(`Cannot move a request from ${STATE_LABEL[review.state]} to ${STATE_LABEL[next]}.`);
  }
  tx(() => {
    run(
      'UPDATE review_request SET state = ?, updated_at = ?, closed_at = ? WHERE id = ?',
      next, now(), next === 'closed' || next === 'cancelled' ? now() : null, reviewId,
    );
    // Closing or cancelling ends the sharing it created. Access is revoked, not hidden.
    if (next === 'closed' || next === 'cancelled') {
      revokeReviewGrants(review.owner_user_id, reviewId);
      for (const r of all<{ user_id: string }>('SELECT user_id FROM review_participant WHERE review_request_id = ?', reviewId)) {
        if (r.user_id === userId) continue;
        notify({
          userId: r.user_id,
          kind: 'access_revoked',
          title: next === 'closed' ? 'A review was closed' : 'A review was cancelled',
          body: 'The case that was shared with you is no longer accessible.',
          href: '/reviews',
          dedupeKey: `review_${next}:${reviewId}:${r.user_id}`,
        });
      }
    }
    audit(userId, `review.${next}`, 'review_request', reviewId);
  });
}

/** Explicit, standalone revoke — available while a review is still open. */
export function revokeSharing(userId: string, reviewId: string): number {
  const count = revokeReviewGrants(userId, reviewId);
  for (const r of all<{ user_id: string }>('SELECT user_id FROM review_participant WHERE review_request_id = ?', reviewId)) {
    if (r.user_id === userId) continue;
    notify({
      userId: r.user_id,
      kind: 'access_revoked',
      title: 'Access to a shared case was withdrawn',
      body: 'You can no longer open the case that was shared with you.',
      href: '/reviews',
    });
  }
  audit(userId, 'review.access_revoked', 'review_request', reviewId, `${count} grants`);
  return count;
}

export function circleRoleFor(userId: string, circleId: string) {
  return circleRole(userId, circleId);
}
