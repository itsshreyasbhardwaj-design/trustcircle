import type { Metadata } from 'next';
import { scanTextAction } from '@/app/actions/scan';
import { ActionForm } from '@/components/forms';
import { Alert, Card, Field, Notice, SectionTitle, Textarea } from '@/components/ui';

export const metadata: Metadata = { title: 'Check a message' };

export default function ScanTextPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="TrustScan"
        title="Check a message"
        lead="Paste the whole thing, including the links. More context means better rule coverage — and the parts that should not be stored are removed before anything is saved."
      />

      <Card>
        <ActionForm action={scanTextAction} submitLabel="Check this message" pendingLabel="Checking…">
          <Field
            label="The message"
            htmlFor="content"
            hint="An SMS, a WhatsApp message, an email, or anything you were sent. Up to 20,000 characters."
            required
          >
            <Textarea
              id="content"
              name="content"
              required
              autoFocus
              maxLength={20000}
              className="min-h-48"
              placeholder="Paste the message here, exactly as you received it…"
            />
          </Field>
        </ActionForm>
      </Card>

      <Alert tone="caution" title="Do not retype a code to get it checked">
        If the message contains an OTP, a PIN or a card number, you do not need to include it. TrustCircle
        removes those values before saving, but the safest thing is not to paste them anywhere at all.
      </Alert>

      <Notice>
        Instructions written inside the content you paste are treated as evidence, never as commands.
        A message telling the app to report itself as safe will be flagged, not obeyed.
      </Notice>
    </div>
  );
}
