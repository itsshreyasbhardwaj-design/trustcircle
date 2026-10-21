'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { addComment, createReview, revokeSharing, sendReview, setState, REVIEW_STATES, VERDICTS } from '@/lib/reviews';
import { revokeGrant } from '@/lib/authz';
import { toActionError, type ActionState } from '@/lib/actions-shared';

export async function createReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const scanId = String(formData.get('scanId') ?? '');
    const question = String(formData.get('question') ?? '').slice(0, 1000);
    const reviewerIds = formData.getAll('reviewerIds').map(String).filter(Boolean);
    const shareContent = Boolean(formData.get('shareContent'));
    if (!question.trim()) return { error: 'Write what you want them to look at.' };
    if (reviewerIds.length === 0) return { error: 'Pick at least one person to ask.' };

    const reviewId = createReview(user.id, { scanId, question, reviewerIds, shareContent });
    // Creating and sending are one user action, but two server steps: the grants are
    // only created on send, so a draft never shares anything.
    sendReview(user.id, reviewId);
    revalidatePath('/reviews');
    revalidatePath(`/scan/results/${scanId}`);
    redirect(`/reviews/${reviewId}`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function commentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const reviewId = String(formData.get('reviewId') ?? '');
    const body = String(formData.get('body') ?? '').slice(0, 4000);
    const rawVerdict = String(formData.get('verdict') ?? '');
    const verdict = rawVerdict && rawVerdict in VERDICTS ? (rawVerdict as keyof typeof VERDICTS) : undefined;
    addComment(user.id, reviewId, body, verdict);
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath('/reviews');
    return { ok: 'Sent.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setReviewStateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const reviewId = String(formData.get('reviewId') ?? '');
    const next = z.enum(REVIEW_STATES).safeParse(formData.get('state'));
    if (!next.success) return { error: 'Unknown state.' };
    setState(user.id, reviewId, next.data);
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath('/reviews');
    return { ok: 'Updated.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function revokeSharingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const reviewId = String(formData.get('reviewId') ?? '');
    const n = revokeSharing(user.id, reviewId);
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath('/settings/privacy');
    return { ok: `Withdrew ${n} share${n === 1 ? '' : 's'}. The server will refuse their next attempt to open it.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function revokeGrantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    revokeGrant(user.id, String(formData.get('grantId') ?? ''));
    revalidatePath('/settings/privacy');
    return { ok: 'Access withdrawn.' };
  } catch (err) {
    return toActionError(err);
  }
}
