import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, one, all } from '../lib/db.ts';
import { registerUser, verifyCredentials, getEntitlement, getSettings, changePassword, deleteAccount, listSessions, rateLimit } from '../lib/auth.ts';
import { createScan, deleteScan, getScan, listScans, recheckScan, applyRetention, countScans } from '../lib/scans.ts';
import { acceptInvitation, createCircle, createInvitation, leaveCircle, listMembers, possibleReviewers, previewInvitation, removeMember, revokeInvitation } from '../lib/family.ts';
import { addComment, createReview, getReview, revokeSharing, sendReview, setState, canTransition } from '../lib/reviews.ts';
import { scanAccess, listGrantsBy, attachmentAccess } from '../lib/authz.ts';
import { createChecklist, getChecklist, toggleStep, listChecklists } from '../lib/verification.ts';
import { addEvidence, attachFile, createRecoveryCase, getRecoveryCase, shareRecoveryCase } from '../lib/recovery.ts';
import { recordAnswers, summary } from '../lib/academy.ts';
import { listNotifications, notify, unreadCount, markRead } from '../lib/notifications.ts';
import { exportUserData } from '../lib/export.ts';
import { run } from '../lib/db.ts';

const PASSWORD = 'correct horse battery staple';

function makeUser(email: string, name: string): string {
  const r = registerUser({ email, displayName: name, password: PASSWORD });
  if (!r.ok) throw new Error(r.error);
  return r.userId;
}

/** A fictional suspicious message; reserved example domain only. */
const SUSPICIOUS =
  'URGENT: your account will be blocked today. Verify KYC at https://sbi.kyc-verify.example.net/login and share the OTP sent to your number.';

let alice = '';
let bob = '';
let carol = '';

beforeEach(() => {
  setDb(createTestDb());
  alice = makeUser('alice@example.com', 'Alice A');
  bob = makeUser('bob@example.com', 'Bob B');
  carol = makeUser('carol@example.com', 'Carol C');
});

describe('registration and authentication', () => {
  it('hashes the password and never stores it in readable form', () => {
    const row = one<{ password_hash: string; password_algo: string }>('SELECT password_hash, password_algo FROM user WHERE id = ?', alice)!;
    expect(row.password_hash).not.toContain(PASSWORD);
    expect(row.password_algo).toBe('scrypt');
    expect(row.password_hash.startsWith('scrypt$')).toBe(true);
  });

  it('stores only a hash of the recovery code', () => {
    const r = registerUser({ email: 'dave@example.com', displayName: 'Dave', password: PASSWORD });
    if (!r.ok) throw new Error('registration failed');
    const row = one<{ recovery_hash: string }>('SELECT recovery_hash FROM user WHERE id = ?', r.userId)!;
    expect(row.recovery_hash).not.toContain(r.recoveryCode);
    expect(row.recovery_hash).toHaveLength(64);
  });

  it('rejects a duplicate email case-insensitively', () => {
    expect(registerUser({ email: 'ALICE@example.com', displayName: 'x', password: PASSWORD }).ok).toBe(false);
  });

  it('verifies correct credentials and rejects wrong ones', () => {
    expect(verifyCredentials('alice@example.com', PASSWORD)).toBe(alice);
    expect(verifyCredentials('alice@example.com', 'wrong password here')).toBeNull();
    expect(verifyCredentials('nobody@example.com', PASSWORD)).toBeNull();
  });

  it('creates default settings and entitlements', () => {
    expect(getSettings(alice).retention_days).toBe(90);
    expect(getEntitlement(alice)).toMatchObject({ plan: 'free', max_members: 2, max_reviewers: 1 });
  });

  it('changes a password only with the correct current one', () => {
    expect(changePassword(alice, 'nope nope nope', 'a new long password').ok).toBe(false);
    expect(changePassword(alice, PASSWORD, 'a new long password').ok).toBe(true);
    expect(verifyCredentials('alice@example.com', 'a new long password')).toBe(alice);
  });

  it('rate-limits within a window and resets after it', () => {
    for (let i = 0; i < 3; i++) expect(rateLimit('t', 3, 60_000)).toBe(true);
    expect(rateLimit('t', 3, 60_000)).toBe(false);
    run('UPDATE rate_limit SET window_start = ? WHERE bucket = ?', Date.now() - 120_000, 't');
    expect(rateLimit('t', 3, 60_000)).toBe(true);
  });
});

