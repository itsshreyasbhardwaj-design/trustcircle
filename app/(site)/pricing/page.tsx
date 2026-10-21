import type { Metadata } from 'next';
import { Card, SectionTitle, ButtonLink, Badge, Alert, Notice } from '@/components/ui';

export const metadata: Metadata = { title: 'Pricing', description: 'Free and Family plans. No payment provider is connected.' };

const PLANS = [
  {
    name: 'TrustCircle Free',
    price: '₹0',
    cadence: 'forever',
    pitch: 'Everything needed to check something and verify it yourself.',
    featured: false,
    cta: ['Create a free account', '/signup'] as const,
    features: [
      ['Content checks — text, screenshot, link, QR', true],
      ['Full findings with quoted evidence', true],
      ['Independent verification checklists', true],
      ['Official reporting resources and recovery organiser', true],
      ['Privacy controls, data export, account deletion', true],
      ['Family circle with up to 2 people', true],
      ['1 trusted reviewer per request', true],
      ['25 saved checks', true],
      ['All 8 TrustAcademy lessons', true],
      ['English, Hindi and Bengali interface', true],
    ] as Array<[string, boolean]>,
  },
  {
    name: 'TrustCircle Family',
    price: '₹249',
    cadence: 'per month · proposed',
    pitch: 'For a household coordinating around one or two people who get targeted most.',
    featured: true,
    cta: ['See what is built', '#entitlements'] as const,
    features: [
      ['Everything in Free', true],
      ['Up to 5 people in a circle', true],
      ['Up to 3 reviewers per request', true],
      ['500 saved checks', true],
      ['Saved verification workflows across cases', true],
      ['Expanded private storage for recovery evidence', true],
    ] as Array<[string, boolean]>,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <SectionTitle
        eyebrow="Pricing"
        title="Essential safety information stays free"
        lead="Checking content, understanding the warning signs, and getting to an official reporting channel are on the free plan and will stay there. Paying is for coordinating a household, not for being told the truth about a message."
        center
      />

      <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <Card key={plan.name} className={plan.featured ? 'border-[var(--accent)]' : undefined}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{plan.name}</h2>
              {plan.featured && <Badge tone="accent">Proposed</Badge>}
            </div>
            <p className="mt-2 text-3xl font-semibold">{plan.price}</p>
            <p className="text-sm text-[var(--fg-subtle)]">{plan.cadence}</p>
            <p className="mt-3 text-sm text-[var(--fg-muted)]">{plan.pitch}</p>
            <ul className="mt-5 space-y-2">
              {plan.features.map(([label]) => (
                <li key={label} className="ml-5 list-disc text-sm text-[var(--fg-muted)]">{label}</li>
              ))}
            </ul>
            <ButtonLink href={plan.cta[1]} tone={plan.featured ? 'secondary' : 'primary'} wide className="mt-6">
              {plan.cta[0]}
            </ButtonLink>
          </Card>
        ))}
      </div>

      <Card className="mx-auto mt-6 max-w-3xl" tone="sunken">
        <h2 className="font-semibold">Annual plan — ₹1,999 per year</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Provisional. Listed for completeness; it cannot be purchased either.
        </p>
      </Card>

      <Alert tone="caution" className="mx-auto mt-10 max-w-3xl" title="Nothing can be bought here">
        <p>
          No payment provider is connected to this application. There is no checkout, no card form, and no
          subscription to cancel. You will never see a &ldquo;payment successful&rdquo; screen here, because that
          would be a fabricated transaction.
        </p>
        <p className="mt-2">
          Before real checkout could be enabled, a payment provider would have to be integrated, a business
          entity and tax registration put in place, and consumer disclosure, refund and cancellation terms
          published. None of that is done.
        </p>
      </Alert>

      <section id="entitlements" className="mt-14 scroll-mt-24">
        <SectionTitle
          eyebrow="What the plan actually controls"
          title="The entitlement system is real; the billing is not"
          lead="Plans are enforced in the application today — member seats, reviewer counts and history limits are checked on the server. What is missing is any way to pay."
        />
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--fg-subtle)]">
              <tr>
                <th className="py-2 pr-4 font-medium">Limit</th>
                <th className="py-2 pr-4 font-medium">Free</th>
                <th className="py-2 pr-4 font-medium">Family</th>
                <th className="py-2 font-medium">Enforced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[
                ['People in a circle', '2', '5', 'Server-side, when creating an invitation'],
                ['Reviewers per request', '1', '3', 'Server-side, when creating a review'],
                ['Saved checks kept', '25', '500', 'Server-side, oldest dropped on save'],
              ].map((row) => (
                <tr key={row[0]}>
                  <td className="py-2.5 pr-4 font-medium">{row[0]}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{row[1]}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{row[2]}</td>
                  <td className="py-2.5 text-[var(--fg-muted)]">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Notice>
          For development and evaluation, a plan can be switched in Settings → Privacy &amp; data. That control is
          labelled as a development simulation, records itself as such in the database, and creates no
          transaction, invoice or receipt.
        </Notice>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Honesty about the numbers" title="These prices are assumptions" />
        <Card className="mt-5">
          <p className="text-sm text-[var(--fg-muted)]">
            ₹249 per month and ₹1,999 per year are starting points for market testing. No pricing research has
            been done, no customer has been asked, and nobody has paid anything. They are on this page because
            the plan structure is real and worth describing — not because they have been validated.
          </p>
        </Card>
      </section>
    </div>
  );
}
