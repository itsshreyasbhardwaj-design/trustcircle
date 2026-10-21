'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import {
  addEvidence, attachFile, createRecoveryCase, deleteRecoveryCase, removeEvidence, shareRecoveryCase, updateRecoveryCase,
} from '@/lib/recovery';
import { toActionError, type ActionState } from '@/lib/actions-shared';

export async function createRecoveryCaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const title = String(formData.get('title') ?? '').trim();
    if (!title) return { error: 'Give this case a short name so you can find it again.' };
    const caseId = createRecoveryCase(user.id, {
      title,
      lostRupees: String(formData.get('lostRupees') ?? ''),
      happenedAt: String(formData.get('happenedAt') ?? ''),
      notes: String(formData.get('notes') ?? ''),
    });
    revalidatePath('/recovery');
    redirect(`/recovery/${caseId}`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function updateRecoveryCaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const caseId = String(formData.get('caseId') ?? '');
    const status = z.enum(['open', 'reported', 'resolved', 'closed']).safeParse(formData.get('status'));
    updateRecoveryCase(user.id, caseId, {
      status: status.success ? status.data : undefined,
      notes: formData.has('notes') ? String(formData.get('notes') ?? '') : undefined,
    });
    revalidatePath(`/recovery/${caseId}`);
    return { ok: 'Case updated.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function addEvidenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const caseId = String(formData.get('caseId') ?? '');
    const label = String(formData.get('label') ?? '').trim();
    if (!label) return { error: 'Describe what this is.' };
    addEvidence(user.id, caseId, {
      kind: String(formData.get('kind') ?? 'note'),
      label,
      value: String(formData.get('value') ?? ''),
    });
    revalidatePath(`/recovery/${caseId}`);
    return { ok: 'Added to the case.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function removeEvidenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const caseId = String(formData.get('caseId') ?? '');
    removeEvidence(user.id, caseId, String(formData.get('evidenceId') ?? ''));
    revalidatePath(`/recovery/${caseId}`);
    return { ok: 'Removed.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function attachFileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const caseId = String(formData.get('caseId') ?? '');
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'Choose a file first.' };
    const result = await attachFile(user.id, caseId, file);
    if (!result.ok) return { error: result.error };
    revalidatePath(`/recovery/${caseId}`);
    return { ok: 'Attached. Only you can open it, unless you share this case.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function shareRecoveryCaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const caseId = String(formData.get('caseId') ?? '');
    const granteeId = String(formData.get('granteeId') ?? '');
    if (!granteeId) return { error: 'Pick someone from your circle.' };
    shareRecoveryCase(user.id, caseId, granteeId);
    revalidatePath(`/recovery/${caseId}`);
    return { ok: 'Shared. You can withdraw this at any time from privacy settings.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteRecoveryCaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    deleteRecoveryCase(user.id, String(formData.get('caseId') ?? ''));
    revalidatePath('/recovery');
    redirect('/recovery?deleted=1');
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}
