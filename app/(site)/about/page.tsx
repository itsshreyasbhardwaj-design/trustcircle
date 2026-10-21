import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, SectionTitle, Prose, ButtonLink } from '@/components/ui';

export const metadata: Metadata = { title: 'About', description: 'Why TrustCircle exists and what it refuses to do.' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <SectionTitle eyebrow="About" title="Why this exists" />
      <Prose>
        <p>
          The people most often targeted by digital fraud in India are not careless. They are frequently
          careful people placed, briefly, in a state where checking felt like the wrong move — a deadline, an
          authority, a threat, and an instruction to tell nobody. The gap between receiving a message and
          acting on it is where every one of these scripts lives.
        </p>
        <p>
          TrustCircle is built around one idea: make that gap bigger. Not by being cleverer than the scam, but
          by giving someone two things in the thirty seconds that matter — a plain explanation of what looks
          wrong, and an easy way to ask a person they trust.
        </p>

        <h2>What it refuses to do</h2>
        <p>
          A safety product that oversells itself makes people less safe, because the false reassurance is more
          dangerous than no tool at all. So there are things this product will not do, by design and not by
          omission:
        </p>
        <ul>
          <li><strong>It will never say something is safe.</strong> Not in a badge, not in a colour, not in a reviewer&apos;s response, not in a number.</li>
          <li><strong>It will not invent evidence.</strong> No threat intelligence it does not have, no verified merchant identities, no delivered emails, no successful payments, no detection-accuracy figure measured on a handful of hand-picked examples.</li>
          <li><strong>It will not monitor anyone.</strong> Family membership authorises nothing. There is no covert mode and there will not be one.</li>
          <li><strong>It will not hand out contact details it cannot keep current.</strong> A stale &ldquo;official&rdquo; bank number is exactly the failure this product exists to prevent, so it tells you where to find yours instead.</li>
        </ul>

        <h2>How it is built</h2>
        <p>
          Everything runs locally. A SQLite database, a rule engine with no model behind it, and text
          extraction that happens in your own browser. No API key of any kind is required — not for an AI
          provider, an authentication service, a database host, an email sender, a payment gateway or a threat
          feed. That is partly a privacy decision and partly an honesty one: a product that cannot phone
          anywhere cannot quietly become something else.
        </p>
        <p>
          The rule list is published on the <Link href="/features">features page</Link>, and every finding in
          the app shows which rule produced it. If you can see what is being checked, you can also see what
          is not.
        </p>

        <h2>Where it is in its life</h2>
        <p>
          This is an early, independently built application, not a company. It is not affiliated with, endorsed
          by, or connected to any bank, payment network, government body or law-enforcement agency. There are
          no certifications, no partnerships, no awards and no user numbers to report — and you should be
          suspicious of a product in this category that claims any of those without evidence.
        </p>
        <p>
          The honest limits are collected in one place rather than scattered across footnotes. If something in
          the interface ever reads as more confident than those limits allow, that is a bug worth reporting.
        </p>
      </Prose>

      <Card className="mt-10">
        <h2 className="font-semibold">The product promise, in one line</h2>
        <p className="mt-2 text-[var(--fg-muted)]">Before you trust it, check it with TrustCircle.</p>
      </Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/features" tone="secondary">What is built</ButtonLink>
        <ButtonLink href="/contact" tone="secondary">Get in touch</ButtonLink>
      </div>
    </div>
  );
}