describe('scan persistence', () => {
  it('stores findings and never stores a credential value', () => {
    const { scanId } = createScan(alice, { kind: 'text', content: 'Share the OTP 884213 immediately to unblock your account' });
    const stored = one<{ content_enc: string; redaction_count: number }>('SELECT content_enc, redaction_count FROM scan_input WHERE scan_case_id = ?', scanId)!;
    expect(stored.redaction_count).toBeGreaterThan(0);
    // The ciphertext must not contain the plaintext code either.
    expect(stored.content_enc).not.toContain('884213');
    const detail = getScan(alice, scanId)!;
    expect(detail.content).not.toContain('884213');
    expect(detail.findings.length).toBeGreaterThan(0);
  });

  it('encrypts content at rest', () => {
    const { scanId } = createScan(alice, { kind: 'text', content: 'A distinctive phrase about aubergines' });
    const enc = one<{ content_enc: string }>('SELECT content_enc FROM scan_input WHERE scan_case_id = ?', scanId)!.content_enc;
    expect(enc).not.toContain('aubergines');
    expect(enc.startsWith('v1.')).toBe(true);
    expect(getScan(alice, scanId)!.content).toContain('aubergines');
  });

  it('re-checking with corrected text replaces the findings', () => {
    const { scanId } = createScan(alice, { kind: 'image', content: 'blurry unreadable' });
    const before = getScan(alice, scanId)!.findings.length;
    recheckScan(alice, scanId, SUSPICIOUS);
    const after = getScan(alice, scanId)!;
    expect(after.findings.length).toBeGreaterThan(before);
    expect(after.scan.outcome).toBe('warning_signs');
    expect(one<{ source: string }>('SELECT source FROM scan_input WHERE scan_case_id = ?', scanId)!.source).toBe('ocr_corrected');
  });

  it('enforces the plan history limit by deleting the oldest', () => {
    run('UPDATE subscription_entitlement SET history_limit = 3 WHERE user_id = ?', alice);
    for (let i = 0; i < 5; i++) createScan(alice, { kind: 'text', content: `message number ${i} about something` });
    expect(countScans(alice)).toBe(3);
  });

  it('deletes cases past their retention date', () => {
    const { scanId } = createScan(alice, { kind: 'text', content: 'something to retain for a while' });
    run('UPDATE scan_case SET expires_at = ? WHERE id = ?', Date.now() - 1000, scanId);
    expect(applyRetention(alice)).toBe(1);
    expect(getScan(alice, scanId)).toBeNull();
  });

  it('cascades deletion to findings and evidence', () => {
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    expect(all('SELECT id FROM scan_finding WHERE scan_case_id = ?', scanId).length).toBeGreaterThan(0);
    deleteScan(alice, scanId);
    expect(all('SELECT id FROM scan_finding WHERE scan_case_id = ?', scanId)).toHaveLength(0);
    expect(all('SELECT scan_case_id FROM scan_input WHERE scan_case_id = ?', scanId)).toHaveLength(0);
  });
});

describe('cross-user isolation', () => {
  it('does not let another user read a case', () => {
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    expect(getScan(bob, scanId)).toBeNull();
    expect(scanAccess(bob, scanId).allowed).toBe(false);
  });

  it('does not let another user delete a case', () => {
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    expect(() => deleteScan(bob, scanId)).toThrow('not_found');
    expect(getScan(alice, scanId)).not.toBeNull();
  });

  it('keeps history lists per user', () => {
    createScan(alice, { kind: 'text', content: 'alice message about something' });
    expect(listScans(alice).length).toBe(1);
    expect(listScans(bob).length).toBe(0);
  });

  it('does not let another user alter a verification step', () => {
    const checklistId = createChecklist(alice, 'bank', null);
    const step = getChecklist(alice, checklistId)!.steps[0]!;
    expect(() => toggleStep(bob, step.id, true)).toThrow('not_found');
    expect(getChecklist(bob, checklistId)).toBeNull();
  });

  it('does not let another user read a recovery case', () => {
    const caseId = createRecoveryCase(alice, { title: 'My case' });
    expect(getRecoveryCase(bob, caseId)).toBeNull();
  });
});

