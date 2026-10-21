import Link from 'next/link';
import {
  BookOpen, Eye, FileSearch, GraduationCap, Languages, LifeBuoy, Lock,
  MessageSquareText, QrCode, ScanLine, ShieldQuestion, Users, Wallet,
} from 'lucide-react';
import { ButtonLink, Card, SectionTitle, Badge, Alert } from '@/components/ui';
import { DemoCaseView } from '@/components/demo';
import { demoBySlug } from '@/lib/data/demo';
import { officialResources } from '@/lib/data/directory';

const MODULES = [
  {
    icon: ScanLine,
    name: 'TrustScan',
    tagline: 'Analyse suspicious content',
    body: 'Paste a message, upload a screenshot, check a link or read a QR code. You get the specific warning signs, quoted from your own content, with a plain explanation of each one.',
    href: '/features#trustscan',
  },
  {
    icon: Users,
    name: 'FamilyShield',
    tagline: 'Get help from people you trust',
    body: 'Share one case — not your history — with someone in your circle and ask what they think. Access is per case, visible to you, and revocable at any time.',
    href: '/family-protection',
  },
  {
    icon: ShieldQuestion,
    name: 'VerifyPath',
    tagline: 'Verify the claim independently',
    body: 'A step-by-step route to checking the claim through a channel you already had: your own app, the number on your card, a contact you already saved. Never the message.',
    href: '/features#verifypath',
  },
  {
    icon: Wallet,
    name: 'PaymentPause',
    tagline: 'Review a payment before it moves',
    body: 'Read what a UPI link or QR code actually contains, see which parts prove nothing, and work through a recipient check before any money leaves.',
    href: '/features#paymentpause',
  },
  {
    icon: LifeBuoy,
    name: 'RecoveryGuide',
    tagline: 'Act fast after a suspected fraud',
    body: 'The first hour in order — bank, then 1930, then a written complaint — with an evidence organiser and links to official reporting channels we have checked.',
    href: '/features#recoveryguide',
  },
  {
    icon: GraduationCap,
    name: 'TrustAcademy',
    tagline: 'Learn to recognise it next time',
    body: 'Short lessons with fictional scenarios and immediate explanations. Useful on a quiet day, not only when something suspicious arrives.',
    href: '/features#trustacademy',
  },
];

