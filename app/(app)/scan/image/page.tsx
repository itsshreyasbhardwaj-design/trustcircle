import type { Metadata } from 'next';
import { scanImageAction } from '@/app/actions/scan';
import { ActionForm } from '@/components/forms';
import { ScreenshotReader } from '@/components/image-tools';
import { Card, SectionTitle, Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Check a screenshot' };

export default function ScanImagePage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="TrustScan"
        title="Check a screenshot"
        lead="Useful when forwarding the message is not possible — a payment screen, a call log, a message in another app."
      />

      <Alert tone="info" title="The image stays on your device">
        Text extraction runs in your browser using a local engine. No image is uploaded, no cloud OCR service
        is involved, and no API key exists for one. Only the text you confirm below is sent to the server.
      </Alert>

      <Card>
        <ActionForm action={scanImageAction} submitLabel="Check this text" pendingLabel="Checking…">
          <ScreenshotReader />
        </ActionForm>
      </Card>
    </div>
  );
}
