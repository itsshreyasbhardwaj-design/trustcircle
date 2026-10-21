import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldQuestion } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { listReviewsAskedOfMe, listReviewsIOwn, STATE_LABEL, VERDICTS } from '@/lib/reviews';
import { Badge, ButtonLink, Card, EmptyState, SectionTitle, Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Second opinions' };

function ReviewList({
  rows,
  perspective,
}: {
  rows: ReturnType<typeof listReviewsIOwn>;
  perspective: 'mine' | 'asked';
}) {
  if (rows.length === 0) return null;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/reviews/${r.id}`} className="tc-tap block rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--accent)]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  r.state === 'closed' || r.state === 'cancelled'
                    ? 'neutral'
                    : r.state === 'more_info_requested'
                      ? 'caution'
                      : 'accent'
                }
              >
                {STATE_LABEL[r.state]}
              </Badge>
              {r.share_content === 0 && <Badge>Findings only</Badge>}
              <span className="text-sm text-[var(--fg-muted)]">
                {perspective === 'mine' ? `${r.reviewer_count} reviewer${r.reviewer_count === 1 ? '' : 's'}` : `from ${r.owner_name}`}
              </span>
              <span className="ml-auto text-xs text-[var(--fg-subtle)]">
                {new Date(r.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm">{r.question}</p>
            <p className="mt-1.5 text-xs text-[var(--fg-subtle)]">
              {r.responded_count}/{r.reviewer_count} replied · {r.comment_count} comment{r.comment_count === 1 ? '' : 's'}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ReviewsPage() {
  const user = await requireUser();
  const mine = listReviewsIOwn(user.id);
  const asked = listReviewsAskedOfMe(user.id);

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="FamilyShield"
        title="Second opinions"
        lead="Requests you have sent, and requests people have sent you. Each one covers a single case."
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Asked of you</h2>
        {asked.length === 0 ? (
          <EmptyState
            icon={<ShieldQuestion className="h-5 w-5" aria-hidden />}
            title="Nobody has asked you yet"
            body="When someone in your circle shares a case with you, it appears here. Until then you can see nothing of theirs."
          />
        ) : (
          <ReviewList rows={asked} perspective="asked" />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">You asked</h2>
        {mine.length === 0 ? (
          <EmptyState
            title="You have not asked anyone yet"
            body="Open any of your checks and send it for a second opinion. You choose who sees it and whether they see the message itself."
            action={<ButtonLink href="/history">Pick a case</ButtonLink>}
          />
        ) : (
          <ReviewList rows={mine} perspective="mine" />
        )}
      </section>

      <Card>
        <h2 className="font-semibold">What a reviewer can say</h2>
        <ul className="mt-3 space-y-2">
          {Object.values(VERDICTS).map((v) => (
            <li key={v} className="ml-5 list-disc text-sm text-[var(--fg-muted)]">&ldquo;{v}&rdquo;</li>
          ))}
        </ul>
        <Alert tone="info" className="mt-4">
          There is no &ldquo;this is safe&rdquo; response, for anyone. A trusted contact can raise a concern or
          recommend verifying — they cannot clear something, and the product will not pretend otherwise.
        </Alert>
      </Card>
    </div>
  );
}
