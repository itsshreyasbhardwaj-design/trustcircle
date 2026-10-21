'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/session';
import { recordAnswers } from '@/lib/academy';
import { dismiss, markAllRead, markRead } from '@/lib/notifications';
import { run, now } from '@/lib/db';
import { toActionError, type ActionState } from '@/lib/actions-shared';

export async function submitLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const slug = String(formData.get('slug') ?? '');
    const answers: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('q:')) answers[key.slice(2)] = String(value);
    }
    if (Object.keys(answers).length === 0) return { error: 'Choose an answer first.' };
    const result = recordAnswers(user.id, slug, answers);
    revalidatePath(`/academy/${slug}`);
    revalidatePath('/academy');
    return {
      ok: `${result.correct} of ${result.total} correct. The explanation for each question is below — read the ones you got right too.`,
      data: { answers: JSON.stringify(answers) },
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function markReadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    markRead(user.id, String(formData.get('notificationId') ?? ''));
    revalidatePath('/notifications');
    return { ok: 'Marked as read.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function markAllReadAction(_prev?: ActionState): Promise<ActionState> {
  try {
    const user = await requireUser();
    markAllRead(user.id);
    revalidatePath('/notifications');
    revalidatePath('/dashboard');
    return { ok: 'All notifications marked as read.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function dismissNotificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    dismiss(user.id, String(formData.get('notificationId') ?? ''));
    revalidatePath('/notifications');
    return { ok: 'Dismissed.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setOnboardingStepAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const step = Number(formData.get('step') ?? 0);
    const done = String(formData.get('done') ?? '') === '1';
    run(
      'UPDATE user_settings SET onboarding_step = ?, onboarding_done_at = ?, updated_at = ? WHERE user_id = ?',
      Math.max(0, Math.min(step, 7)),
      done ? now() : null,
      now(),
      user.id,
    );
    if (done) {
      revalidatePath('/dashboard');
      redirect('/dashboard');
    }
    revalidatePath('/onboarding');
    return { ok: '' };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}
