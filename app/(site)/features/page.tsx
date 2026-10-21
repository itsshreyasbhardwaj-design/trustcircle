import type { Metadata } from 'next';
import { ButtonLink, Card, SectionTitle, Badge, Alert, Notice } from '@/components/ui';
import { ruleCodes } from '@/lib/analysis/signals';
import { CATEGORY_LABEL } from '@/lib/analysis/types';
import { lessons } from '@/lib/data/lessons';
import { LANGUAGES, coverage } from '@/lib/i18n';
import { channels } from '@/lib/notifications';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Everything TrustCircle does, and the limits of each part.',
};

type Feature = {
  id: string;
  name: string;
  tagline: string;
  built: string[];
  limits: string[];
};

const FEATURES: Feature[] = [
  {
    id: 'trustscan',
    name: 'TrustScan',
    tagline: 'Analyse a message, screenshot, link or QR code',
    built: [
      'Four input routes: pasted text, a screenshot, a web address, or a QR code image.',
      'Sensitive values — OTPs, PINs, CVVs, card numbers, Aadhaar, PAN, passwords — are detected and stripped out before anything is saved. The surrounding words are kept so the rules still work.',
      'Findings are grouped by category, ranked by severity, and each one quotes the words that triggered it.',
      'Four honest outcomes: warning signs detected, additional verification recommended, not enough to assess, and no known warning signs identified.',
      'Screenshot text extraction and QR decoding run entirely in your browser. The image is never uploaded.',
      'Extracted text is editable before analysis, and re-running on your corrected version replaces the stored result.',
    ],
    limits: [
      'No AI model, no reputation service, no threat-intelligence feed. Rules can only match what they were written for.',
      'No probability or score is produced, because any number here would be invented.',
      'A result with no findings is never a statement that the content is safe.',
    ],
  },
  {
    id: 'familyshield',
    name: 'FamilyShield',
    tagline: 'Ask a trusted contact about one specific case',
    built: [
      'Create a circle, invite people with a cryptographically random link, and manage membership.',
      'Invitation tokens are stored only as a SHA-256 hash, expire after seven days, and can be revoked before use.',
      'Share one case at a time. Choose findings only, or findings plus the message content.',
      'Review states: draft, awaiting review, under review, more information requested, reviewed, closed, cancelled.',
      'Reviewer responses are limited to "I see warning signs", "we should verify this independently", "I need more information" and "I cannot tell".',
      'Withdraw access at any time. Revocation is enforced on the server on the next read, not hidden in the interface.',
    ],
    limits: [
      'No email is sent, because no email provider is configured. Invitation links are copied and shared by you.',
      'There is no monitoring mode and no admin override. A circle administrator sees nothing of other members\' checks.',
      'No reviewer can mark anything as safe. That button does not exist and will not be added.',
    ],
  },
  {
    id: 'verifypath',
    name: 'VerifyPath',
    tagline: 'Find an independent channel for the claim',
    built: [
      'Nine claim types are recognised: bank, delivery, payment, support, job, shopping, utility, someone you know, and government body.',
      'Each produces a plan stating what remains unverified, an ordered set of checks, and what you must not share.',
      'Every step routes you to something you already had: your own app, the number on your card, a saved contact, your order history.',
      'Checklists are saved, and each step can be ticked off with a note on what you found.',
    ],
    limits: [
      'Classification is keyword-based. An unusual message may come back as "unclear what this is about", which produces the general plan.',
      'No phone number inside the content you submit is ever reused as a verification channel.',
    ],
  },
  {
    id: 'paymentpause',
    name: 'PaymentPause',
    tagline: 'Review a payment request before money moves',
    built: [
      'Parses a UPI deep link or QR payload and shows each field with an explanation of what it does and does not prove.',
      'Flags that the displayed payee name is free text set by whoever generated the code.',
      'Flags a missing merchant category code, which indicates a transfer to an individual rather than a business.',
      'Analyses the request description, claimed payee, amount and reason with the same rules as any message.',
      'Produces a recipient-confirmation checklist and can be shared for a second opinion.',
    ],
    limits: [
      'TrustCircle never initiates a payment, never opens a payment app, and has no connection to any PSP or bank.',
      'Account ownership cannot be verified. Only your bank can tell you whose account a UPI ID belongs to.',
      'A well-formed UPI code is not evidence of a genuine recipient, and the app says so on every payment result.',
    ],
  },
  {
    id: 'recoveryguide',
    name: 'RecoveryGuide',
    tagline: 'Organise a response after a suspected fraud',
    built: [
      'The urgent path is presented first, before any scan: your bank, then 1930, then a written complaint.',
      'Four official resources, each recorded with the source it was checked against, the date, and its limitations.',
      'An evidence checklist and organiser for transaction references, contacts, notes and complaint acknowledgements.',
      'File attachments up to 4 MB, validated by their actual magic bytes, stored privately and served only to you.',
      'A case can be shared with one trusted contact who is already in a circle with you.',
    ],
    limits: [
      'No complaint can be filed through TrustCircle. There is no authorised integration with any portal or bank.',
      'Nothing here promises recovery. Reporting improves the odds; it does not guarantee an outcome.',
      'Bank phone numbers are deliberately not listed — a stale "official" number is the exact failure this product exists to prevent.',
    ],
  },
  {
    id: 'trustacademy',
    name: 'TrustAcademy',
    tagline: 'Learn the patterns on a quiet day',
    built: [
      `${lessons.length} short lessons covering credentials, links, impersonation, payments, official contact, account security, social engineering and reporting.`,
      'Multiple-choice scenarios with an explanation shown after answering, whichever option was chosen.',
      'Progress is saved per lesson, and an opt-in circle view compares completion within a family.',
      'Every scenario is fictional and every address uses a domain reserved for documentation.',
    ],
    limits: [
      'Lesson titles and summaries are translated into Hindi and Bengali; lesson bodies and quizzes are English-only in this build, and the app labels them as such.',
      'No lesson teaches how to run a scam, and no live link is used as practice material.',
    ],
  },
];

