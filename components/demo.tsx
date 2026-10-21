import { analyze } from '@/lib/analysis';
import type { DemoCase } from '@/lib/data/demo';
import { Badge, Card, SubmittedContent } from './ui';
import { EngineNote, FindingList, OutcomeBanner, VerificationPlanPanel } from './findings';

/**
 * Runs the real analysis engine on a fictional example at render time. What the
 * visitor sees is literally what the product produces — there is no mocked output
 * anywhere in the marketing site.
 */
export function DemoCaseView({ demo, withPlan = true }: { demo: DemoCase; withPlan?: boolean }) {
  const result = analyze({ kind: demo.kind, content: demo.content, payment: demo.payment });

  return (
    <div className="space-y-4">
      <Card tone="sunken">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Fictional example</Badge>
          <Badge>{demo.kind === 'payment' ? 'Payment request' : demo.kind === 'url' ? 'Link' : 'Message'}</Badge>
        </div>
        <h3 className="mt-3 font-semibold">{demo.label}</h3>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{demo.context}</p>
        <div className="mt-4">
          <SubmittedContent text={demo.content} />
        </div>
        {demo.payment && (
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {demo.payment.claimedPayee && (
              <div><dt className="inline text-[var(--fg-subtle)]">Claimed payee: </dt><dd className="inline">{demo.payment.claimedPayee}</dd></div>
            )}
            {demo.payment.amountRupees && (
              <div><dt className="inline text-[var(--fg-subtle)]">Amount: </dt><dd className="inline">₹{demo.payment.amountRupees}</dd></div>
            )}
            {demo.payment.channel && (
              <div><dt className="inline text-[var(--fg-subtle)]">Arrived via: </dt><dd className="inline">{demo.payment.channel}</dd></div>
            )}
            {demo.payment.reason && (
              <div className="sm:col-span-2"><dt className="inline text-[var(--fg-subtle)]">Stated reason: </dt><dd className="inline">{demo.payment.reason}</dd></div>
            )}
          </dl>
        )}
        <p className="mt-4 text-xs text-[var(--fg-subtle)]">
          Every name, number and address in this example is invented. Links use domains reserved for
          documentation, so none of them resolve to a real site.
        </p>
      </Card>

      <OutcomeBanner
        outcome={result.outcome}
        headline={result.headline}
        summary={result.summary}
        disclaimer={result.disclaimer}
      />

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">
          What the rules matched
        </h3>
        <FindingList findings={result.findings.map((f) => ({ ...f, excerpt: f.excerpt ?? null }))} />
      </div>

      <EngineNote />

      {withPlan && <VerificationPlanPanel plan={result.plan} />}
    </div>
  );
}
