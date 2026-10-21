import 'server-only';
import { all, id, now, one, run, tx } from './db.ts';
import { audit } from './auth.ts';
import { buildVerificationPlan } from './analysis/verify.ts';
import { CLAIM_LABEL } from './analysis/claim.ts';
import type { ClaimType } from './analysis/types.ts';

export type ChecklistRow = {
  id: string;
  claim_type: ClaimType;
  title: string;
  created_at: number;
  completed_at: number | null;
  scan_case_id: string | null;
  total: number;
  done: number;
};

export type StepRow = {
  id: string;
  position: number;
  instruction: string;
  detail: string | null;
  done_at: number | null;
  outcome_note: string | null;
};

const LIST_SELECT = `
  SELECT c.id, c.claim_type, c.title, c.created_at, c.completed_at, c.scan_case_id,
         (SELECT COUNT(*) FROM verification_step s WHERE s.checklist_id = c.id) AS total,
         (SELECT COUNT(*) FROM verification_step s WHERE s.checklist_id = c.id AND s.done_at IS NOT NULL) AS done
    FROM verification_checklist c`;

export function createChecklist(userId: string, claimType: ClaimType, scanId?: string | null): string {
  if (scanId) {
    const owned = one('SELECT id FROM scan_case WHERE id = ? AND owner_user_id = ?', scanId, userId);
    if (!owned) throw new Error('not_found');
  }
  const plan = buildVerificationPlan(claimType);
  const checklistId = id();
  tx(() => {
    run(
      'INSERT INTO verification_checklist (id, owner_user_id, scan_case_id, claim_type, title, created_at) VALUES (?,?,?,?,?,?)',
      checklistId, userId, scanId ?? null, claimType, plan.title, now(),
    );
    plan.steps.forEach((step, i) => {
      run(
        'INSERT INTO verification_step (id, checklist_id, position, instruction, detail) VALUES (?,?,?,?,?)',
        id(), checklistId, i, step.instruction, step.detail,
      );
    });
    audit(userId, 'checklist.created', 'verification_checklist', checklistId, claimType);
  });
  return checklistId;
}

export function listChecklists(userId: string): ChecklistRow[] {
  return all<ChecklistRow>(`${LIST_SELECT} WHERE c.owner_user_id = ? ORDER BY c.created_at DESC LIMIT 50`, userId);
}

export function getChecklist(userId: string, checklistId: string): { checklist: ChecklistRow; steps: StepRow[] } | null {
  const checklist = one<ChecklistRow>(`${LIST_SELECT} WHERE c.id = ? AND c.owner_user_id = ?`, checklistId, userId);
  if (!checklist) return null;
  const steps = all<StepRow>(
    'SELECT id, position, instruction, detail, done_at, outcome_note FROM verification_step WHERE checklist_id = ? ORDER BY position',
    checklistId,
  );
  return { checklist, steps };
}

export function toggleStep(userId: string, stepId: string, done: boolean, note?: string): void {
  // Ownership is enforced through the join, not by trusting the step id.
  const owned = one<{ checklist_id: string }>(
    `SELECT s.checklist_id FROM verification_step s
       JOIN verification_checklist c ON c.id = s.checklist_id
      WHERE s.id = ? AND c.owner_user_id = ?`,
    stepId, userId,
  );
  if (!owned) throw new Error('not_found');
  tx(() => {
    run(
      'UPDATE verification_step SET done_at = ?, outcome_note = COALESCE(?, outcome_note) WHERE id = ?',
      done ? now() : null, note?.trim().slice(0, 500) || null, stepId,
    );
    const remaining = one<{ n: number }>(
      'SELECT COUNT(*) AS n FROM verification_step WHERE checklist_id = ? AND done_at IS NULL',
      owned.checklist_id,
    )?.n ?? 0;
    run(
      'UPDATE verification_checklist SET completed_at = ? WHERE id = ?',
      remaining === 0 ? now() : null, owned.checklist_id,
    );
  });
}

export function deleteChecklist(userId: string, checklistId: string): void {
  run('DELETE FROM verification_checklist WHERE id = ? AND owner_user_id = ?', checklistId, userId);
  audit(userId, 'checklist.deleted', 'verification_checklist', checklistId);
}

export const claimLabel = (c: ClaimType): string => CLAIM_LABEL[c];
