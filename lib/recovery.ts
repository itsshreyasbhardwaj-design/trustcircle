import 'server-only';
import { all, id, now, one, run, tx } from './db.ts';
import { sha256 } from './crypto.ts';
import { audit } from './auth.ts';
import { grantAccess, recoveryAccess } from './authz.ts';
import { notify } from './notifications.ts';

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain']);

export type RecoveryCaseRow = {
  id: string;
  title: string;
  status: 'open' | 'reported' | 'resolved' | 'closed';
  lost_amount_paise: number | null;
  happened_at: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
  evidence_count: number;
};

export type EvidenceRow = {
  id: string;
  kind: string;
  label: string;
  value: string | null;
  attachment_id: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  created_at: number;
};

const SELECT = `
  SELECT r.id, r.title, r.status, r.lost_amount_paise, r.happened_at, r.notes, r.created_at, r.updated_at,
         (SELECT COUNT(*) FROM recovery_evidence e WHERE e.recovery_case_id = r.id) AS evidence_count
    FROM recovery_case r`;

export function createRecoveryCase(
  userId: string,
  input: { title: string; lostRupees?: string; happenedAt?: string; notes?: string },
): string {
  const caseId = id();
  const t = now();
  const paise = input.lostRupees ? Math.round(Number(input.lostRupees.replace(/[^\d.]/g, '')) * 100) : null;
  run(
    'INSERT INTO recovery_case (id, owner_user_id, title, status, lost_amount_paise, happened_at, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    caseId, userId, input.title.trim().slice(0, 200) || 'Suspected fraud', 'open',
    Number.isFinite(paise as number) ? paise : null,
    input.happenedAt ? Date.parse(input.happenedAt) || null : null,
    input.notes?.trim().slice(0, 5000) || null, t, t,
  );
  audit(userId, 'recovery.created', 'recovery_case', caseId);
  return caseId;
}

export function listRecoveryCases(userId: string): RecoveryCaseRow[] {
  return all<RecoveryCaseRow>(`${SELECT} WHERE r.owner_user_id = ? ORDER BY r.updated_at DESC`, userId);
}

export function getRecoveryCase(userId: string, caseId: string): { case: RecoveryCaseRow; evidence: EvidenceRow[]; isOwner: boolean } | null {
  if (!recoveryAccess(userId, caseId)) return null;
  const row = one<RecoveryCaseRow>(`${SELECT} WHERE r.id = ?`, caseId);
  if (!row) return null;
  const evidence = all<EvidenceRow>(
    `SELECT e.id, e.kind, e.label, e.value, e.attachment_id, a.filename AS attachment_name, a.byte_size AS attachment_size, e.created_at
       FROM recovery_evidence e LEFT JOIN attachment a ON a.id = e.attachment_id
      WHERE e.recovery_case_id = ? ORDER BY e.created_at`,
    caseId,
  );
  const isOwner = Boolean(one('SELECT id FROM recovery_case WHERE id = ? AND owner_user_id = ?', caseId, userId));
  return { case: row, evidence, isOwner };
}

export function updateRecoveryCase(
  userId: string,
  caseId: string,
  input: { status?: RecoveryCaseRow['status']; notes?: string },
): void {
  const owned = one('SELECT id FROM recovery_case WHERE id = ? AND owner_user_id = ?', caseId, userId);
  if (!owned) throw new Error('not_found');
  run(
    'UPDATE recovery_case SET status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?',
    input.status ?? null, input.notes?.slice(0, 5000) ?? null, now(), caseId,
  );
  audit(userId, 'recovery.updated', 'recovery_case', caseId, input.status ?? 'notes');
}

export function addEvidence(
  userId: string,
  caseId: string,
  input: { kind: string; label: string; value?: string },
): void {
  const owned = one('SELECT id FROM recovery_case WHERE id = ? AND owner_user_id = ?', caseId, userId);
  if (!owned) throw new Error('not_found');
  run(
    'INSERT INTO recovery_evidence (id, recovery_case_id, kind, label, value, created_at) VALUES (?,?,?,?,?,?)',
    id(), caseId, input.kind, input.label.trim().slice(0, 200), input.value?.trim().slice(0, 1000) || null, now(),
  );
  run('UPDATE recovery_case SET updated_at = ? WHERE id = ?', now(), caseId);
}

export function removeEvidence(userId: string, caseId: string, evidenceId: string): void {
  const row = one<{ attachment_id: string | null }>(
    `SELECT e.attachment_id FROM recovery_evidence e JOIN recovery_case r ON r.id = e.recovery_case_id
      WHERE e.id = ? AND e.recovery_case_id = ? AND r.owner_user_id = ?`,
    evidenceId, caseId, userId,
  );
  if (!row) throw new Error('not_found');
  tx(() => {
    run('DELETE FROM recovery_evidence WHERE id = ?', evidenceId);
    if (row.attachment_id) run('DELETE FROM attachment WHERE id = ? AND owner_user_id = ?', row.attachment_id, userId);
  });
}

/**
 * Attachments live as BLOBs in the database, not on disk. That removes path handling
 * from the threat model entirely, makes deletion a single DELETE, and means an
 * attachment can only be read through `attachmentAccess()`.
 */
