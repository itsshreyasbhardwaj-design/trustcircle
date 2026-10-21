import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { getScan } from '@/lib/scans';
import { possibleReviewers } from '@/lib/family';
import { all } from '@/lib/db';
import { officialResources } from '@/lib/data/directory';
import { OUTCOME_COPY, NEVER_A_GUARANTEE, type Outcome } from '@/lib/analysis/types';
import { CLAIM_LABEL } from '@/lib/analysis/claim';
import { createReviewAction } from '@/app/actions/reviews';
import { deleteScanAction, recheckScanAction, startChecklistAction } from '@/app/actions/scan';
import { ActionButton, ActionForm } from '@/components/forms';
import {
  Alert, Badge, ButtonLink, Card, Checkbox, Field, Notice, SubmittedContent, Textarea,
} from '@/components/ui';
import { EngineNote, FindingList, OutcomeBanner, VerificationPlanPanel } from '@/components/findings';
import { t, type Lang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Check result' };

export default async function ScanResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const detail = getScan(user.id, id);
  if (!detail) notFound();

  const lang = getSettings(user.id).language as Lang;
  const { scan, findings, content, plan, isOwner, scope, redactionCount } = detail;
  const outcome = scan.outcome as Outcome;
  const reviewers = isOwner ? possibleReviewers(user.id) : [];

  const existingReviews = isOwner
    ? all<{ id: string; state: string }>(
        'SELECT id, state FROM review_request WHERE scan_case_id = ? AND owner_user_id = ?',
        id,
        user.id,
      )
    : [];

  const reporting = officialResources.filter((r) =>
    outcome === 'warning_signs' ? !r.tags.includes('bank_escalation') : r.tags.includes('telecom_fraud'),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={isOwner ? '/history' : '/reviews'} className="tc-tap inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
          <ArrowLeft className="h-4 w-4" aria-hidden /> {isOwner ? 'My checks' : 'Second opinions'}
        </Link>
        <span className="ml-auto text-xs text-[var(--fg-subtle)]">
          {new Date(scan.created_at).toLocaleString('en-IN')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{scan.kind}</Badge>
        {scan.claim_type && <Badge>{CLAIM_LABEL[scan.claim_type as keyof typeof CLAIM_LABEL]}</Badge>}
        {scan.is_demo === 1 && <Badge tone="accent">Fictional demo data</Badge>}
        {!isOwner && (
          <Badge tone="caution">
            {scope === 'findings' ? <><EyeOff className="h-3.5 w-3.5" aria-hidden /> Findings only</> : <><Eye className="h-3.5 w-3.5" aria-hidden /> Shared with you</>}
          </Badge>
        )}
        {scan.expires_at && (
          <Badge>Auto-deletes {new Date(scan.expires_at).toLocaleDateString('en-IN')}</Badge>
        )}
      </div>

      <OutcomeBanner
        outcome={outcome}
        headline={scan.headline}
        summary={OUTCOME_COPY[outcome].summary}
        disclaimer={NEVER_A_GUARANTEE}
      />

      {redactionCount > 0 && (
        <Alert tone="caution" title={`${redactionCount} sensitive value${redactionCount === 1 ? '' : 's'} removed before saving`}>
          TrustCircle found something in this content that should never be stored — a code, PIN, card number or
          identity number — and removed it. If it was live, treat it as exposed: do not use it, and do not
          forward this content to anyone.
        </Alert>
      )}

      {!isOwner && scope === 'findings' && (
        <Alert tone="info" title="You were given the findings, not the message">
          The person who shared this chose not to include the content itself. You can still comment on what the
          rules found, and ask them for more if you need it.
        </Alert>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">What the rules matched</h2>
        <FindingList findings={findings} showExcerpts={scope === 'findings_and_content'} />
      </section>

      <EngineNote />

      {content !== null && (
        <Card>
          <h2 className="font-semibold">The content that was checked</h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Shown as plain text. Any link in it is deliberately not clickable.
          </p>
          <div className="mt-3">
            <SubmittedContent text={content} />
          </div>

          {isOwner && (scan.kind === 'image' || scan.kind === 'qr') && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-[var(--accent)]">
                Correct the extracted text and check again
              </summary>
              <div className="mt-3">
                <ActionForm action={recheckScanAction} submitLabel="Re-check with my corrections" submitTone="secondary">
                  <input type="hidden" name="scanId" value={scan.id} />
                  <Field
                    label="Corrected text"
                    htmlFor="recheck"
                    hint="Text extraction makes mistakes. Fixing them changes what the rules can see, so the findings above will be replaced."
                  >
                    <Textarea id="recheck" name="content" defaultValue={content} required maxLength={20000} />
                  </Field>
                </ActionForm>
              </div>
            </details>
          )}
        </Card>
      )}

      <VerificationPlanPanel plan={plan} />

      {isOwner && (
        <Card>
          <h2 className="font-semibold">Save this as a checklist you can tick off</h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            Keeps your place across the steps above and records what you found at each one.
          </p>
          <div className="mt-4">
            <ActionButton
              action={startChecklistAction}
              label="Create verification checklist"
              fields={{ claimType: scan.claim_type ?? 'unknown', scanId: scan.id }}
            />
          </div>
        </Card>
      )}

      {isOwner && (
        <Card>
          <h2 className="font-semibold">{t(lang, 'action.askFamily').text}</h2>
          {existingReviews.length > 0 && (
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              You have already asked about this case.{' '}
              <Link href={`/reviews/${existingReviews[0]!.id}`} className="text-[var(--accent)] underline">
                Open that request →
              </Link>
            </p>
          )}
          {reviewers.length === 0 ? (
            <div className="mt-3">
              <p className="text-sm text-[var(--fg-muted)]">
                You are not in a circle with anyone yet. A circle is just the group of people you can ask —
                joining one gives them no access to anything.
              </p>
              <ButtonLink href="/family" tone="secondary" className="mt-4">Set up a circle</ButtonLink>
            </div>
          ) : (
            <div className="mt-4">
              <ActionForm action={createReviewAction} submitLabel="Send for a second opinion" pendingLabel="Sending…">
                <input type="hidden" name="scanId" value={scan.id} />
                <Field label="What do you want them to look at?" htmlFor="question" required>
                  <Textarea
                    id="question"
                    name="question"
                    required
                    maxLength={1000}
                    className="min-h-20"
                    placeholder="e.g. Papa got this just now. Does the link look wrong to you?"
                  />
                </Field>
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-sm font-medium">Who should see it?</legend>
                  {reviewers.map((r) => (
                    <Checkbox
                      key={r.user_id}
                      name="reviewerIds"
                      value={r.user_id}
                      label={r.display_name}
                      hint={`${r.email} · ${r.circle_name}`}
                    />
                  ))}
                </fieldset>
                <Checkbox
                  name="shareContent"
                  value="1"
                  label="Also share the message itself, not just the findings"
                  hint="Leave this off to share only what the rules found. You can share the content later if they ask for it."
                />
                <Notice>
                  This shares exactly this one case. It gives nobody access to your other checks, your history,
                  or anything else, and you can withdraw it at any time.
                </Notice>
              </ActionForm>
            </div>
          )}
        </Card>
      )}

      {reporting.length > 0 && (
        <Card>
          <h2 className="font-semibold">
            {outcome === 'warning_signs' ? 'Where to report this' : 'If you want to report it anyway'}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            TrustCircle cannot report anything for you — there is no integration with any authority. These are
            the channels, with the date each was last checked.
          </p>
          <ul className="mt-4 space-y-3">
            {reporting.map((r) => (
              <li key={r.slug} className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
                <p className="font-medium">{r.organisation}</p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{r.useWhen}</p>
                <p className="mt-1.5 text-sm">{r.phone ? `Phone ${r.phone}` : r.website}</p>
                <p className="mt-1.5 text-xs text-[var(--fg-subtle)]">Last checked {r.checkedOn}</p>
              </li>
            ))}
          </ul>
          <ButtonLink href="/recovery" tone="secondary" className="mt-4">
            Already lost money? Open the recovery guide
          </ButtonLink>
        </Card>
      )}

      {isOwner && (
        <Card tone="sunken">
          <h2 className="font-semibold">Delete this case</h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            Removes the content, the findings, the excerpts and any sharing attached to it. This cannot be undone.
          </p>
          <div className="mt-4">
            <ActionButton
              action={deleteScanAction}
              label="Delete permanently"
              tone="danger"
              fields={{ scanId: scan.id }}
              confirm="Delete this case permanently? Anyone it was shared with will lose access immediately."
            />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--fg-subtle)]">
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Deleted cases are removed from the database, not hidden.
          </p>
        </Card>
      )}
    </div>
  );
}
