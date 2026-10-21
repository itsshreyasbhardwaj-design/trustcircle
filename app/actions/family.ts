'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { rateLimit } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import {
  acceptInvitation, createCircle, createInvitation, leaveCircle, promoteMember, removeMember, revokeInvitation,
} from '@/lib/family';
import { toActionError, type ActionState } from '@/lib/actions-shared';

export async function createCircleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const name = z.string().trim().min(1, 'Give the circle a name.').max(80).safeParse(formData.get('name'));
    if (!name.success) return { error: name.error.issues[0]?.message ?? 'Give the circle a name.' };
    const circleId = createCircle(user.id, name.data);
    revalidatePath('/family');
    redirect(`/family/${circleId}`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function createInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!rateLimit(`invite:${user.id}`, 20, 60 * 60_000)) {
      return { error: 'Too many invitations created in the last hour.' };
    }
    const circleId = String(formData.get('circleId') ?? '');
    const label = String(formData.get('label') ?? '').slice(0, 80);
    const { token } = createInvitation(user.id, circleId, label);
    revalidatePath(`/family/${circleId}`);
    // The raw token is returned once, for the user to copy. Only its hash is stored.
    return { ok: 'Invitation link created. Copy it now — it is shown only once.', data: { token } };
  } catch (err) {
    return toActionError(err);
  }
}

export async function revokeInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const circleId = String(formData.get('circleId') ?? '');
    revokeInvitation(user.id, circleId, String(formData.get('inviteId') ?? ''));
    revalidatePath(`/family/${circleId}`);
    return { ok: 'That invitation link no longer works.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function acceptInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const token = String(formData.get('token') ?? '');
    if (!rateLimit(`accept:${user.id}`, 20, 60 * 60_000)) {
      return { error: 'Too many attempts. Wait a few minutes.' };
    }
    const result = acceptInvitation(user.id, token);
    if (!result.ok) return { error: result.error };
    revalidatePath('/family');
    redirect(`/family/${result.circleId}?joined=1`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function removeMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const circleId = String(formData.get('circleId') ?? '');
    removeMember(user.id, circleId, String(formData.get('userId') ?? ''));
    revalidatePath(`/family/${circleId}`);
    return { ok: 'Removed. Every case that was shared with them through this circle is now inaccessible.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function promoteMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const circleId = String(formData.get('circleId') ?? '');
    promoteMember(user.id, circleId, String(formData.get('userId') ?? ''));
    revalidatePath(`/family/${circleId}`);
    return { ok: 'That member can now manage the circle. It gives them no access to anyone\'s cases.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function leaveCircleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    leaveCircle(user.id, String(formData.get('circleId') ?? ''));
    revalidatePath('/family');
    redirect('/family?left=1');
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}
