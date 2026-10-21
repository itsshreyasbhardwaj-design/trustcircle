import type { Metadata } from 'next';
import { scanUrlAction } from '@/app/actions/scan';
import { ActionForm } from '@/components/forms';
import { Alert, Card, Field, Notice, SectionTitle, Textarea } from '@/components/ui';

export const metadata: Metadata = { title: 'Check a link' };

export default function ScanUrlPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="TrustScan"
        title="Check a link"
        lead="Paste the address without opening it. If you can only see the link text and not the real address, paste the whole message instead — the mismatch between the two is itself a finding."
      />

      <Alert tone="info" title="The link is never opened">
        TrustCircle does not fetch, follow, resolve or render the address. It is inspected purely as text:
        domain structure, look-alike characters, redirect indicators and file types. That means a brand-new
        scam site looks exactly like any other unknown domain here — there is no reputation lookup behind this.
      </Alert>

      <Card>
        <ActionForm action={scanUrlAction} submitLabel="Check this link" pendingLabel="Checking…">
          <Field
            label="The address, or the message containing it"
            htmlFor="content"
            hint="Long-press the link and copy the address rather than tapping it."
            required
          >
            <Textarea
              id="content"
              name="content"
              required
              autoFocus
              maxLength={20000}
              className="min-h-28 font-mono text-xs"
              placeholder="https://…"
            />
          </Field>
        </ActionForm>
      </Card>

      <Notice>
        A padlock and &ldquo;https://&rdquo; mean the connection is encrypted. They say nothing about who is on
        the other end — a scam site can obtain a certificate in minutes.
      </Notice>
    </div>
  );
}