export default function FeaturesPage() {
  const cov = coverage();
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <SectionTitle
        eyebrow="Features"
        title="What is built, and what each part cannot do"
        lead="Every claim on this page corresponds to behaviour in the application. Where something is not implemented, it is listed as a limit rather than left out."
      />

      <div className="mt-12 space-y-12">
        {FEATURES.map((feature) => (
          <section key={feature.id} id={feature.id} className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl font-semibold">{feature.name}</h2>
              <p className="text-[var(--accent)]">{feature.tagline}</p>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">Implemented</h3>
                <ul className="mt-3 space-y-2">
                  {feature.built.map((b) => (
                    <li key={b} className="ml-5 list-disc text-sm text-[var(--fg-muted)]">{b}</li>
                  ))}
                </ul>
              </Card>
              <Card tone="sunken">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">Limits</h3>
                <ul className="mt-3 space-y-2">
                  {feature.limits.map((b) => (
                    <li key={b} className="ml-5 list-disc text-sm text-[var(--fg-muted)]">{b}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-16">
        <SectionTitle
          eyebrow="The rule list"
          title={`${ruleCodes.length} content rules and ${Object.keys(CATEGORY_LABEL).length} categories`}
          lead="The checks are not a secret. Knowing what is looked for is part of knowing what is not."
        />
        <Card className="mt-6">
          <div className="flex flex-wrap gap-2">
            {ruleCodes.map((code) => (
              <code key={code} className="rounded-md bg-[var(--bg-sunken)] px-2 py-1 text-xs text-[var(--fg-muted)]">{code}</code>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--fg-muted)]">
            Link-structure and payment-code rules are listed separately on each result, and each finding shows
            its own rule identifier.
          </p>
        </Card>
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Language" title="Translation coverage, measured not claimed" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {LANGUAGES.map((l) => (
            <Card key={l.code}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{l.native}</h3>
                <Badge tone={cov[l.code].translated === cov[l.code].total ? 'accent' : 'caution'}>
                  {cov[l.code].translated}/{cov[l.code].total}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                {l.code === 'en'
                  ? 'Source language. Complete by definition.'
                  : `Interface strings with a ${l.label} translation. Anything untranslated is shown in English and labelled as English.`}
              </p>
            </Card>
          ))}
        </div>
        <Notice>
          These translations were written by the project author, not reviewed by a professional translator.
          Detection rules for Hindi and Bengali cover the highest-signal phrases only, and the app discloses
          this on any result containing those scripts.
        </Notice>
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Notifications" title="What actually gets delivered" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {channels().map((c) => (
            <Card key={c.name} tone={c.status === 'active' ? 'raised' : 'sunken'}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{c.name}</h3>
                <Badge tone={c.status === 'active' ? 'accent' : 'neutral'}>
                  {c.status === 'active' ? 'Active' : 'Not configured'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">{c.note}</p>
            </Card>
          ))}
        </div>
      </section>

      <Alert tone="info" className="mt-12" title="No external service is required">
        TrustCircle runs with no API key of any kind. No OpenAI, Anthropic or Gemini key; no Supabase or
        Firebase project; no Google sign-in; no Twilio; no email provider; no payment gateway; no cloud
        storage; no paid threat-intelligence subscription. The database is a local SQLite file and text
        extraction happens in your browser.
      </Alert>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/signup">Create a free account</ButtonLink>
        <ButtonLink href="/how-it-works" tone="secondary">See it on a real example</ButtonLink>
      </div>
    </div>
  );
}