export default function HomePage() {
  const demo = demoBySlug('bank-kyc')!;

  return (
    <>
      {/* ---------- hero ---------- */}
      <section className="tc-grid-bg border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <Badge tone="accent">Built for India · Works offline · No API keys</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Your family&apos;s second opinion for digital safety.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-[var(--fg-muted)]">
              Check suspicious messages, understand warning signs, and verify unfamiliar requests with help
              from people you trust.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/scan/text" className="px-6 py-3 text-base">Check a Message</ButtonLink>
              <ButtonLink href="/how-it-works" tone="secondary" className="px-6 py-3 text-base">
                Explore TrustCircle
              </ButtonLink>
            </div>
            <p className="mt-6 max-w-xl text-sm text-[var(--fg-muted)]">
              <strong className="text-[var(--fg)]">Before you trust it, check it with TrustCircle.</strong>{' '}
              We will never tell you something is safe — we show you what is suspicious, what remains
              unverified, and how to find out for yourself.
            </p>
          </div>

          <dl className="mt-14 grid gap-4 sm:grid-cols-3">
            {[
              ['What warning signs are visible?', 'Specific patterns, quoted from your own content, each one explained.'],
              ['How can you verify the claim?', 'A route through a channel you already had — never the one in the message.'],
              ['Can someone you trust help?', 'Share one case with a trusted contact and ask what they see.'],
            ].map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-5">
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1.5 text-sm text-[var(--fg-muted)]">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- urgent path ---------- */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <Alert tone="caution" title="Has money already left your account?">
          <p>
            Do not start with a scan. Call your bank to report an unauthorised transaction, then call{' '}
            <strong>1930</strong>, the national cyber financial fraud helpline. Speed matters more than a
            complete account of what happened.{' '}
            <Link href="/recovery">Open the recovery guide →</Link>
          </p>
        </Alert>
      </section>

      {/* ---------- live demo ---------- */}
      <section id="demo" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle
          eyebrow="How TrustScan works"
          title="A real result, on a fictional message"
          lead="This is not a screenshot. The analysis below is produced by the actual engine, running on the invented message shown, every time this page loads."
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <DemoCaseView demo={demo} />
          </div>
          <aside className="space-y-4">
            <Card>
              <h3 className="font-semibold">CAPTURE → ANALYZE → EXPLAIN → VERIFY → COLLABORATE → DECIDE</h3>
              <ol className="mt-4 space-y-3 text-sm text-[var(--fg-muted)]">
                {[
                  ['Capture', 'Paste the message, add a screenshot, a link or a QR code.'],
                  ['Analyze', 'Published rules look for known patterns. Sensitive values are stripped first.'],
                  ['Explain', 'Each finding is quoted and explained without jargon.'],
                  ['Verify', 'A checklist routes you to an independent channel you already had.'],
                  ['Collaborate', 'Optionally share that one case with a trusted contact.'],
                  ['Decide', 'You decide. TrustCircle never decides for you and never says "safe".'],
                ].map(([step, text], i) => (
                  <li key={step} className="flex gap-3">
                    <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">{i + 1}</span>
                    <span><strong className="text-[var(--fg)]">{step}.</strong> {text}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <Card>
              <Eye className="h-5 w-5 text-[var(--accent)]" aria-hidden />
              <h3 className="mt-2 font-semibold">Screenshots never leave your device</h3>
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
                Text extraction and QR decoding run in your own browser. Only the text you confirm is sent to
                the server, and only after any codes or card numbers in it have been removed.
              </p>
            </Card>
            <Card>
              <Languages className="h-5 w-5 text-[var(--accent)]" aria-hidden />
              <h3 className="mt-2 font-semibold">English, हिन्दी, বাংলা</h3>
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
                Navigation and safety guidance are translated. Where a string has no translation yet, the app
                shows English and labels it as English — it never passes English off as a translation.
              </p>
            </Card>
          </aside>
        </div>
      </section>

      {/* ---------- modules ---------- */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-raised)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionTitle eyebrow="Six connected systems" title="One place to check, verify and ask" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, name, tagline, body, href }) => (
              <Card key={name} className="flex flex-col">
                <Icon className="h-6 w-6 text-[var(--accent)]" aria-hidden />
                <h3 className="mt-3 font-semibold">{name}</h3>
                <p className="text-sm font-medium text-[var(--accent)]">{tagline}</p>
                <p className="mt-2.5 flex-1 text-sm text-[var(--fg-muted)]">{body}</p>
                <Link href={href} className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline">
                  Read more →
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- family ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle
              eyebrow="FamilyShield"
              title="Asking someone you trust should not mean handing over your inbox"
              lead="Most family safety tools work by monitoring. TrustCircle works by consent: you choose one case, you choose who sees it, and you choose how much of it they see."
            />
            <ul className="mt-6 space-y-4">
              {[
                ['Share one case, not your history', 'Being in the same circle gives nobody access to anything. Each share is a separate, recorded permission for one case.'],
                ['Choose findings only, or findings plus the message', 'If the message contains something you would rather not show, share just the warning signs.'],
                ['Withdraw access at any time', 'One button. The next time they open it, the server refuses — it is not merely hidden in the interface.'],
                ['No reviewer can mark something safe', 'The responses available are "I see warning signs", "we should verify this", "I need more information" and "I cannot tell". There is deliberately no approve button.'],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-3">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-teal-600)]" aria-hidden />
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <ButtonLink href="/family-protection" tone="secondary" className="mt-7">
              How family protection works
            </ButtonLink>
          </div>

          <Card>
            <h3 className="font-semibold">A second opinion, in the app</h3>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                ['You', 'Shares one case and asks: "Papa got this. Does it look wrong to you?"'],
                ['Your sister', 'Opens the case. She sees the findings, and the message because you allowed it.'],
                ['Her response', '"I see warning signs — the link is not the bank\'s domain. Do not call that number."'],
                ['You', 'Close the review. Her access ends the moment you do.'],
              ].map(([who, what]) => (
                <li key={who} className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">{who}</p>
                  <p className="mt-1 text-[var(--fg-muted)]">{what}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-[var(--fg-subtle)]">Illustration of the flow. Names are fictional.</p>
          </Card>
        </div>
      </section>

      {/* ---------- recovery ---------- */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-raised)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionTitle
            eyebrow="RecoveryGuide"
            title="Official channels, checked and dated"
            lead="TrustCircle cannot file a complaint for you and will never promise to recover money. What it can do is put the genuine channels in front of you in the right order, and tell you when each entry was last checked."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {officialResources.map((r) => (
              <Card key={r.slug}>
                <h3 className="font-semibold">{r.organisation}</h3>
                <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{r.what}</p>
                <p className="mt-2 text-sm"><strong>Use it when:</strong> <span className="text-[var(--fg-muted)]">{r.useWhen}</span></p>
                <p className="mt-3 text-xs text-[var(--fg-subtle)]">
                  {r.website ?? `Phone ${r.phone}`} · last checked {r.checkedOn}
                </p>
              </Card>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm text-[var(--fg-muted)]">
            Deliberately absent: bank phone numbers. We will not hand you a bank contact detail we cannot keep
            current, because a stale &quot;official&quot; number is exactly the failure this product exists to prevent.
            VerifyPath tells you where to find yours instead — the back of your card, your passbook, or your own app.
          </p>
        </div>
      </section>

      {/* ---------- honesty ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle
          eyebrow="What this is not"
          title="The limits, stated up front"
          lead="A safety product that oversells itself makes people less safe. Here is what TrustCircle cannot do."
          center
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {[
            ['It cannot tell you something is safe', 'No warning signs found means these particular rules matched nothing. It is not a verdict on the content.'],
            ['It cannot verify identity or ownership', 'Not who sent a message, not who owns a UPI ID or bank account, not whether a business is real.'],
            ['It uses no threat intelligence', 'There is no feed of known-bad domains, no reputation service and no AI model. Rules only, and they can miss what they were not written for.'],
            ['It never opens a suspicious link', 'Links are inspected as text. Nothing is fetched, followed or resolved — so a brand-new scam site looks like any other unknown domain.'],
            ['Non-English coverage is partial', 'Hindi and Bengali rules cover the most common phrases only. A clean result on a non-English message means less.'],
            ['It cannot report on your behalf', 'No integration with any bank, portal or authority exists. You make the report; TrustCircle helps you organise it.'],
          ].map(([title, body]) => (
            <Card key={title} tone="sunken">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- plans ---------- */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-raised)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionTitle
            eyebrow="Plans"
            title="Essential safety information stays free"
            lead="Checking content, verification guidance and the official reporting routes are on the free plan and will stay there."
            center
          />
          <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
            <Card>
              <h3 className="font-semibold">TrustCircle Free</h3>
              <p className="mt-1 text-3xl font-semibold">₹0</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--fg-muted)]">
                {['Content checks with full explanations', 'Independent verification checklists', 'Official reporting resources', 'One trusted reviewer per request', 'Privacy controls, export and deletion'].map((f) => (
                  <li key={f} className="ml-5 list-disc">{f}</li>
                ))}
              </ul>
              <ButtonLink href="/signup" tone="secondary" wide className="mt-6">Create a free account</ButtonLink>
            </Card>
            <Card className="border-[var(--accent)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">TrustCircle Family</h3>
                <Badge tone="accent">Proposed</Badge>
              </div>
              <p className="mt-1 text-3xl font-semibold">₹249<span className="text-base font-normal text-[var(--fg-muted)]">/month</span></p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--fg-muted)]">
                {['Up to five people in a circle', 'Several reviewers per request', 'Longer saved history', 'Saved verification workflows'].map((f) => (
                  <li key={f} className="ml-5 list-disc">{f}</li>
                ))}
              </ul>
              <ButtonLink href="/pricing" tone="secondary" wide className="mt-6">See what is and is not built</ButtonLink>
            </Card>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-[var(--fg-muted)]">
            No payment provider is connected, so nothing can be bought here yet. Prices are market-testing
            assumptions, not validated pricing.
          </p>
        </div>
      </section>

      {/* ---------- faq teaser ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle eyebrow="Common questions" title="Straight answers" />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[
            ['Can TrustCircle tell me if a message is a scam?', 'It can tell you which known warning signs appear in it, quoting your own words back. It cannot confirm who sent it, so it will not call anything definitely fraudulent or definitely genuine.'],
            ['Does my family see my messages?', 'No. Being in a circle gives nobody access to anything. A case becomes visible to one person only when you share it, and only until you withdraw it.'],
            ['Do you need my bank details?', 'Never. TrustCircle has no connection to any bank and asks for no account number, card number, OTP or PIN. If it ever appears to, that is not us.'],
            ['Does it work without internet or an API key?', 'It needs no external service and no API key at all. Text extraction and QR reading happen in your browser; the rules run on your own machine.'],
          ].map(([q, a]) => (
            <Card key={q}>
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{a}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/faq" tone="secondary">All questions</ButtonLink>
          <ButtonLink href="/signup">Create a free account</ButtonLink>
        </div>
      </section>

      {/* ---------- closing ---------- */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-raised)]">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <MessageSquareText className="mx-auto h-7 w-7 text-[var(--accent)]" aria-hidden />
          <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Think twice. Stay protected. Together.</h2>
          <p className="mt-3 text-[var(--fg-muted)]">
            The gap between receiving a message and acting on it is where every scam lives. TrustCircle exists
            to make that gap bigger.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" className="px-6 py-3 text-base">Create a free account</ButtonLink>
            <ButtonLink href="/scan/text" tone="secondary" className="px-6 py-3 text-base">Check a message</ButtonLink>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--fg-subtle)]">
            <span className="inline-flex items-center gap-1.5"><FileSearch className="h-3.5 w-3.5" aria-hidden /> Rules you can read</span>
            <span className="inline-flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5" aria-hidden /> QR decoded on your device</span>
            <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" aria-hidden /> Eight short lessons</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" aria-hidden /> Export and delete everything</span>
          </div>
        </div>
      </section>
    </>
  );
}