describe('family circles and invitations', () => {
  it('makes the creator an admin and the only member', () => {
    const circleId = createCircle(alice, 'Test family');
    const members = listMembers(alice, circleId);
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ user_id: alice, role: 'admin' });
  });

  it('refuses to list members of a circle you are not in', () => {
    const circleId = createCircle(alice, 'Test family');
    expect(() => listMembers(bob, circleId)).toThrow('not_found');
  });

  it('stores only a hash of the invitation token', () => {
    const circleId = createCircle(alice, 'Test family');
    const { token } = createInvitation(alice, circleId);
    const row = one<{ token_hash: string }>('SELECT token_hash FROM family_invitation WHERE circle_id = ?', circleId)!;
    expect(row.token_hash).not.toContain(token);
    expect(row.token_hash).toHaveLength(64);
  });

  it('lets an invited user join, once', () => {
    const circleId = createCircle(alice, 'Test family');
    const { token } = createInvitation(alice, circleId);
    expect(acceptInvitation(bob, token)).toEqual({ ok: true, circleId });
    expect(acceptInvitation(carol, token).ok).toBe(false);
    expect(listMembers(alice, circleId)).toHaveLength(2);
  });

  it('rejects an expired invitation', () => {
    const circleId = createCircle(alice, 'Test family');
    const { token, inviteId } = createInvitation(alice, circleId);
    run('UPDATE family_invitation SET expires_at = ? WHERE id = ?', Date.now() - 1000, inviteId);
    const result = acceptInvitation(bob, token);
    expect(result.ok).toBe(false);
    expect(previewInvitation(token, bob)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a revoked invitation', () => {
    const circleId = createCircle(alice, 'Test family');
    const { token } = createInvitation(alice, circleId);
    revokeInvitation(alice, circleId, all<{ id: string }>('SELECT id FROM family_invitation')[0]!.id);
    expect(acceptInvitation(bob, token).ok).toBe(false);
    expect(previewInvitation(token, bob)).toEqual({ ok: false, reason: 'revoked' });
  });

  it('rejects a forged token', () => {
    createCircle(alice, 'Test family');
    expect(acceptInvitation(bob, 'not-a-real-token').ok).toBe(false);
    expect(previewInvitation('not-a-real-token', bob)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('refuses to create an invitation beyond the plan seat limit', () => {
    const circleId = createCircle(alice, 'Test family');
    const { token } = createInvitation(alice, circleId);
    acceptInvitation(bob, token);
    expect(() => createInvitation(alice, circleId)).toThrow(/plan_limit/);
  });

  it('does not let a non-admin invite', () => {
    const circleId = createCircle(alice, 'Test family');
    const { token } = createInvitation(alice, circleId);
    acceptInvitation(bob, token);
    expect(() => createInvitation(bob, circleId)).toThrow('not_found');
  });

  it('lists only people who share a circle as possible reviewers', () => {
    const circleId = createCircle(alice, 'Test family');
    const { token } = createInvitation(alice, circleId);
    acceptInvitation(bob, token);
    expect(possibleReviewers(alice).map((r) => r.user_id)).toEqual([bob]);
    expect(possibleReviewers(carol)).toHaveLength(0);
  });
});

/** Helper: alice + bob in one circle. */
function circleWithBob(): string {
  const circleId = createCircle(alice, 'Test family');
  const { token } = createInvitation(alice, circleId);
  acceptInvitation(bob, token);
  return circleId;
}

describe('review requests and sharing', () => {
  it('shares nothing while the request is a draft', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    createReview(alice, { scanId, question: 'Look at this?', reviewerIds: [bob], shareContent: true });
    expect(getScan(bob, scanId)).toBeNull();
  });

  it('grants access only on send, and only to the chosen reviewer', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const other = createScan(alice, { kind: 'text', content: 'an unrelated private message about dinner' }).scanId;
    const reviewId = createReview(alice, { scanId, question: 'Look at this?', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);

    expect(getScan(bob, scanId)).not.toBeNull();
    // Sharing one case must not grant access to any other case.
    expect(getScan(bob, other)).toBeNull();
    expect(getScan(carol, scanId)).toBeNull();
  });

  it('honours findings-only scope by withholding content and excerpts', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'Look?', reviewerIds: [bob], shareContent: false });
    sendReview(alice, reviewId);

    const asBob = getScan(bob, scanId)!;
    expect(asBob.scope).toBe('findings');
    expect(asBob.content).toBeNull();
    expect(asBob.findings.every((f) => f.excerpt === null)).toBe(true);
    expect(asBob.findings.length).toBeGreaterThan(0);
    // The owner still sees everything.
    expect(getScan(alice, scanId)!.content).toContain('KYC');
  });

  it('refuses to share with someone outside your circles', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    expect(() => createReview(alice, { scanId, question: 'q', reviewerIds: [carol], shareContent: true })).toThrow('not_found');
  });

  it('refuses to create a review for a case you do not own', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    expect(() => createReview(bob, { scanId, question: 'q', reviewerIds: [alice], shareContent: true })).toThrow('not_found');
  });

  it('enforces the reviewer limit from the plan', () => {
    const circleId = createCircle(alice, 'Big family');
    run('UPDATE subscription_entitlement SET max_members = 5, max_reviewers = 1 WHERE user_id = ?', alice);
    for (const u of [bob, carol]) {
      const { token } = createInvitation(alice, circleId);
      acceptInvitation(u, token);
    }
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    expect(() => createReview(alice, { scanId, question: 'q', reviewerIds: [bob, carol], shareContent: true })).toThrow(/plan_limit/);
  });

  it('records a reviewer verdict and moves the state', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);

    addComment(bob, reviewId, 'The domain is not the bank.', 'see_warning_signs');
    const detail = getReview(alice, reviewId)!;
    expect(detail.review.state).toBe('reviewed');
    expect(detail.participants[0]).toMatchObject({ user_id: bob, verdict: 'see_warning_signs' });
    expect(detail.comments).toHaveLength(1);
  });

  it('moves to more_info_requested and back when the owner replies', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: false });
    sendReview(alice, reviewId);
    addComment(bob, reviewId, 'What did the sender number look like?', 'need_more_info');
    expect(getReview(alice, reviewId)!.review.state).toBe('more_info_requested');
    addComment(alice, reviewId, 'It was a 10-digit mobile number.');
    expect(getReview(alice, reviewId)!.review.state).toBe('awaiting_review');
  });

  it('does not let an uninvolved user read or comment on a review', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    expect(getReview(carol, reviewId)).toBeNull();
    expect(() => addComment(carol, reviewId, 'hello')).toThrow('not_found');
  });

  it('blocks a revoked reviewer server-side', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    expect(getScan(bob, scanId)).not.toBeNull();

    expect(revokeSharing(alice, reviewId)).toBe(1);
    expect(getScan(bob, scanId)).toBeNull();
    expect(scanAccess(bob, scanId).allowed).toBe(false);
  });

  it('revokes access when the review is closed', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    addComment(bob, reviewId, 'Looks wrong.', 'see_warning_signs');
    setState(alice, reviewId, 'closed');
    expect(getScan(bob, scanId)).toBeNull();
    expect(() => addComment(bob, reviewId, 'more')).toThrow(/closed/i);
  });

  it('does not let a reviewer close or cancel a request', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    expect(() => setState(bob, reviewId, 'cancelled')).toThrow();
    expect(() => revokeSharing(bob, reviewId)).toThrow('not_found');
  });

  it('has no state transition that marks anything safe', () => {
    expect(canTransition('awaiting_review', 'reviewed', 'reviewer')).toBe(true);
    expect(canTransition('closed', 'awaiting_review', 'owner')).toBe(false);
    expect(canTransition('draft', 'reviewed', 'reviewer')).toBe(false);
  });

  it('revokes access when a member is removed from the circle', () => {
    const circleId = circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    removeMember(alice, circleId, bob);
    expect(getScan(bob, scanId)).toBeNull();
  });

  it('revokes what a leaving member had access to', () => {
    const circleId = circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    leaveCircle(bob, circleId);
    expect(getScan(bob, scanId)).toBeNull();
  });

  it('lists active grants for the owner and drops them on revoke', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    expect(listGrantsBy(alice)).toHaveLength(1);
    revokeSharing(alice, reviewId);
    expect(listGrantsBy(alice)).toHaveLength(0);
  });
});

