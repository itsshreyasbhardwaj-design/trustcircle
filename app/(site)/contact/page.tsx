import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card, SectionTitle, Notice } from '@/components/ui';
import { officialResources } from '@/lib/data/directory';

export const metadata: Metadata = { title: 'Contact', description: 'How to reach us, and who to contact instead in an emergency.' };

export default function ContactPage() {
  const urgent = officialResources.filter((r) => r.tags.includes('fraud_report') || r.tags.includes('financial_fraud'));
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <SectionTitle
        eyebrow="Contact"
        title="Who to contact, and when"
        lead="TrustCircle is not an emergency service and cannot act on your account. If something is happening right now, the people below can help and we cannot."
      />

      <Alert tone="high" className="mt-8" title="If money has already left your account, do not contact us first">
        <ol className="mt-1 space-y-1.5">
          <li>1. Call your bank and report an unauthorised transaction. Ask them to freeze the beneficiary. Note the reference number and the time.</li>
          <li>2. Call <strong>1930</strong>, the national cyber financial fraud helpline, with the transaction ID, amount and date in front of you.</li>
          <li>3. File a written complaint at <strong>cybercrime.gov.in</strong> and keep the acknowledgement number.</li>
        </ol>
        <p className="mt-2">
          Find your bank&apos;s number on the back of your card or in your passbook — not in the message you
          received, and not from a search result.
        </p>
      </Alert>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Official channels</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {urgent.map((r) => (
            <Card key={r.slug}>
              <h3 className="font-semibold">{r.organisation}</h3>
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{r.useWhen}</p>
              <p className="mt-2 text-sm font-medium">{r.phone ? `Phone ${r.phone}` : r.website}</p>
              <p className="mt-2 text-xs text-[var(--fg-subtle)]">Last checked {r.checkedOn}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">About TrustCircle itself</h2>
        <Card className="mt-4">
          <p className="text-sm text-[var(--fg-muted)]">
            This application does not send or receive email — no email provider is configured — so there is no
            contact form here that would quietly discard what you wrote. A form that looks like it submits and
            does nothing would be exactly the kind of false reassurance this product is built to avoid.
          </p>
          <p className="mt-3 text-sm text-[var(--fg-muted)]">
            If you are running this instance yourself, the project README names the repository to raise an
            issue against. If someone else is running it for you, ask them how to reach them — and whoever that
            is, do not send them an OTP, PIN or password either.
          </p>
        </Card>
        <Notice>
          Nobody from TrustCircle will ever call you, message you, or ask you for a code, PIN, password or
          payment. If someone claims to be from TrustCircle and asks for any of those, it is not us.
        </Notice>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Security and privacy reports</h2>
        <Card className="mt-4">
          <p className="text-sm text-[var(--fg-muted)]">
            If you find a way for one account to read another account&apos;s cases, for revoked access to still
            work, or for a credential to be stored unredacted, that is the most valuable thing you could
            report. Raise it against the repository named in the README, with the steps to reproduce.
            Please do not include anyone&apos;s real message content in the report.
          </p>
          <p className="mt-3 text-sm text-[var(--fg-muted)]">
            The current threat model and known residual risks are documented in SECURITY.md, and the data
            handling in <Link href="/privacy" className="text-[var(--accent)] underline">the privacy policy</Link>.
          </p>
        </Card>
      </section>
    </div>
  );
}