export async function attachFile(
  userId: string,
  caseId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const owned = one('SELECT id FROM recovery_case WHERE id = ? AND owner_user_id = ?', caseId, userId);
  if (!owned) throw new Error('not_found');
  if (file.size === 0) return { ok: false, error: 'That file is empty.' };
  if (file.size > MAX_ATTACHMENT_BYTES) return { ok: false, error: 'Files must be 4 MB or smaller.' };

  const bytes = Buffer.from(await file.arrayBuffer());
  const sniffed = sniff(bytes);
  if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
    return { ok: false, error: 'Only PNG, JPEG, WebP, PDF or plain text files can be attached.' };
  }

  const attachmentId = id();
  tx(() => {
    run(
      'INSERT INTO attachment (id, owner_user_id, filename, mime, byte_size, sha256, bytes, created_at) VALUES (?,?,?,?,?,?,?,?)',
      attachmentId, userId, safeName(file.name), sniffed, bytes.byteLength,
      sha256(bytes.toString('base64')), bytes, now(),
    );
    run(
      'INSERT INTO recovery_evidence (id, recovery_case_id, kind, label, attachment_id, created_at) VALUES (?,?,?,?,?,?)',
      id(), caseId, 'attachment', safeName(file.name), attachmentId, now(),
    );
    run('UPDATE recovery_case SET updated_at = ? WHERE id = ?', now(), caseId);
    audit(userId, 'recovery.attachment_added', 'recovery_case', caseId, sniffed);
  });
  return { ok: true };
}

/** Content sniffing from magic bytes. The client-supplied content type is ignored. */
function sniff(b: Buffer): string | null {
  if (b.length < 4) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (b.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  // Treat it as text only if every byte is printable or ordinary whitespace...
  const sample = b.subarray(0, 2048);
  const printable = sample.every((c) => c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c >= 160);
  if (!printable) return null;
  // ...and not if it is markup. An SVG is "printable text", but calling it text/plain
  // would be a quiet lie about what was stored, and SVG carries script.
  const head = sample.toString('utf8').trimStart().slice(0, 200).toLowerCase();
  if (head.startsWith('<') || /<\s*(?:svg|html|script|!doctype|\?xml)/.test(head)) return null;
  return 'text/plain';
}

const safeName = (name: string): string =>
  (name.replace(/[^\w. -]/g, '_').replace(/\.{2,}/g, '.').slice(0, 120) || 'attachment');

export function getAttachment(id_: string): { filename: string; mime: string; bytes: Buffer } | null {
  const row = one<{ filename: string; mime: string; bytes: Uint8Array }>(
    'SELECT filename, mime, bytes FROM attachment WHERE id = ?',
    id_,
  );
  return row ? { filename: row.filename, mime: row.mime, bytes: Buffer.from(row.bytes) } : null;
}

/** Shares a recovery case with one trusted contact, as an explicit, revocable grant. */
export function shareRecoveryCase(userId: string, caseId: string, granteeUserId: string): void {
  const owned = one('SELECT id FROM recovery_case WHERE id = ? AND owner_user_id = ?', caseId, userId);
  if (!owned) throw new Error('not_found');
  const sharesCircle = one(
    `SELECT 1 AS ok FROM family_membership m1 JOIN family_membership m2 ON m2.circle_id = m1.circle_id
      WHERE m1.user_id = ? AND m2.user_id = ? AND m1.left_at IS NULL AND m2.left_at IS NULL`,
    userId, granteeUserId,
  );
  if (!sharesCircle) throw new Error('not_found');
  grantAccess({
    resourceType: 'recovery_case',
    resourceId: caseId,
    granteeUserId,
    grantedBy: userId,
    reviewRequestId: null,
    scope: 'findings_and_content',
  });
  notify({
    userId: granteeUserId,
    kind: 'review_requested',
    title: 'Someone asked for help with a fraud report',
    body: 'A trusted contact shared a recovery case with you.',
    href: `/recovery/${caseId}`,
    dedupeKey: `recovery_share:${caseId}:${granteeUserId}`,
  });
  audit(userId, 'recovery.shared', 'recovery_case', caseId, granteeUserId);
}

export function deleteRecoveryCase(userId: string, caseId: string): void {
  tx(() => {
    run(
      `DELETE FROM attachment WHERE owner_user_id = ? AND id IN
        (SELECT attachment_id FROM recovery_evidence WHERE recovery_case_id = ? AND attachment_id IS NOT NULL)`,
      userId, caseId,
    );
    run('DELETE FROM recovery_case WHERE id = ? AND owner_user_id = ?', caseId, userId);
    audit(userId, 'recovery.deleted', 'recovery_case', caseId);
  });
}

export const EVIDENCE_CHECKLIST = [
  { kind: 'transaction_ref', label: 'Transaction reference / UTR number', hint: 'From your bank app or SMS. One row per transaction.' },
  { kind: 'transaction_ref', label: 'Amount and exact time of each debit', hint: 'The timeline matters more than the total.' },
  { kind: 'contact', label: 'The number, email or handle that contacted you', hint: 'Do not call it again. Record it only.' },
  { kind: 'attachment', label: 'Screenshots of the messages and the payment screen', hint: 'Capture before anything is deleted.' },
  { kind: 'note', label: 'What you were told, in your own words', hint: 'Write it down now, while you remember the sequence.' },
  { kind: 'report_ack', label: 'Bank complaint reference number', hint: 'Ask for it on the call and note the time.' },
  { kind: 'report_ack', label: 'Acknowledgement number from the cybercrime portal', hint: 'Shown after you submit the complaint.' },
] as const;
