import type { Metadata } from 'next';
import Link from 'next/link';
import { LifeBuoy, Phone } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { listRecoveryCases, EVIDENCE_CHECKLIST } from '@/lib/recovery';
import { createRecoveryCaseAction } from '@/app/actions/recovery';
import { ActionForm } from '@/components/forms';
import { Alert, Badge, Card, EmptyState, Field, Input, Notice, SectionTitle, Textarea } from '@/components/ui';
import { officialResources, DIRECTORY_CHECKED_ON } from '@/lib/data/directory';

export const metadata: Metadata = { title: 'Need help after a suspicious transaction?' };

const STATUS_TONE: Record<string, 'accent' | 'caution' | 'neutral'> = {
  open: 'caution',
  reported: 'accent',
  resolved: 'neutral',
  closed: 'neutral',
};

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const cases = listRecoveryCases(user.id);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="RecoveryGuide"
        title="Need help after a suspicious transaction?"
        lead="The urgent steps come first. Do them before you organise anything, and before you run any scan."
      />

      {params.deleted && <Alert tone="info">That case and its attachments were deleted.</Alert>}

      {/* The urgent path is above everything else, deliberately not behind a scan. */}
      <div className="rounded-2xl border border-[var(--alert-border)] bg-[var(--alert-bg)] p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--alert-fg)]">
          <Phone className="h-5 w-5" aria-hidden /> If money has already left your account
        </h2>
        <ol className="mt-4 space-y-4">
          {[
            ['Call your bank now and report an unauthorised transaction.',
             'Ask them to freeze the beneficiary account and raise a dispute. Write down the reference number and the time of the call. Find the number on the back of your card or in your passbook — not in the message you received, and not from a search result.'],
            ['Call 1930, the national cyber financial fraud helpline.',
             'Have the transaction ID, the amount and the date in front of you. The earlier this call happens, the better the chance that funds still sitting in the receiving account can be held.'],
            ['File a written complaint at cybercrime.gov.in.',
             'Keep the acknowledgement number. You will need it for the bank dispute as well.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--alert-fg)] text-sm font-bold text-[var(--alert-bg)]">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-[var(--alert-fg)]">{title}</p>
                <p className="mt-1 text-sm text-[var(--alert-fg)] opacity-90">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 border-t border-current/20 pt-4 text-sm text-[var(--alert-fg)] opacity-90">
          TrustCircle cannot make any of these reports for you, and cannot promise that money is recovered.
          It has no integration with any bank, portal or authority. What it can do is keep your evidence in
          one place while you do it.
        </p>
      </div>

      <Card>
        <h2 className="font-semibold">Official channels</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Each entry records where it was checked and when. Directory last reviewed {DIRECTORY_CHECKED_ON}.
          Confirm details on the organisation&apos;s own site before relying on them.
        </p>
        <ul className="mt-4 space-y-3">
          {officialResources.map((r) => (
            <li key={r.slug} className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
              <p className="font-medium">{r.organisation}</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{r.what}</p>
              <p className="mt-2 text-sm"><strong>Use it when:</strong> {r.useWhen}</p>
              <p className="mt-2 text-sm font-medium">
                {r.phone ? `Phone ${r.phone}` : null}
                {r.phone && r.website ? ' · ' : null}
                {r.website ? <span className="font-mono text-xs">{r.website}</span> : null}
              </p>
              <ul className="mt-2.5 space-y-1">
                {r.limitations.map((l) => (
                  <li key={l} className="ml-5 list-disc text-xs text-[var(--fg-subtle)]">{l}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--fg-subtle)]">Source: {r.source}</p>
              <p className="text-xs text-[var(--fg-subtle)]">Last checked {r.checkedOn}</p>
            </li>
          ))}
        </ul>
        <Notice>
          Bank phone numbers are deliberately not listed here. A stale &ldquo;official&rdquo; number is exactly the
          failure this product exists to prevent, so TrustCircle tells you where to find yours instead: the
          back of your card, your passbook, or your own banking app.
        </Notice>
      </Card>

      <Alert tone="caution" title="Beware of recovery offers">
        Anyone who contacts you offering to recover your money for a fee is running a second scam, aimed
        specifically at people who have already lost money. Recovery happens through your bank and the
        official channels above, and they do not charge a percentage.
      </Alert>

      <Card>
        <h2 className="font-semibold">Start a case to keep the evidence together</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Private to you unless you choose to share it with someone in your circle.
        </p>
        <div className="mt-4">
          <ActionForm action={createRecoveryCaseAction} submitLabel="Create case" pendingLabel="Creating…">
            <Field label="Short name for this case" htmlFor="title" required>
              <Input id="title" name="title" required maxLength={200} placeholder="e.g. UPI debit after courier call" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount lost (₹)" htmlFor="lostRupees" hint="Leave blank if nothing was lost.">
                <Input id="lostRupees" name="lostRupees" inputMode="decimal" maxLength={20} />
              </Field>
              <Field label="When did it happen?" htmlFor="happenedAt">
                <Input id="happenedAt" name="happenedAt" type="datetime-local" />
              </Field>
            </div>
            <Field
              label="What happened, in your own words"
              htmlFor="notes"
              hint="Write it now while you remember the sequence. It will matter for the complaint."
            >
              <Textarea id="notes" name="notes" maxLength={5000} className="min-h-28" />
            </Field>
          </ActionForm>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Evidence worth collecting</h2>
        <ul className="mt-3 space-y-2.5">
          {EVIDENCE_CHECKLIST.map((e) => (
            <li key={e.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
              <p className="text-sm font-medium">{e.label}</p>
              <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{e.hint}</p>
            </li>
          ))}
        </ul>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Your cases</h2>
        {cases.length === 0 ? (
          <EmptyState
            icon={<LifeBuoy className="h-5 w-5" aria-hidden />}
            title="No cases"
            body="Nothing here unless you create it. If you are reading this page because something just happened, make the calls above first."
          />
        ) : (
          <ul className="space-y-2.5">
            {cases.map((c) => (
              <li key={c.id}>
                <Link href={`/recovery/${c.id}`} className="tc-tap block rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--accent)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                    {c.lost_amount_paise ? <Badge>₹{(c.lost_amount_paise / 100).toLocaleString('en-IN')}</Badge> : null}
                    <Badge>{c.evidence_count} item{c.evidence_count === 1 ? '' : 's'}</Badge>
                    <span className="ml-auto text-xs text-[var(--fg-subtle)]">{new Date(c.updated_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{c.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
