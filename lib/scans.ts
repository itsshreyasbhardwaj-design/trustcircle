import 'server-only';
import { all, id, now, one, run, tx } from './db.ts';
import { open, seal } from './crypto.ts';
import { analyze, type AnalysisResult, type ScanInput } from './analysis/index.ts';
import { CLAIM_LABEL } from './analysis/claim.ts';
import { buildVerificationPlan } from './analysis/verify.ts';
import { assertScanOwner, scanAccess, type Scope } from './authz.ts';
import { audit, getEntitlement, getSettings } from './auth.ts';

export type SavedScan = {
  id: string;
  kind: string;
  outcome: AnalysisResult['outcome'];
  headline: string;
  title: string;
  claim_type: string | null;
  is_demo: number;
  created_at: number;
  expires_at: number | null;
};

export type ScanDetail = {
  scan: SavedScan;
  findings: Array<{
    id: string;
    code: string;
    category: string;
    severity: 'info' | 'caution' | 'high';
    title: string;
    explanation: string;
    excerpt: string | null;
  }>;
  /** Null when the viewer has findings-only access. */
  content: string | null;
  redactionCount: number;
  plan: ReturnType<typeof buildVerificationPlan>;
  scope: Scope;
  isOwner: boolean;
};

function titleFor(result: AnalysisResult): string {
  const base = CLAIM_LABEL[result.claimType];
  const snippet = result.safeContent.replace(/\s+/g, ' ').trim().slice(0, 60);
  return snippet ? `${base}: "${snippet}${result.safeContent.length > 60 ? '…' : ''}"` : base;
}

