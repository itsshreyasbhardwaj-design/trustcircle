'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { rateLimit } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { createScan, deleteAllScans, deleteScan, recheckScan } from '@/lib/scans';
import { createChecklist } from '@/lib/verification';
import { demoCases } from '@/lib/data/demo';
import { toActionError, type ActionState } from '@/lib/actions-shared';
import type { ScanKind } from '@/lib/analysis';

const MAX_CONTENT = 20_000;

async function guard(userId: string): Promise<string | null> {
  return rateLimit(`scan:${userId}`, 60, 60_000)
    ? null
    : 'That is a lot of checks in one minute. Pause for a moment and try again.';
}

async function runScan(kind: ScanKind, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const limited = await guard(user.id);
  if (limited) return { error: limited };

  const content = String(formData.get('content') ?? '').slice(0, MAX_CONTENT);
  if (!content.trim()) {
    return { error: kind === 'url' ? 'Paste the web address you want checked.' : 'Paste the content you want checked.' };
  }

  const payment =
    kind === 'payment'
      ? {
          claimedPayee: String(formData.get('claimedPayee') ?? '').slice(0, 200) || undefined,
          amountRupees: String(formData.get('amountRupees') ?? '').slice(0, 20) || undefined,
          reason: String(formData.get('reason') ?? '').slice(0, 1000) || undefined,
          channel: String(formData.get('channel') ?? '').slice(0, 100) || undefined,
        }
      : undefined;

  const { scanId } = createScan(user.id, { kind, content, payment });
  revalidatePath('/dashboard');
  revalidatePath('/history');
  redirect(`/scan/results/${scanId}`);
}

export async function scanTextAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await runScan('text', formData);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function scanUrlAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await runScan('url', formData);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

/** The screenshot never arrives here — only the text the user confirmed from their own browser. */
export async function scanImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await runScan('image', formData);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function scanQrAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await runScan('qr', formData);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function scanPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const limited = await guard(user.id);
    if (limited) return { error: limited };

    const fields = {
      content: String(formData.get('content') ?? '').slice(0, MAX_CONTENT),
      claimedPayee: String(formData.get('claimedPayee') ?? '').slice(0, 200),
      amountRupees: String(formData.get('amountRupees') ?? '').slice(0, 20),
      reason: String(formData.get('reason') ?? '').slice(0, 1000),
      channel: String(formData.get('channel') ?? '').slice(0, 100),
    };
    if (!fields.content.trim() && !fields.reason.trim() && !fields.claimedPayee.trim()) {
      return { error: 'Describe the payment request, or paste the UPI link or QR text.' };
    }
    const { scanId } = createScan(user.id, {
      kind: 'payment',
      content: fields.content || fields.reason,
      payment: {
        claimedPayee: fields.claimedPayee || undefined,
        amountRupees: fields.amountRupees || undefined,
        reason: fields.reason || undefined,
        channel: fields.channel || undefined,
      },
    });
    revalidatePath('/dashboard');
    redirect(`/scan/results/${scanId}`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function recheckScanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const scanId = String(formData.get('scanId') ?? '');
    const content = String(formData.get('content') ?? '').slice(0, MAX_CONTENT);
    if (!content.trim()) return { error: 'The corrected text cannot be empty.' };
    recheckScan(user.id, scanId, content);
    revalidatePath(`/scan/results/${scanId}`);
    return { ok: 'Re-checked with your corrected text. The findings below are updated.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteScanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    deleteScan(user.id, String(formData.get('scanId') ?? ''));
    revalidatePath('/history');
    revalidatePath('/dashboard');
    redirect('/history?deleted=1');
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

export async function deleteAllScansAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (String(formData.get('confirm') ?? '').trim().toUpperCase() !== 'DELETE') {
      return { error: 'Type DELETE to confirm.' };
    }
    const n = deleteAllScans(user.id);
    revalidatePath('/history');
    revalidatePath('/dashboard');
    return { ok: `Deleted ${n} saved check${n === 1 ? '' : 's'}, including their findings and any sharing attached to them.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function startChecklistAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const claimType = z
      .enum(['bank', 'delivery', 'payment', 'support', 'job', 'shopping', 'utility', 'acquaintance', 'institution', 'unknown'])
      .safeParse(formData.get('claimType'));
    if (!claimType.success) return { error: 'Pick what this is about first.' };
    const scanId = String(formData.get('scanId') ?? '') || null;
    const checklistId = createChecklist(user.id, claimType.data, scanId);
    revalidatePath('/verify');
    redirect(`/verify/${checklistId}`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return toActionError(err);
  }
}

/**
 * Explicit, user-initiated demo import. Fictional cases are never placed in an
 * account without this being run, and every imported case is flagged as demo data.
 */
export async function importDemoAction(_prev: ActionState): Promise<ActionState> {
  try {
    const user = await requireUser();
    for (const demo of demoCases) {
      createScan(user.id, { kind: demo.kind, content: demo.content, payment: demo.payment }, { isDemo: true });
    }
    revalidatePath('/history');
    revalidatePath('/dashboard');
    return { ok: `Imported ${demoCases.length} clearly-labelled fictional cases into your history. You can delete them at any time.` };
  } catch (err) {
    return toActionError(err);
  }
}