describe('verification checklists', () => {
  it('creates steps from the plan and tracks completion', () => {
    const checklistId = createChecklist(alice, 'payment', null);
    const { checklist, steps } = getChecklist(alice, checklistId)!;
    expect(steps.length).toBeGreaterThan(3);
    expect(checklist.done).toBe(0);
    for (const s of steps) toggleStep(alice, s.id, true, 'checked');
    const after = getChecklist(alice, checklistId)!;
    expect(after.checklist.done).toBe(steps.length);
    expect(after.checklist.completed_at).not.toBeNull();
    expect(after.steps[0]!.outcome_note).toBe('checked');
  });

  it('reopens the checklist when a step is unticked', () => {
    const checklistId = createChecklist(alice, 'bank', null);
    const steps = getChecklist(alice, checklistId)!.steps;
    for (const s of steps) toggleStep(alice, s.id, true);
    toggleStep(alice, steps[0]!.id, false);
    expect(getChecklist(alice, checklistId)!.checklist.completed_at).toBeNull();
  });

  it('refuses to attach a checklist to a case you do not own', () => {
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    expect(() => createChecklist(bob, 'bank', scanId)).toThrow('not_found');
    expect(listChecklists(bob)).toHaveLength(0);
  });
});

describe('recovery cases and attachments', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

  it('accepts a real PNG and rejects a disguised file', async () => {
    const caseId = createRecoveryCase(alice, { title: 'Case', lostRupees: '2499.50' });
    expect(one<{ lost_amount_paise: number }>('SELECT lost_amount_paise FROM recovery_case WHERE id = ?', caseId)!.lost_amount_paise).toBe(249950);

    const ok = await attachFile(alice, caseId, new File([new Uint8Array(png)], 'proof.png', { type: 'image/png' }));
    expect(ok.ok).toBe(true);

    // Content type is attacker-controlled; the magic bytes are what count.
    const bad = await attachFile(alice, caseId, new File([new Uint8Array([0, 1, 2, 3, 4, 5])], 'x.png', { type: 'image/png' }));
    expect(bad).toEqual({ ok: false, error: 'Only PNG, JPEG, WebP, PDF or plain text files can be attached.' });
  });

  it('rejects an oversized attachment', async () => {
    const caseId = createRecoveryCase(alice, { title: 'Case' });
    const big = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]);
    expect(await attachFile(alice, caseId, new File([new Uint8Array(big)], 'big.png', { type: 'image/png' }))).toEqual({
      ok: false,
      error: 'Files must be 4 MB or smaller.',
    });
  });

  it('serves an attachment only to the owner, or to someone the case is shared with', async () => {
    circleWithBob();
    const caseId = createRecoveryCase(alice, { title: 'Case' });
    await attachFile(alice, caseId, new File([new Uint8Array(png)], 'proof.png', { type: 'image/png' }));
    const attachmentId = one<{ id: string }>('SELECT id FROM attachment WHERE owner_user_id = ?', alice)!.id;

    expect(attachmentAccess(alice, attachmentId)).toBe(true);
    expect(attachmentAccess(bob, attachmentId)).toBe(false);

    shareRecoveryCase(alice, caseId, bob);
    expect(attachmentAccess(bob, attachmentId)).toBe(true);
    expect(getRecoveryCase(bob, caseId)!.isOwner).toBe(false);
    expect(attachmentAccess(carol, attachmentId)).toBe(false);
  });

  it('refuses to share a recovery case with a stranger', () => {
    const caseId = createRecoveryCase(alice, { title: 'Case' });
    expect(() => shareRecoveryCase(alice, caseId, carol)).toThrow('not_found');
  });

  it('refuses evidence from a non-owner', () => {
    const caseId = createRecoveryCase(alice, { title: 'Case' });
    expect(() => addEvidence(bob, caseId, { kind: 'note', label: 'injected' })).toThrow('not_found');
  });
});

