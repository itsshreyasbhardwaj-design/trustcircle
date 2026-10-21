import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { getChecklist } from '@/lib/verification';
import { buildVerificationPlan } from '@/lib/analysis/verify';
import { toggleStepAction, deleteChecklistAction } from '@/app/actions/verify';
import { ActionButton, ActionForm } from '@/components/forms';
import { Alert, Badge, ButtonLink, Card, Field, Input, SectionTitle } from '@/components/ui';
import { CLAIM_LABEL } from '@/lib/analysis/claim';

export const metadata: Metadata = { title: 'Verification checklist' };

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = getChecklist(user.id, id);
  if (!data) notFound();

  const { checklist, steps } = data;
  const plan = buildVerificationPlan(checklist.claim_type);

  return (
    <div className="space-y-6">
      <Link href="/verify" className="tc-tap inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All checklists
      </Link>

      <SectionTitle eyebrow={CLAIM_LABEL[checklist.claim_type]} title={checklist.title} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={checklist.completed_at ? 'neutral' : 'accent'}>{checklist.done}/{checklist.total} done</Badge>
        {checklist.scan_case_id && (
          <Link href={`/scan/results/${checklist.scan_case_id}`} className="text-sm text-[var(--accent)] underline">
            Open the case this came from →
          </Link>
        )}
      </div>

      {checklist.completed_at && (
        <Alert tone="info" title="You worked through every step">
          Completing this checklist does not mean the content was genuine or fake. It means you verified the
          claim through a channel of your own — which is the only thing that settles it.
        </Alert>
      )}

      <Card>
        <h2 className="font-semibold">What remains unverified</h2>
        <ul className="mt-3 space-y-1.5">
          {plan.unverified.map((u) => (
            <li key={u} className="ml-5 list-disc text-sm text-[var(--fg-muted)]">{u}</li>
          ))}
        </ul>
      </Card>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className={`rounded-xl border p-4 ${step.done_at ? 'border-[var(--border)] bg-[var(--bg-sunken)]' : 'border-[var(--border-strong)] bg-[var(--bg-raised)]'}`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done_at ? 'bg-[var(--color-teal-600)] text-white' : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                }`}
              >
                {step.done_at ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${step.done_at ? 'text-[var(--fg-muted)] line-through decoration-1' : ''}`}>
                  {step.instruction}
                </p>
                {step.detail && <p className="mt-1 text-sm text-[var(--fg-muted)]">{step.detail}</p>}
                {step.outcome_note && (
                  <p className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-2.5 text-sm">
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--fg-subtle)]">What you found: </span>
                    <span className="tc-content">{step.outcome_note}</span>
                  </p>
                )}
                <div className="mt-3">
                  {step.done_at ? (
                    <ActionButton
                      action={toggleStepAction}
                      label="Mark as not done"
                      tone="ghost"
                      fields={{ stepId: step.id, done: '0', checklistId: id }}
                    />
                  ) : (
                    <ActionForm action={toggleStepAction} submitLabel="Mark as done" submitTone="secondary" className="space-y-2">
                      <input type="hidden" name="stepId" value={step.id} />
                      <input type="hidden" name="done" value="1" />
                      <input type="hidden" name="checklistId" value={id} />
                      <Field label="What did you find? (optional)" htmlFor={`note-${step.id}`}>
                        <Input id={`note-${step.id}`} name="note" maxLength={500} placeholder="e.g. No such order in the app" />
                      </Field>
                    </ActionForm>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <Card>
        <h2 className="font-semibold">Do not share, whatever the reason given</h2>
        <ul className="mt-3 space-y-1.5">
          {plan.doNotShare.map((d) => (
            <li key={d} className="ml-5 list-disc text-sm text-[var(--fg-muted)]">{d}</li>
          ))}
        </ul>
      </Card>

      <Card tone="sunken">
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            action={deleteChecklistAction}
            label="Delete this checklist"
            tone="danger"
            fields={{ checklistId: id }}
            confirm="Delete this checklist and the notes on it?"
          />
          <ButtonLink href="/recovery" tone="ghost">Something already went wrong?</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
