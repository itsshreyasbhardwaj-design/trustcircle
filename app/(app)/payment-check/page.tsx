import type { Metadata } from 'next';
import Link from 'next/link';
import { scanPaymentAction } from '@/app/actions/scan';
import { ActionForm } from '@/components/forms';
import { Alert, Card, Field, Input, Notice, SectionTitle, Select, Textarea } from '@/components/ui';
import { requireUser } from '@/lib/session';
import { listScans } from '@/lib/scans';

export const metadata: Metadata = { title: 'Review a payment request' };

export default async function PaymentCheckPage() {
  const user = await requireUser();
  const recent = listScans(user.id, { limit: 5 }).filter((s) => s.kind === 'payment');

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="PaymentPause"
        title="Review a payment request before money moves"
        lead="Describe what you have been asked to pay, and paste the UPI link or QR contents if you have them. Nothing here moves money."
      />

      <Alert tone="caution" title="This is a review tool, not a payment app">
        TrustCircle never initiates a payment, never opens a payment app, and has no connection to any bank or
        payment provider. It also cannot tell you who owns an account — only your bank can do that.
      </Alert>

      <Card>
        <ActionForm action={scanPaymentAction} submitLabel="Review this request" pendingLabel="Reviewing…">
          <Field
            label="Who are you being asked to pay?"
            htmlFor="claimedPayee"
            hint="The name they gave you. Remember that the name shown at payment time is typed in by whoever made the code — it is not checked by anyone."
          >
            <Input id="claimedPayee" name="claimedPayee" maxLength={200} placeholder="e.g. a courier company, a shop, a relative" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₹)" htmlFor="amountRupees">
              <Input id="amountRupees" name="amountRupees" inputMode="decimal" maxLength={20} placeholder="2499" />
            </Field>
            <Field label="How did the request arrive?" htmlFor="channel">
              <Select id="channel" name="channel" defaultValue="">
                <option value="">Choose…</option>
                <option>SMS</option>
                <option>WhatsApp</option>
                <option>Phone call</option>
                <option>Email</option>
                <option>In person / shop counter</option>
                <option>Social media or marketplace</option>
                <option>Other</option>
              </Select>
            </Field>
          </div>

          <Field
            label="What is the payment for, in their words?"
            htmlFor="reason"
            hint="Paste their explanation. The wording is what the rules look at."
          >
            <Textarea id="reason" name="reason" maxLength={1000} className="min-h-24" placeholder="e.g. &quot;processing fee to release your refund&quot;" />
          </Field>

          <Field
            label="UPI link or QR contents"
            htmlFor="content"
            hint="Optional. If you have a upi:// link or the decoded text of a QR code, paste it and each field will be explained."
          >
            <Textarea id="content" name="content" maxLength={20000} className="min-h-20 font-mono text-xs" placeholder="upi://pay?pa=…" />
          </Field>
        </ActionForm>
      </Card>

      <Notice>
        Need to decode a QR image first? Use <Link href="/scan/qr" className="underline">check a QR code</Link> —
        it reads the image in your browser and shows you the contents to paste here.
      </Notice>

      {recent.length > 0 && (
        <Card>
          <h2 className="font-semibold">Your recent payment reviews</h2>
          <ul className="mt-3 space-y-2">
            {recent.map((s) => (
              <li key={s.id}>
                <Link href={`/scan/results/${s.id}`} className="text-sm text-[var(--accent)] hover:underline">
                  {s.headline} — {new Date(s.created_at).toLocaleString('en-IN')}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