describe('academy progress', () => {
  it('scores answers, keeps the best score and explains every question', () => {
    const result = recordAnswers(alice, 'reading-a-link', { q1: 'b', q2: 'a' });
    expect(result.correct).toBe(1);
    expect(result.total).toBe(2);
    expect(Object.keys(result.perQuestion)).toHaveLength(2);
    expect(result.perQuestion.q2!.explanation.length).toBeGreaterThan(20);

    recordAnswers(alice, 'reading-a-link', { q1: 'a', q2: 'a' });
    expect(one<{ correct_count: number }>('SELECT correct_count FROM academy_progress WHERE user_id = ? AND lesson_slug = ?', alice, 'reading-a-link')!.correct_count).toBe(1);
    expect(summary(alice).completed).toBe(1);
  });

  it('rejects an unknown lesson', () => {
    expect(() => recordAnswers(alice, 'no-such-lesson', { q1: 'a' })).toThrow('not_found');
  });
});

describe('notifications', () => {
  it('delivers, counts, and marks read', () => {
    notify({ userId: alice, kind: 'review_requested', title: 'T', body: 'B' });
    expect(unreadCount(alice)).toBe(1);
    const items = listNotifications(alice);
    markRead(alice, items[0]!.id);
    expect(unreadCount(alice)).toBe(0);
  });

  it('does not deliver a duplicate for the same dedupe key', () => {
    for (let i = 0; i < 3; i++) {
      notify({ userId: alice, kind: 'review_comment', title: 'T', body: 'B', dedupeKey: 'same' });
    }
    expect(listNotifications(alice)).toHaveLength(1);
  });

  it('honours the user preference, except for security events', () => {
    run('UPDATE user_settings SET notify_reviews = 0 WHERE user_id = ?', alice);
    notify({ userId: alice, kind: 'review_comment', title: 'T', body: 'B' });
    expect(listNotifications(alice)).toHaveLength(0);
    notify({ userId: alice, kind: 'security_event', title: 'S', body: 'B' });
    expect(listNotifications(alice)).toHaveLength(1);
  });

  it('notifies the reviewer on send and the owner on reply', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    expect(listNotifications(bob).some((n) => n.kind === 'review_requested')).toBe(true);
    addComment(bob, reviewId, 'Looks wrong', 'see_warning_signs');
    expect(listNotifications(alice).some((n) => n.kind === 'review_comment')).toBe(true);
  });
});

