import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { getEntitlement, getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { countScans, listScans, outcomeCounts } from '@/lib/scans';
import { Alert, Badge, ButtonLink, Card, EmptyState, SectionTitle } from '@/components/ui';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'My checks' };

const PAGE = 20;

const LABEL: Record<string, string> = {
  warning_signs: 'Warning signs',
  verification_recommended: 'Verify further',
  insufficient_information: 'Not enough info',
  no_known_warning_signs: 'Nothing matched',
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outcome?: string; deleted?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const outcome = params.outcome && params.outcome in LABEL ? params.outcome : undefined;
  const lang = getSettings(user.id).language as Lang;
  const entitlement = getEntitlement(user.id);

  const scans = listScans(user.id, { limit: PAGE, offset: (page - 1) * PAGE, outcome });
  const total = countScans(user.id);
  const counts = outcomeCounts(user.id);
  const hasMore = scans.length === PAGE;

  const href = (p: number) => `/history?page=${p}${outcome ? `&outcome=${outcome}` : ''}`;

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="TrustScan"
        title={t(lang, 'nav.history').text}
        lead="Only you can see this list. Nobody in your circles can, whatever their role."
      />

      {params.deleted && <Alert tone="info">That case was deleted, along with its findings and any sharing attached to it.</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/history"
          className={`rounded-full border px-3 py-1.5 text-sm ${!outcome ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--fg-muted)]'}`}
        >
          All {total}
        </Link>
        {Object.entries(LABEL).map(([key, label]) => (
          <Link
            key={key}
            href={`/history?outcome=${key}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${outcome === key ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--fg-muted)]'}`}
          >
            {label} {counts[key] ?? 0}
          </Link>
        ))}
      </div>

      {scans.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-5 w-5" aria-hidden />}
          title={outcome ? 'Nothing in this category' : 'No saved checks yet'}
          body={
            outcome
              ? 'Try another filter, or check something new.'
              : 'Run your first check, or import the fictional demo cases from privacy settings to see what results look like.'
          }
          action={<ButtonLink href="/scan">Check something</ButtonLink>}
        />
      ) : (
        <ul className="space-y-2.5">
          {scans.map((scan) => (
            <li key={scan.id}>
              <Link
                href={`/scan/results/${scan.id}`}
                className="tc-tap block rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--accent)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={scan.outcome === 'warning_signs' ? 'high' : scan.outcome === 'verification_recommended' ? 'caution' : 'neutral'}>
                    {LABEL[scan.outcome]}
                  </Badge>
                  <Badge>{scan.kind}</Badge>
                  {scan.is_demo === 1 && <Badge tone="accent">Fictional demo</Badge>}
                  <span className="ml-auto text-xs text-[var(--fg-subtle)]">
                    {new Date(scan.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium">{scan.headline}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--fg-muted)]">{scan.title}</p>
                {scan.expires_at && (
                  <p className="mt-1.5 text-xs text-[var(--fg-subtle)]">
                    Deletes automatically on {new Date(scan.expires_at).toLocaleDateString('en-IN')}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
          {page > 1 ? <ButtonLink href={href(page - 1)} tone="secondary">← Newer</ButtonLink> : <span />}
          <span className="text-sm text-[var(--fg-subtle)]">Page {page}</span>
          {hasMore ? <ButtonLink href={href(page + 1)} tone="secondary">Older →</ButtonLink> : <span />}
        </nav>
      )}

      <Card tone="sunken">
        <h2 className="font-semibold">How long this list is kept</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Your plan keeps up to {entitlement.history_limit} checks; when you pass that, the oldest are deleted
          rather than hidden. Each case also expires according to your retention setting. Both are changeable
          in <Link href="/settings/privacy" className="text-[var(--accent)] underline">privacy settings</Link>,
          where you can also export or delete everything.
        </p>
      </Card>
    </div>
  );
}
