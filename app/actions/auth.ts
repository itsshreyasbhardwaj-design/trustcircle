'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { audit, changePassword, deleteAccount, rateLimit, registerUser, revokeOtherSessions, revokeSession, verifyCredentials } from '@/lib/auth';
import { currentSessionId, endSession, requireUser, startSession } from '@/lib/session';
import { run, now, one } from '@/lib/db';
import { isLang } from '@/lib/i18n';
import { notify } from '@/lib/notifications';
import { toActionError, type ActionState } from '@/lib/actions-shared';

/** Rate-limit key. Behind a proxy this needs a trusted forwarded-for; see SECURITY.md. */
async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
  return `${prefix}:${ip}`;
}

const emailSchema = z.string().trim().min(3).max(254).email('Enter a valid email address.');
const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters. Length matters far more than symbols.')
  .max(200, 'That password is too long.');

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    if (!rateLimit(await clientKey('signup'), 5, 15 * 60_000)) {
      return { error: 'Too many attempts from this device. Wait a few minutes and try again.' };
    }
    const parsed = z
      .object({
        email: emailSchema,
        displayName: z.string().trim().min(1, 'Tell us what to call you.').max(80),
        password: passwordSchema,
        confirm: z.string(),
        accept: z.string().optional(),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
    const { email, displayName, password, confirm, accept } = parsed.data;
    if (password !== confirm) return { error: 'The two passwords do not match.' };
    if (!accept) return { error: 'Please confirm you understand that TrustCircle cannot guarantee safety.' };

    const result = registerUser({ email, displayName, password });
    if (!result.ok) return { error: result.error };

    const h = await headers();
    await startSession(result.userId, h.get('user-agent') ?? undefined);
    notify({
      userId: result.userId,
      kind: 'security_event',
      title: 'Welcome to TrustCircle',
      body: 'Your account was created. Keep your recovery code somewhere safe — it is the only way back in if you forget your password.',
      href: '/settings/security',
      dedupeKey: `welcome:${result.userId}`,
    });
    // The recovery code is shown exactly once, on the next page, and never stored in plain form.
    redirect(`/onboarding?recovery=${encodeURIComponent(result.recoveryCode)}`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const email = String(formData.get('email') ?? '');
    if (!rateLimit(await clientKey('login'), 10, 10 * 60_000)) {
      return { error: 'Too many sign-in attempts from this device. Wait a few minutes.' };
    }
    if (!rateLimit(`login:acct:${email.toLowerCase()}`, 8, 10 * 60_000)) {
      return { error: 'Too many sign-in attempts for this account. Wait a few minutes.' };
    }
    const userId = verifyCredentials(email, String(formData.get('password') ?? ''));
    if (!userId) return { error: 'Email or password is incorrect.' };
    const h = await headers();
    await startSession(userId, h.get('user-agent') ?? undefined);
    const settings = one<{ onboarding_done_at: number | null }>(
      'SELECT onboarding_done_at FROM user_settings WHERE user_id = ?',
      userId,
    );
    redirect(settings?.onboarding_done_at ? '/dashboard' : '/onboarding');
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect('/');
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!rateLimit(`pwchange:${user.id}`, 5, 15 * 60_000)) {
      return { error: 'Too many attempts. Wait a few minutes.' };
    }
    const parsed = z
      .object({ current: z.string().min(1), next: passwordSchema, confirm: z.string() })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
    if (parsed.data.next !== parsed.data.confirm) return { error: 'The two new passwords do not match.' };

    const result = changePassword(user.id, parsed.data.current, parsed.data.next);
    if (!result.ok) return { error: result.error ?? 'Could not change the password.' };

    const keep = await currentSessionId();
    if (keep) revokeOtherSessions(user.id, keep);
    notify({
      userId: user.id,
      kind: 'security_event',
      title: 'Your password was changed',
      body: 'All other signed-in devices were signed out. If this was not you, change it again immediately.',
      href: '/settings/security',
    });
    revalidatePath('/settings/security');
    return { ok: 'Password changed. Every other signed-in device has been signed out.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function revokeSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const sessionId = String(formData.get('sessionId') ?? '');
    const current = await currentSessionId();
    if (sessionId === current) {
      await endSession();
      redirect('/login');
    }
    revokeSession(user.id, sessionId);
    revalidatePath('/settings/security');
    return { ok: 'That device has been signed out.' };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function revokeOtherSessionsAction(_prev?: ActionState): Promise<ActionState> {
  try {
    const user = await requireUser();
    const keep = await currentSessionId();
    if (keep) revokeOtherSessions(user.id, keep);
    revalidatePath('/settings/security');
    return { ok: 'Every other device has been signed out.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const raw = Object.fromEntries(formData);
    const language = String(raw.language ?? 'en');
    const parsed = z
      .object({
        textScale: z.enum(['normal', 'large', 'xlarge']),
        theme: z.enum(['system', 'light', 'dark']),
        retentionDays: z.coerce.number().int().min(0).max(3650),
      })
      .safeParse(raw);
    if (!parsed.success || !isLang(language)) return { error: 'Those settings are not valid.' };

    run(
      `UPDATE user_settings SET language = ?, text_scale = ?, theme = ?, reduce_motion = ?, retention_days = ?,
              notify_reviews = ?, notify_invitations = ?, notify_security = ?, updated_at = ?
         WHERE user_id = ?`,
      language,
      parsed.data.textScale,
      parsed.data.theme,
      raw.reduceMotion ? 1 : 0,
      parsed.data.retentionDays,
      raw.notifyReviews ? 1 : 0,
      raw.notifyInvitations ? 1 : 0,
      1, // security notifications are always on
      now(),
      user.id,
    );
    // Saving preferences is the last onboarding step, so it also completes onboarding.
    run(
      'UPDATE user_settings SET onboarding_done_at = COALESCE(onboarding_done_at, ?), onboarding_step = 6 WHERE user_id = ?',
      now(), user.id,
    );
    audit(user.id, 'settings.updated');
    revalidatePath('/', 'layout');
    if (String(formData.get('finishOnboarding') ?? '') === '1') redirect('/dashboard');
    return { ok: 'Settings saved.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const name = z.string().trim().min(1).max(80).safeParse(formData.get('displayName'));
    if (!name.success) return { error: 'Enter a name between 1 and 80 characters.' };
    run('UPDATE user SET display_name = ?, updated_at = ? WHERE id = ?', name.data, now(), user.id);
    audit(user.id, 'profile.updated');
    revalidatePath('/settings');
    return { ok: 'Profile updated.' };
  } catch (err) {
    return toActionError(err);
  }
}

/**
 * Development-only entitlement simulation. Records itself as a simulation so no part
 * of the system can later mistake it for a real purchase. No transaction is created.
 */
export async function setPlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const plan = z.enum(['free', 'family']).safeParse(formData.get('plan'));
    if (!plan.success) return { error: 'Unknown plan.' };
    const family = plan.data === 'family';
    run(
      `UPDATE subscription_entitlement
          SET plan = ?, source = 'dev_simulation', max_members = ?, max_reviewers = ?, history_limit = ?, updated_at = ?
        WHERE user_id = ?`,
      plan.data, family ? 5 : 2, family ? 3 : 1, family ? 500 : 25, now(), user.id,
    );
    audit(user.id, 'entitlement.simulated', 'subscription_entitlement', user.id, plan.data);
    revalidatePath('/settings/privacy');
    return { ok: `Entitlements switched to ${plan.data} for development. No payment was taken and no transaction exists.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (String(formData.get('confirmEmail') ?? '').trim().toLowerCase() !== user.email.toLowerCase()) {
      return { error: 'Type your email address exactly to confirm deletion.' };
    }
    const password = String(formData.get('password') ?? '');
    if (!verifyCredentials(user.email, password)) return { error: 'That password is not correct.' };
    deleteAccount(user.id);
    await endSession();
    redirect('/?deleted=1');
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}