describe('data export and account deletion', () => {
  it('exports the user\'s own data with content decrypted', () => {
    circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: 'A distinctive phrase about aubergines' });
    createChecklist(alice, 'bank', scanId);
    createRecoveryCase(alice, { title: 'Case' });
    const data = exportUserData(alice) as Record<string, unknown>;
    expect(JSON.stringify(data)).toContain('aubergines');
    expect(data.exportFormat).toBe('trustcircle.export.v1');
    expect((data.scans as unknown[]).length).toBe(1);
    expect((data.circles as unknown[]).length).toBe(1);
    expect((data.recoveryCases as unknown[]).length).toBe(1);
  });

  it('does not include another user\'s cases', () => {
    createScan(bob, { kind: 'text', content: 'bob private message about his own things' });
    expect(JSON.stringify(exportUserData(alice))).not.toContain('bob private message');
  });

  it('cascades a hard delete across every table', async () => {
    const circleId = circleWithBob();
    const { scanId } = createScan(alice, { kind: 'text', content: SUSPICIOUS });
    const reviewId = createReview(alice, { scanId, question: 'q', reviewerIds: [bob], shareContent: true });
    sendReview(alice, reviewId);
    const caseId = createRecoveryCase(alice, { title: 'Case' });
    await attachFile(alice, caseId, new File([new Uint8Array(Buffer.from('89504e470d0a1a0a', 'hex'))], 'p.png', { type: 'image/png' }));
    createChecklist(alice, 'bank', scanId);
    recordAnswers(alice, 'reading-a-link', { q1: 'b', q2: 'c' });

    deleteAccount(alice);

    for (const table of [
      'user', 'session', 'user_settings', 'subscription_entitlement', 'scan_case', 'verification_checklist',
      'review_request', 'recovery_case', 'attachment', 'academy_progress', 'family_membership',
    ]) {
      const col = table === 'user' ? 'id' : table === 'family_membership' || table === 'session' ? 'user_id' : table === 'user_settings' || table === 'subscription_entitlement' || table === 'academy_progress' ? 'user_id' : 'owner_user_id';
      const left = all(`SELECT * FROM ${table} WHERE ${col} = ?`, alice);
      expect(left, `${table} should be empty after deletion`).toHaveLength(0);
    }
    // Bob survives, and the circle he is in survives.
    expect(verifyCredentials('bob@example.com', PASSWORD)).toBe(bob);
    expect(all('SELECT id FROM family_circle WHERE id = ?', circleId)).toHaveLength(1);
    expect(listSessions(bob)).toHaveLength(0);
  });
});
