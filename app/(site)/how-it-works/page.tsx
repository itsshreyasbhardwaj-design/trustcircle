import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, Card, SectionTitle, Badge, Alert } from '@/components/ui';
import { DemoCaseView } from '@/components/demo';
import { demoCases } from '@/lib/data/demo';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'The full workflow, demonstrated on fictional examples with real engine output.',
};

const STAGES = [
  ['Capture', 'Paste the message, upload a screenshot, enter a link, or load a QR code image. Screenshots and QR codes are processed in your browser — the image itself never leaves your device.'],
  ['Analyze', 'Sensitive values are removed first. Then a published list of rules looks for known patterns in the text, the link structure, and any payment code.'],
  ['Explain', 'Each finding names the pattern, quotes the words that matched, and explains in plain language why it matters. No score, no percentage, no verdict on identity.'],
  ['Verify', 'A checklist routes you to an independent channel — your own app, the number on your card, a contact you already saved. Never a number from the message.'],
  ['Collaborate', 'Optionally share that one case with someone in your circle and ask what they see. They can respond, ask for more, or say they cannot tell.'],
  ['Decide', 'You decide. TrustCircle will not tell you something is safe, because it has no way to know.'],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <SectionTitle
        eyebrow="How it works"
        title="Six stages, and nothing hidden in between"
        lead="Below, every example runs through the real engine when this page loads. Nothing is a screenshot or a mock-up."
      />

      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map(([name, body], i) => (
          <Card key={name} as="li">
            <span aria-hidden className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
              {i + 1}
            </span>
            <h3 className="mt-3 font-semibold">{name}</h3>
            <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{body}</p>
          </Card>
        ))}
      </ol>

      <Alert tone="info" className="mt-10" title="Why there is no percentage anywhere">
        A confidence number would have to come from somewhere. With a rule-based engine and no labelled
        dataset, any figure would be decoration — and a decorated number is worse than none, because people
        act on it. So TrustCircle reports which rules matched, and what it could not establish.
      </Alert>

      <section className="mt-16">
        <SectionTitle
          eyebrow="Worked examples"
          title="Seven fictional cases, including one ordinary message"
          lead="The last example is an everyday message. It is here because a safety tool that flags everything is useless, and you should be able to see where this one stays quiet."
        />
        <div className="mt-8 space-y-14">
          {demoCases.map((demo, i) => (
            <div key={demo.slug} id={demo.slug} className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <Badge>Example {i + 1} of {demoCases.length}</Badge>
              </div>
              <DemoCaseView demo={demo} withPlan={i === 0} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Try it on your own content" title="Nothing is stored until you choose to save it" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="font-semibold">What gets stored if you save a case</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
              <li className="ml-5 list-disc">The message text, with any OTP, PIN, CVV, card number, Aadhaar or PAN already removed.</li>
              <li className="ml-5 list-disc">The findings and the excerpts that triggered them.</li>
              <li className="ml-5 list-disc">Message text and excerpts are encrypted at rest with a key held outside the database.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold">What never gets stored</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
              <li className="ml-5 list-disc">The screenshot or QR image. It is read in your browser and discarded.</li>
              <li className="ml-5 list-disc">Any credential value found in the content.</li>
              <li className="ml-5 list-disc">Anything shared with anyone, unless you create a review yourself.</li>
            </ul>
          </Card>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/scan/text">Check a message</ButtonLink>
          <ButtonLink href="/privacy" tone="secondary">Read the privacy policy</ButtonLink>
        </div>
        <p className="mt-6 text-sm text-[var(--fg-muted)]">
          Want these examples inside your own account to click through? Sign in and use{' '}
          <Link href="/settings/privacy">Import demo data</Link> — nothing fictional is ever placed in your
          account without you asking for it.
        </p>
      </section>
    </div>
  );
}
