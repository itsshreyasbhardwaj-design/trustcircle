import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { getReview, STATE_LABEL, VERDICTS, canTransition, type ReviewState } from '@/lib/reviews';
import { getScan } from '@/lib/scans';
import { commentAction, revokeSharingAction, setReviewStateAction } from '@/app/actions/reviews';
import { ActionButton, ActionForm } from '@/components/forms';
import {
  Alert, Badge, ButtonLink, Card, Field, Notice, SectionTitle, Select, SubmittedContent, Textarea,
} from '@/components/ui';
import { FindingList, OutcomeBanner } from '@/components/findings';
import { OUTCOME_COPY, NEVER_A_GUARANTEE, type Outcome } from '@/lib/analysis/types';

export const metadata: Metadata = { title: 'Second opinion' };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const detail = getReview(user.id, id);
  if (!detail) notFound();

  const { review, role, participants, comments, myVerdict } = detail;
  // The shared case is fetched through the same authorisation path as anywhere else,
  // so a reviewer sees exactly what the grant allows and nothing more.
  const scan = review.scan_case_id ? getScan(user.id, review.scan_case_id) : null;
  const state = review.state as ReviewState;
  const isOpen = state !== 'closed' && state !== 'cancelled';

  const ownerTransitions = (['awaiting_review', 'reviewed', 'closed', 'cancelled'] as ReviewState[]).filter((s) =>
    canTransition(state, s, 'owner'),
  );

  return (
    <div className="space-y-6">
      <Link href="/reviews" className="tc-tap inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Second opinions
      </Link>

      <SectionTitle
        eyebrow={role === 'owner' ? 'You asked' : `${review.owner_name} asked you`}
        title={review.question}
        lead={`Created ${new Date(review.created_at).toLocaleString('en-IN')}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={state === 'more_info_requested' ? 'caution' : isOpen ? 'accent' : 'neutral'}>{STATE_LABEL[state]}</Badge>
        <Badge>{review.share_content ? 'Message shared' : 'Findings only'}</Badge>
        <Badge>{review.responded_count}/{review.reviewer_count} replied</Badge>
      </div>

      {!isOpen && (
        <Alert tone="info" title={state === 'closed' ? 'This review is closed' : 'This review was cancelled'}>
          The access it created has been withdrawn. Reviewers can no longer open the case.
        </Alert>
      )}

      {scan ? (
        <>
          <OutcomeBanner
            outcome={scan.scan.outcome as Outcome}
            headline={scan.scan.headline}
            summary={OUTCOME_COPY[scan.scan.outcome as Outcome].summary}
            disclaimer={NEVER_A_GUARANTEE}
          />
          <section>
            <h2 className="mb-3 text-lg font-semibold">What the rules matched</h2>
            <FindingList findings={scan.findings} showExcerpts={scan.scope === 'findings_and_content'} />
          </section>
          {scan.content !== null ? (
            <Card>
              <h2 className="font-semibold">The content</h2>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">Plain text. Links are deliberately not clickable.</p>
              <div className="mt-3"><SubmittedContent text={scan.content} /></div>
            </Card>
          ) : (
            <Alert tone="info" title="The message itself was not shared">
              You have the findings only. If you need the wording to judge it, ask below and the owner can
              reply — or they can share the content and re-send.
            </Alert>
          )}
          <p className="text-sm">
            <Link href={`/scan/results/${scan.scan.id}`} className="text-[var(--accent)] underline">
              Open the full case →
            </Link>
          </p>
        </>
      ) : (
        <Alert tone="caution" title="The case is no longer available">
          It was deleted by its owner, or sharing was withdrawn. The conversation below is kept so you can see
          what was said.
        </Alert>
      )}

      <Card>
        <h2 className="font-semibold">Reviewers</h2>
        <ul className="mt-3 space-y-2">
          {participants.map((p) => (
            <li key={p.user_id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{p.display_name}{p.user_id === user.id && <span className="ml-1.5 text-xs text-[var(--fg-subtle)]">(you)</span>}</span>
              {p.verdict ? (
                <Badge tone={p.verdict === 'see_warning_signs' ? 'high' : 'caution'}>{VERDICTS[p.verdict]}</Badge>
              ) : (
                <Badge>No reply yet</Badge>
              )}
              {p.responded_at && (
                <span className="ml-auto text-xs text-[var(--fg-subtle)]">{new Date(p.responded_at).toLocaleString('en-IN')}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-4.5 w-4.5 text-[var(--accent)]" aria-hidden /> Conversation
        </h2>
        {comments.length === 0 ? (
          <Notice>No comments yet.</Notice>
        ) : (
          <ol className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{c.author_name}</span>
                  {c.verdict && <Badge tone={c.verdict === 'see_warning_signs' ? 'high' : 'caution'}>{VERDICTS[c.verdict]}</Badge>}
                  <span className="ml-auto text-xs text-[var(--fg-subtle)]">{new Date(c.created_at).toLocaleString('en-IN')}</span>
                </div>
                <p className="tc-content mt-2 text-sm text-[var(--fg-muted)]">{c.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {isOpen && (
        <Card>
          <h2 className="font-semibold">{role === 'reviewer' ? 'Give your view' : 'Add information'}</h2>
          {role === 'reviewer' && myVerdict && (
            <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
              You already answered &ldquo;{VERDICTS[myVerdict]}&rdquo;. You can add more or change it.
            </p>
          )}
          <div className="mt-4">
            <ActionForm action={commentAction} submitLabel="Send" pendingLabel="Sending…" resetOnSuccess>
              <input type="hidden" name="reviewId" value={id} />
              {role === 'reviewer' && (
                <Field
                  label="Your view"
                  htmlFor="verdict"
                  hint="There is no option to mark something safe — a second opinion can raise a concern or recommend verifying, not clear it."
                >
                  <Select id="verdict" name="verdict" defaultValue="">
                    <option value="">Comment only, no view yet</option>
                    {Object.entries(VERDICTS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Comment" htmlFor="body" required>
                <Textarea
                  id="body"
                  name="body"
                  required
                  maxLength={4000}
                  className="min-h-24"
                  placeholder={role === 'reviewer' ? 'What do you notice? What would you check?' : 'Anything else they should know.'}
                />
              </Field>
            </ActionForm>
          </div>
        </Card>
      )}

      {role === 'owner' && (
        <Card tone="sunken">
          <h2 className="font-semibold">Manage this request</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {ownerTransitions.map((s) => (
              <ActionButton
                key={s}
                action={setReviewStateAction}
                label={
                  s === 'closed' ? 'Close and withdraw access'
                  : s === 'cancelled' ? 'Cancel request'
                  : s === 'awaiting_review' ? 'Send back for review'
                  : `Mark ${STATE_LABEL[s].toLowerCase()}`
                }
                tone={s === 'cancelled' ? 'danger' : 'secondary'}
                fields={{ reviewId: id, state: s }}
                confirm={
                  s === 'closed' || s === 'cancelled'
                    ? 'This also withdraws the access this request created. Continue?'
                    : undefined
                }
              />
            ))}
            {isOpen && (
              <ActionButton
                action={revokeSharingAction}
                label="Withdraw access now, keep the request open"
                tone="danger"
                fields={{ reviewId: id }}
                confirm="Withdraw access to the shared case? Reviewers keep the conversation but can no longer open the case."
              />
            )}
          </div>
          <Notice>
            Withdrawal is enforced on the server. The next time a reviewer tries to open the case, it is
            refused — it is not merely hidden from their interface.
          </Notice>
          <ButtonLink href="/settings/privacy" tone="ghost" className="mt-3">See everything you have shared</ButtonLink>
        </Card>
      )}
    </div>
  );
}
