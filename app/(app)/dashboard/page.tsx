import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, AlertTriangle, BookOpen, Clock, Inbox, Users } from 'lucide-react';
import { getEntitlement, getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { all } from '@/lib/db';
import { countScans, listScans, outcomeCounts } from '@/lib/scans';
import { listCircles } from '@/lib/family';
import { listReviewsAskedOfMe, listReviewsIOwn, STATE_LABEL } from '@/lib/reviews';
import { listChecklists } from '@/lib/verification';
import { listNotifications } from '@/lib/notifications';
import { summary as academySummary } from '@/lib/academy';
import { lessons } from '@/lib/data/lessons';
import { t, pick, type Lang } from '@/lib/i18n';
import { Alert, Badge, BarRow, ButtonLink, Card, EmptyState, Stat } from '@/components/ui';
import { ScanTiles } from '@/components/scan-tiles';

export const metadata: Metadata = { title: 'Dashboard' };

const OUTCOME_LABEL: Record<string, string> = {
  warning_signs: 'Warning signs',
  verification_recommended: 'Verify further',
  insufficient_information: 'Not enough info',
  no_known_warning_signs: 'Nothing matched',
};

const timeAgo = (ms: number): string => {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 31 ? `${days} d ago` : new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = getSettings(user.id);
  const lang = settings.language as Lang;
  const entitlement = getEntitlement(user.id);

  const recent = listScans(user.id, { limit: 5 });
  const total = countScans(user.id);
  const counts = outcomeCounts(user.id);
  const circles = listCircles(user.id);
  const askedOfMe = listReviewsAskedOfMe(user.id);
  const myReviews = listReviewsIOwn(user.id);
  const checklists = listChecklists(user.id);
  const notifications = listNotifications(user.id, 6);
  const academy = academySummary(user.id);

  const needsMyReview = askedOfMe.filter((r) => ['awaiting_review', 'under_review', 'more_info_requested'].includes(r.state));
  const awaitingMe = myReviews.filter((r) => r.state === 'more_info_requested');
  const openChecklists = checklists.filter((c) => !c.completed_at);
  const maxCount = Math.max(1, ...Object.values(counts));

  // Permission-filtered activity: only this user's own audit rows are ever read.
  const activity = all<{ action: string; detail: string | null; created_at: number; resource_type: string | null; resource_id: string | null }>(
    'SELECT action, detail, created_at, resource_type, resource_id FROM audit_event WHERE actor_user_id = ? ORDER BY created_at DESC LIMIT 8',
    user.id,
  );

  const tipLesson = lessons[(Math.floor(Date.now() / 86_400_000) + user.id.charCodeAt(0)) % lessons.length]!;
  const tip = pick(lang, tipLesson.summary);

  return (
    <div className="space-y-8">
      {/* header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-base font-semibold text-[var(--accent)]"
          >
            {user.display_name.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Hello, {user.display_name.split(' ')[0]}</h1>
            <p className="text-sm text-[var(--fg-muted)]">
              {circles.length > 0 ? (
                <>
                  <Users className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  {circles[0]!.name} · {circles[0]!.member_count} member{circles[0]!.member_count === 1 ? '' : 's'}
                  {circles.length > 1 && ` · +${circles.length - 1} more`}
                </>
              ) : (
                'No circle yet'
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/scan/text">{t(lang, 'action.checkMessage').text}</ButtonLink>
          <ButtonLink href="/notifications" tone="secondary">
            <Inbox className="h-4 w-4" aria-hidden />
            Notifications
          </ButtonLink>
        </div>
      </header>

      <Alert tone="caution" title="Money already gone?">
        Call your bank, then 1930, before anything else. <Link href="/recovery">Open the recovery guide →</Link>
      </Alert>

      {/* quick scan */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Check something</h2>
        <ScanTiles lang={lang} />
      </section>

      {/* needs attention */}
      {(needsMyReview.length > 0 || awaitingMe.length > 0 || openChecklists.length > 0) && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-4.5 w-4.5 text-[var(--color-amber-500)]" aria-hidden />
            Needs attention
          </h2>
          <div className="space-y-2.5">
            {needsMyReview.map((r) => (
              <Link
                key={r.id}
                href={`/reviews/${r.id}`}
                className="tc-tap flex flex-wrap items-center gap-3 rounded-xl border border-[var(--caution-border)] bg-[var(--caution-bg)] p-4 text-sm"
              >
                <Badge tone="caution">{STATE_LABEL[r.state]}</Badge>
                <span className="min-w-0 flex-1 text-[var(--caution-fg)]">
                  <strong>{r.owner_name}</strong> asked for your second opinion
                </span>
                <span className="text-xs text-[var(--caution-fg)] opacity-80">{timeAgo(r.updated_at)}</span>
              </Link>
            ))}
            {awaitingMe.map((r) => (
              <Link key={r.id} href={`/reviews/${r.id}`} className="tc-tap flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 text-sm">
                <Badge tone="caution">More info requested</Badge>
                <span className="min-w-0 flex-1">A reviewer needs more from you on a case you shared</span>
                <span className="text-xs text-[var(--fg-subtle)]">{timeAgo(r.updated_at)}</span>
              </Link>
            ))}
            {openChecklists.slice(0, 3).map((c) => (
              <Link key={c.id} href={`/verify/${c.id}`} className="tc-tap flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 text-sm">
                <Badge>{c.done}/{c.total} done</Badge>
                <span className="min-w-0 flex-1">{c.title}</span>
                <span className="text-xs text-[var(--fg-subtle)]">{timeAgo(c.created_at)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* recent checks */}
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{t(lang, 'nav.history').text}</h2>
              {total > 0 && <Link href="/history" className="text-sm text-[var(--accent)] hover:underline">See all {total} →</Link>}
            </div>
            {recent.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-5 w-5" aria-hidden />}
                title="Nothing checked yet"
                body="Paste a message you are unsure about. Nothing is stored until you run a check, and you can delete any case afterwards."
                action={<ButtonLink href="/scan/text">{t(lang, 'action.pasteMessage').text}</ButtonLink>}
              />
            ) : (
              <ul className="space-y-2.5">
                {recent.map((scan) => (
                  <li key={scan.id}>
                    <Link
                      href={`/scan/results/${scan.id}`}
                      className="tc-tap block rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--accent)]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={scan.outcome === 'warning_signs' ? 'high' : scan.outcome === 'verification_recommended' ? 'caution' : 'neutral'}>
                          {OUTCOME_LABEL[scan.outcome]}
                        </Badge>
                        <Badge>{scan.kind}</Badge>
                        {scan.is_demo === 1 && <Badge tone="accent">Fictional demo</Badge>}
                        <span className="ml-auto text-xs text-[var(--fg-subtle)]">{timeAgo(scan.created_at)}</span>
                      </div>
                      <p className="mt-2 truncate text-sm text-[var(--fg-muted)]">{scan.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* family requests */}
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{t(lang, 'nav.reviews').text}</h2>
              <Link href="/reviews" className="text-sm text-[var(--accent)] hover:underline">Open →</Link>
            </div>
            {askedOfMe.length === 0 && myReviews.length === 0 ? (
              <EmptyState
                icon={<Users className="h-5 w-5" aria-hidden />}
                title="No second opinions yet"
                body="When you share a case with someone in your circle, it appears here for both of you. Nobody sees anything until you share it."
                action={<ButtonLink href="/family" tone="secondary">{t(lang, 'nav.family').text}</ButtonLink>}
              />
            ) : (
              <ul className="space-y-2.5">
                {[...askedOfMe, ...myReviews].slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link href={`/reviews/${r.id}`} className="tc-tap block rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--accent)]">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge>{STATE_LABEL[r.state]}</Badge>
                        <span className="text-[var(--fg-muted)]">
                          {r.owner_user_id === user.id ? 'You asked' : `${r.owner_name} asked you`}
                        </span>
                        <span className="ml-auto text-xs text-[var(--fg-subtle)]">{r.responded_count}/{r.reviewer_count} replied</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm">{r.question}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* stats */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Your checks</h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Saved" value={total} hint={`Limit ${entitlement.history_limit}`} />
              <Stat label="Retention" value={settings.retention_days === 0 ? '∞' : `${settings.retention_days}d`} hint="Set in privacy" />
            </div>
            {total > 0 && (
              <Card className="mt-3">
                <div className="space-y-3">
                  {Object.entries(OUTCOME_LABEL).map(([key, label]) => (
                    <BarRow
                      key={key}
                      label={label}
                      value={counts[key] ?? 0}
                      max={maxCount}
                      tone={key === 'warning_signs' ? 'high' : key === 'verification_recommended' ? 'caution' : 'info'}
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs text-[var(--fg-subtle)]">
                  Counts of your own saved checks. These are not detection statistics and say nothing about how
                  accurate the rules are.
                </p>
              </Card>
            )}
          </section>

          {/* tip */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-4.5 w-4.5 text-[var(--accent)]" aria-hidden />
              Safety tip
            </h2>
            <Card>
              <h3 className="font-medium">{pick(lang, tipLesson.title).value}</h3>
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{tip.value}</p>
              {!tip.translated && <Badge className="mt-2">{t(lang, 'label.untranslated').text}</Badge>}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ButtonLink href={`/academy/${tipLesson.slug}`} tone="secondary">Read the lesson</ButtonLink>
                <span className="text-xs text-[var(--fg-subtle)]">{academy.completed}/{academy.total} lessons done</span>
              </div>
            </Card>
          </section>

          {/* trusted circle */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">{t(lang, 'nav.family').text}</h2>
            {circles.length === 0 ? (
              <EmptyState
                title="No circle yet"
                body="A circle is the group you can ask for a second opinion. Joining one gives nobody access to your checks."
                action={<ButtonLink href="/family">Create a circle</ButtonLink>}
              />
            ) : (
              <ul className="space-y-2.5">
                {circles.map((c) => (
                  <li key={c.id}>
                    <Link href={`/family/${c.id}`} className="tc-tap flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--accent)]">
                      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                      <Badge>{c.role}</Badge>
                      <Badge>{c.member_count}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* activity */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Activity className="h-4.5 w-4.5 text-[var(--accent)]" aria-hidden />
              Recent activity
            </h2>
            <Card>
              {activity.length === 0 && notifications.length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)]">Nothing yet.</p>
              ) : (
                <ol className="space-y-2.5 text-sm">
                  {activity.map((a, i) => (
                    <li key={`${a.created_at}-${i}`} className="flex gap-3">
                      <span className="text-xs text-[var(--fg-subtle)] tabular-nums">{timeAgo(a.created_at)}</span>
                      <span className="min-w-0 flex-1 text-[var(--fg-muted)]">
                        <code className="text-xs">{a.action}</code>
                        {a.detail && <span className="ml-1.5 text-xs opacity-80">{a.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-4 text-xs text-[var(--fg-subtle)]">
                Your own account activity only. Other members&apos; checks never appear here, whatever circle
                you share.
              </p>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
