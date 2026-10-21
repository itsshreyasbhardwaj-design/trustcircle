import { AlertTriangle, CircleHelp, Info, ListChecks, ShieldAlert, Sparkles } from 'lucide-react';
import type { AnalysisResult } from '@/lib/analysis';
import { CATEGORY_LABEL, SEVERITY_LABEL, type Category, type Outcome, type Severity } from '@/lib/analysis/types';
import type { VerificationPlan } from '@/lib/analysis/verify';
import { Alert, Badge, Card, Notice, SubmittedContent } from './ui';

const OUTCOME_TONE: Record<Outcome, Severity> = {
  warning_signs: 'high',
  verification_recommended: 'caution',
  insufficient_information: 'info',
  no_known_warning_signs: 'info',
};

const OUTCOME_ICON: Record<Outcome, typeof ShieldAlert> = {
  warning_signs: ShieldAlert,
  verification_recommended: AlertTriangle,
  insufficient_information: CircleHelp,
  no_known_warning_signs: Info,
};

export function OutcomeBanner({
  outcome,
  headline,
  summary,
  disclaimer,
  compact,
}: {
  outcome: Outcome;
  headline: string;
  summary: string;
  disclaimer?: string;
  compact?: boolean;
}) {
  const tone = OUTCOME_TONE[outcome];
  const Icon = OUTCOME_ICON[outcome];
  const ring =
    tone === 'high'
      ? 'border-[var(--alert-border)] bg-[var(--alert-bg)]'
      : tone === 'caution'
        ? 'border-[var(--caution-border)] bg-[var(--caution-bg)]'
        : 'border-[var(--border)] bg-[var(--info-bg)]';
  const fg = tone === 'high' ? 'text-[var(--alert-fg)]' : tone === 'caution' ? 'text-[var(--caution-fg)]' : 'text-[var(--info-fg)]';

  return (
    <div className={`rounded-2xl border p-5 ${ring}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${fg}`} aria-hidden />
        <div className="min-w-0">
          <h2 className={`text-lg font-semibold ${fg}`}>{headline}</h2>
          <p className={`mt-1.5 text-sm ${fg} opacity-90`}>{summary}</p>
          {!compact && disclaimer && (
            <p className="mt-3 border-t border-current/15 pt-3 text-xs leading-relaxed opacity-80">{disclaimer}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={severity}>{SEVERITY_LABEL[severity]}</Badge>;
}

export function FindingList({
  findings,
  showExcerpts = true,
}: {
  findings: Array<{
    code: string;
    category: string;
    severity: Severity;
    title: string;
    explanation: string;
    excerpt?: string | null;
  }>;
  showExcerpts?: boolean;
}) {
  if (findings.length === 0) {
    return (
      <Notice>
        No rule in TrustCircle&apos;s published list matched this content. That is a statement about these
        checks, not about the content. Anything asking for money, codes or personal details still needs
        independent verification.
      </Notice>
    );
  }

  return (
    <ol className="space-y-3">
      {findings.map((finding) => (
        <li key={finding.code} className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <Badge>{CATEGORY_LABEL[finding.category as Category] ?? finding.category}</Badge>
            <code className="ml-auto text-[0.68rem] text-[var(--fg-subtle)]">{finding.code}</code>
          </div>
          <h3 className="mt-2.5 font-semibold">{finding.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">{finding.explanation}</p>
          {showExcerpts && finding.excerpt && (
            <figure className="mt-3">
              <figcaption className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
                From the content you submitted
              </figcaption>
              <SubmittedContent text={finding.excerpt} />
            </figure>
          )}
        </li>
      ))}
    </ol>
  );
}

export function VerificationPlanPanel({ plan }: { plan: VerificationPlan }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-[var(--accent)]" aria-hidden />
        <h2 className="font-semibold">{plan.title}</h2>
      </div>

      <section className="mt-5">
        <h3 className="text-sm font-semibold">What TrustCircle could not establish</h3>
        <ul className="mt-2 space-y-1.5">
          {plan.unverified.map((item) => (
            <li key={item} className="ml-5 list-disc text-sm text-[var(--fg-muted)]">{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">Check it yourself, in this order</h3>
        <ol className="mt-3 space-y-3">
          {plan.steps.map((step, i) => (
            <li key={step.instruction} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]"
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{step.instruction}</p>
                <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">Do not share, whatever the reason given</h3>
        <ul className="mt-2 space-y-1.5">
          {plan.doNotShare.map((item) => (
            <li key={item} className="ml-5 list-disc text-sm text-[var(--fg-muted)]">{item}</li>
          ))}
        </ul>
      </section>
    </Card>
  );
}

export function UrlTable({ urls }: { urls: AnalysisResult['urls'] }) {
  if (urls.length === 0) return null;
  return (
    <Card>
      <h2 className="font-semibold">Addresses found in this content</h2>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        Shown as plain text and never as a clickable link. TrustCircle did not open, fetch or follow any of these.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--fg-subtle)]">
            <tr>
              <th className="pb-2 pr-4 font-medium">As written</th>
              <th className="pb-2 pr-4 font-medium">Domain that decides where it goes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {urls.map((u) => (
              <tr key={u.raw}>
                <td className="py-2.5 pr-4"><span className="tc-content block max-w-[22rem] text-[var(--fg-muted)]">{u.raw}</span></td>
                <td className="py-2.5 pr-4 font-medium">{u.registrableDomain || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function LanguageNote({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <Alert tone="info" title="Language coverage">
      {note}
    </Alert>
  );
}

export function SensitiveNotice({ hits }: { hits: AnalysisResult['sensitive'] }) {
  if (hits.length === 0) return null;
  return (
    <Alert tone="caution" title="Something sensitive was removed before saving">
      <p>
        TrustCircle found and removed {hits.map((h) => `${h.count} ${h.label}${h.count === 1 ? '' : 's'}`).join(', ')}{' '}
        from this content. The value was never stored and was not included in anything shared.
      </p>
      <p className="mt-2">
        If that was a live code or PIN, treat it as exposed: do not use it, and do not forward this content to anyone.
      </p>
    </Alert>
  );
}

export function EngineNote() {
  return (
    <Notice>
      <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />
      Every finding above comes from a published rule in TrustCircle&apos;s own rule list, matched on the words
      shown. There is no AI model, no score and no external threat-intelligence feed involved — which is also
      why the rules can miss things they were not written for.
    </Notice>
  );
}
