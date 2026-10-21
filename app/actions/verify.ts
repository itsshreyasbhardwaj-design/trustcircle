'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/session';
import { deleteChecklist, toggleStep } from '@/lib/verification';
import { toActionError, type ActionState } from '@/lib/actions-shared';

export async function toggleStepAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const stepId = String(formData.get('stepId') ?? '');
    const done = String(formData.get('done') ?? '') === '1';
    const note = String(formData.get('note') ?? '').slice(0, 500);
    toggleStep(user.id, stepId, done, note || undefined);
    revalidatePath(`/verify/${String(formData.get('checklistId') ?? '')}`);
    revalidatePath('/verify');
    return { ok: done ? 'Marked as done.' : 'Marked as not done.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteChecklistAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    deleteChecklist(user.id, String(formData.get('checklistId') ?? ''));
    revalidatePath('/verify');
    return { ok: 'Checklist deleted.' };
  } catch (err) {
    return toActionError(err);
  }
}