/** Runs the engine and persists the case, its findings and its evidence in one transaction. */
export function createScan(
  userId: string,
  input: ScanInput,
  opts: { isDemo?: boolean; save?: boolean } = {},
): { scanId: string; result: AnalysisResult } {
  const result = analyze(input);
  const settings = getSettings(userId);
  const scanId = id();
  const t = now();
  const expiresAt = settings.retention_days > 0 ? t + settings.retention_days * 86_400_000 : null;

  tx(() => {
    run(
      `INSERT INTO scan_case (id, owner_user_id, kind, outcome, headline, claim_type, title, is_demo, saved, created_at, expires_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      scanId, userId, input.kind, result.outcome, result.headline, result.claimType,
      titleFor(result), opts.isDemo ? 1 : 0, opts.save === false ? 0 : 1, t, expiresAt,
    );
    run(
      'INSERT INTO scan_input (scan_case_id, source, content_enc, redaction_count, meta_json) VALUES (?,?,?,?,?)',
      scanId,
      input.kind === 'image' ? 'ocr' : input.kind === 'url' ? 'url' : input.kind === 'qr' ? 'qr' : input.kind === 'payment' ? 'form' : 'pasted',
      seal(result.safeContent),
      result.sensitive.reduce((n, s) => n + s.count, 0),
      JSON.stringify({ urls: result.urls.map((u) => u.registrableDomain), upiHandle: result.upi?.handle ?? null }),
    );
    for (const finding of result.findings) {
      const findingId = id();
      run(
        'INSERT INTO scan_finding (id, scan_case_id, code, category, severity, title, explanation, position) VALUES (?,?,?,?,?,?,?,?)',
        findingId, scanId, finding.code, finding.category, finding.severity, finding.title, finding.explanation, finding.position,
      );
      if (finding.excerpt) {
        run(
          'INSERT INTO scan_evidence (id, scan_finding_id, excerpt_enc, note) VALUES (?,?,?,?)',
          id(), findingId, seal(finding.excerpt), null,
        );
      }
    }
    audit(userId, 'scan.created', 'scan_case', scanId, `${input.kind}/${result.outcome}`);
  });

  enforceHistoryLimit(userId);
  return { scanId, result };
}

/** Free-plan history cap. Oldest non-demo cases are dropped, not silently hidden. */
function enforceHistoryLimit(userId: string): void {
  const limit = getEntitlement(userId).history_limit;
  if (limit <= 0) return;
  const extra = all<{ id: string }>(
    'SELECT id FROM scan_case WHERE owner_user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT -1 OFFSET ?',
    userId, limit,
  );
  for (const row of extra) run('DELETE FROM scan_case WHERE id = ?', row.id);
}

/** Deletes cases past their retention date. Called on dashboard load. */
export function applyRetention(userId: string): number {
  const stale = all<{ id: string }>(
    'SELECT id FROM scan_case WHERE owner_user_id = ? AND expires_at IS NOT NULL AND expires_at < ?',
    userId, now(),
  );
  for (const row of stale) run('DELETE FROM scan_case WHERE id = ?', row.id);
  return stale.length;
}

export function listScans(
  userId: string,
  opts: { limit?: number; offset?: number; outcome?: string } = {},
): SavedScan[] {
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  if (opts.outcome) {
    return all<SavedScan>(
      `SELECT id, kind, outcome, headline, title, claim_type, is_demo, created_at, expires_at
         FROM scan_case WHERE owner_user_id = ? AND deleted_at IS NULL AND outcome = ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      userId, opts.outcome, limit, offset,
    );
  }
  return all<SavedScan>(
    `SELECT id, kind, outcome, headline, title, claim_type, is_demo, created_at, expires_at
       FROM scan_case WHERE owner_user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    userId, limit, offset,
  );
}

export function countScans(userId: string): number {
  return one<{ n: number }>(
    'SELECT COUNT(*) AS n FROM scan_case WHERE owner_user_id = ? AND deleted_at IS NULL',
    userId,
  )?.n ?? 0;
}

export function outcomeCounts(userId: string): Record<string, number> {
  const rows = all<{ outcome: string; n: number }>(
    'SELECT outcome, COUNT(*) AS n FROM scan_case WHERE owner_user_id = ? AND deleted_at IS NULL GROUP BY outcome',
    userId,
  );
  return Object.fromEntries(rows.map((r) => [r.outcome, r.n]));
}

/**
 * Reads one case. Authorisation decides *what* comes back, not just whether:
 * a reviewer with findings-only access gets `content: null` and no excerpts.
 */
export function getScan(userId: string, scanId: string): ScanDetail | null {
  const access = scanAccess(userId, scanId);
  if (!access.allowed) return null;

  const scan = one<SavedScan>(
    `SELECT id, kind, outcome, headline, title, claim_type, is_demo, created_at, expires_at
       FROM scan_case WHERE id = ? AND deleted_at IS NULL`,
    scanId,
  );
  if (!scan) return null;

  const showContent = access.scope === 'findings_and_content';
  const rows = all<{
    id: string; code: string; category: string; severity: 'info' | 'caution' | 'high';
    title: string; explanation: string; excerpt_enc: string | null;
  }>(
    `SELECT f.id, f.code, f.category, f.severity, f.title, f.explanation, e.excerpt_enc
       FROM scan_finding f LEFT JOIN scan_evidence e ON e.scan_finding_id = f.id
      WHERE f.scan_case_id = ? ORDER BY f.position`,
    scanId,
  );

  const input = one<{ content_enc: string; redaction_count: number }>(
    'SELECT content_enc, redaction_count FROM scan_input WHERE scan_case_id = ?',
    scanId,
  );

  return {
    scan,
    findings: rows.map((r) => ({
      id: r.id,
      code: r.code,
      category: r.category,
      severity: r.severity,
      title: r.title,
      explanation: r.explanation,
      excerpt: showContent && r.excerpt_enc ? open(r.excerpt_enc) : null,
    })),
    content: showContent && input ? open(input.content_enc) : null,
    redactionCount: input?.redaction_count ?? 0,
    plan: buildVerificationPlan((scan.claim_type ?? 'unknown') as never),
    scope: access.scope,
    isOwner: access.via === 'owner',
  };
}

export function deleteScan(userId: string, scanId: string): void {
  assertScanOwner(userId, scanId);
  tx(() => {
    audit(userId, 'scan.deleted', 'scan_case', scanId);
    // Hard delete: findings, evidence, grants and reviews cascade from the schema.
    run('DELETE FROM scan_case WHERE id = ? AND owner_user_id = ?', scanId, userId);
  });
}

export function deleteAllScans(userId: string): number {
  const rows = all<{ id: string }>('SELECT id FROM scan_case WHERE owner_user_id = ?', userId);
  tx(() => {
    run('DELETE FROM scan_case WHERE owner_user_id = ?', userId);
    audit(userId, 'scan.deleted_all', undefined, undefined, `${rows.length} cases`);
  });
  return rows.length;
}

/** Corrected OCR text re-runs the engine and replaces the stored result in place. */
export function recheckScan(userId: string, scanId: string, correctedText: string): AnalysisResult {
  assertScanOwner(userId, scanId);
  const existing = one<{ kind: string }>('SELECT kind FROM scan_case WHERE id = ?', scanId);
  const result = analyze({ kind: (existing?.kind ?? 'text') as never, content: correctedText });
  tx(() => {
    run(
      'UPDATE scan_case SET outcome = ?, headline = ?, claim_type = ?, title = ? WHERE id = ? AND owner_user_id = ?',
      result.outcome, result.headline, result.claimType, titleFor(result), scanId, userId,
    );
    run(
      'UPDATE scan_input SET content_enc = ?, source = ?, redaction_count = ? WHERE scan_case_id = ?',
      seal(result.safeContent), 'ocr_corrected', result.sensitive.reduce((n, s) => n + s.count, 0), scanId,
    );
    run('DELETE FROM scan_finding WHERE scan_case_id = ?', scanId);
    for (const finding of result.findings) {
      const findingId = id();
      run(
        'INSERT INTO scan_finding (id, scan_case_id, code, category, severity, title, explanation, position) VALUES (?,?,?,?,?,?,?,?)',
        findingId, scanId, finding.code, finding.category, finding.severity, finding.title, finding.explanation, finding.position,
      );
      if (finding.excerpt) {
        run('INSERT INTO scan_evidence (id, scan_finding_id, excerpt_enc, note) VALUES (?,?,?,?)', id(), findingId, seal(finding.excerpt), null);
      }
    }
    audit(userId, 'scan.rechecked', 'scan_case', scanId, 'corrected text');
  });
  return result;
}
