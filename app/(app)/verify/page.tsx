import type { Metadata } from 'next';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { listChecklists } from '@/lib/verification';
import { startChecklistAction } from '@/app/actions/scan';
import { ActionForm } from '@/components/forms';
import { Badge, Card, EmptyState, Field, Notice, SectionTitle, Select } from '@/components/ui';
import { CLAIM_LABEL } from '@/lib/analysis/claim';
import { selfSourcedChannels } from '@/lib/data/directory';

export const metadata: Metadata = { title: 'Verify a claim' };

export default async function VerifyPage() {
  const user = await requireUser();
  const checklists = listChecklists(user.id);
  const open = checklists.filter((c) => !c.completed_at);
  const done = checklists.filter((c) => c.completed_at);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="VerifyPath"
        title="Verify a claim independently"
        lead="Findings tell you something looks wrong. This tells you how to find out the truth — through a channel you already had, never the one in the message."
      />

      <Card>
        <h2 className="font-semibold">Start a new checklist</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Pick what the message claims to be about. You can also start one directly from any check result.
        </p>
        <div className="mt-4">
          <ActionForm action={startChecklistAction} submitLabel="Create checklist" pendingLabel="Creating…">
            <Field label="What is this about?" htmlFor="claimType" required>
              <Select id="claimType" name="claimType" defaultValue="unknown" required>
                {Object.entries(CLAIM_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </Field>
          </ActionForm>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">The channels TrustCircle will point you to</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Every one of these existed before the message arrived. That is the whole point.
        </p>
        <ul className="mt-4 space-y-2.5">
          {selfSourcedChannels.map((c) => (
            <li key={c.slug} className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
              <p className="text-sm font-medium">{c.label}</p>
              <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{c.why}</p>
            </li>
          ))}
        </ul>
        <Notice>
          A phone number, link or QR code inside the content you are checking is never offered as a
          verification channel. It routes back to whoever sent it.
        </Notice>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">In progress</h2>
        {open.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-5 w-5" aria-hidden />}
            title="No checklist in progress"
            body="Start one above, or create one from a check result so it carries the context with it."
          />
        ) : (
          <ul className="space-y-2.5">
            {open.map((c) => (
              <li key={c.id}>
                <Link href={`/verify/${c.id}`} className="tc-tap block rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--accent)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{c.done}/{c.total} done</Badge>
                    <Badge>{CLAIM_LABEL[c.claim_type]}</Badge>
                    <span className="ml-auto text-xs text-[var(--fg-subtle)]">{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{c.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Completed</h2>
          <ul className="space-y-2.5">
            {done.map((c) => (
              <li key={c.id}>
                <Link href={`/verify/${c.id}`} className="tc-tap block rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>All {c.total} steps done</Badge>
                    <span className="ml-auto text-xs text-[var(--fg-subtle)]">
                      {new Date(c.completed_at!).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{c.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
