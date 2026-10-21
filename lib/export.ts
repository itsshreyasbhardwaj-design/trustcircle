import 'server-only';
import { all, one } from './db.ts';
import { open } from './crypto.ts';

/**
 * Full data export. Includes the decrypted content of the user's own cases, because
 * an export that omits the user's own data is not an export. Excludes other people's
 * identifiers beyond the display names they already see in the app.
 */
export function exportUserData(userId: string): Record<string, unknown> {
  const user = one('SELECT id, email, display_name, created_at FROM user WHERE id = ?', userId);
  const scans = all<{ id: string; content_enc: string | null }>(
    `SELECT s.id, s.kind, s.outcome, s.headline, s.title, s.claim_type, s.is_demo, s.created_at, s.expires_at,
            i.source, i.content_enc, i.redaction_count
       FROM scan_case s LEFT JOIN scan_input i ON i.scan_case_id = s.id
      WHERE s.owner_user_id = ? ORDER BY s.created_at`,
    userId,
  );

  return {
    exportFormat: 'trustcircle.export.v1',
    exportedAt: new Date().toISOString(),
    note:
      'This file contains everything TrustCircle stores about your account, with your own message content decrypted. Treat it as sensitive.',
    account: user,
    settings: one('SELECT * FROM user_settings WHERE user_id = ?', userId),
    entitlement: one('SELECT * FROM subscription_entitlement WHERE user_id = ?', userId),
    scans: scans.map((s) => {
      const { content_enc, ...rest } = s;
      return {
        ...rest,
        content: content_enc ? open(content_enc) : null,
        findings: all(
          'SELECT code, category, severity, title, explanation, position FROM scan_finding WHERE scan_case_id = ? ORDER BY position',
          s.id,
        ),
      };
    }),
    verificationChecklists: all(
      `SELECT c.id, c.claim_type, c.title, c.created_at, c.completed_at FROM verification_checklist c WHERE c.owner_user_id = ?`,
      userId,
    ).map((c) => ({
      ...c,
      steps: all(
        'SELECT position, instruction, detail, done_at, outcome_note FROM verification_step WHERE checklist_id = ? ORDER BY position',
        (c as { id: string }).id,
      ),
    })),
    circles: all(
      `SELECT c.id, c.name, m.role, m.joined_at FROM family_circle c
         JOIN family_membership m ON m.circle_id = c.id
        WHERE m.user_id = ?`,
      userId,
    ),
    reviewsIRequested: all(
      'SELECT id, state, question, share_content, created_at, updated_at, scan_case_id FROM review_request WHERE owner_user_id = ?',
      userId,
    ),
    reviewsIWasAskedFor: all(
      `SELECT r.id, r.state, r.question, r.created_at, p.verdict, p.responded_at
         FROM review_participant p JOIN review_request r ON r.id = p.review_request_id
        WHERE p.user_id = ?`,
      userId,
    ),
    commentsIWrote: all(
      'SELECT review_request_id, body, verdict, created_at FROM review_comment WHERE author_user_id = ?',
      userId,
    ),
    activeSharesIGranted: all(
      `SELECT g.resource_type, g.resource_id, g.scope, g.created_at, u.display_name AS shared_with
         FROM access_grant g JOIN user u ON u.id = g.grantee_user_id
        WHERE g.granted_by = ? AND g.revoked_at IS NULL`,
      userId,
    ),
    recoveryCases: all(
      'SELECT id, title, status, lost_amount_paise, happened_at, notes, created_at FROM recovery_case WHERE owner_user_id = ?',
      userId,
    ).map((c) => ({
      ...c,
      evidence: all(
        'SELECT kind, label, value, attachment_id, created_at FROM recovery_evidence WHERE recovery_case_id = ? ORDER BY created_at',
        (c as { id: string }).id,
      ),
    })),
    attachments: all(
      'SELECT id, filename, mime, byte_size, created_at FROM attachment WHERE owner_user_id = ?',
      userId,
    ),
    learningProgress: all(
      'SELECT lesson_slug, correct_count, total_count, completed_at FROM academy_progress WHERE user_id = ?',
      userId,
    ),
    notifications: all(
      'SELECT kind, title, body, created_at, read_at FROM notification WHERE user_id = ? ORDER BY created_at',
      userId,
    ),
    accountActivity: all(
      'SELECT action, resource_type, resource_id, detail, created_at FROM audit_event WHERE actor_user_id = ? ORDER BY created_at',
      userId,
    ),
    notIncluded: [
      'Attachment file contents (download them individually from the recovery case).',
      'Other people\'s cases, comments on cases you do not own, and their account details.',
      'Session tokens and password hashes.',
    ],
  };
}
