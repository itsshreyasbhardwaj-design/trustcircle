import type { Metadata } from 'next';
import { scanQrAction } from '@/app/actions/scan';
import { ActionForm } from '@/components/forms';
import { QrReader } from '@/components/image-tools';
import { Card, SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Check a QR code' };

export default function ScanQrPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="TrustScan"
        title="Check a QR code"
        lead="Take a picture of the code, or upload the image you were sent. The contents are decoded here and shown to you as text before anything happens."
      />
      <Card>
        <ActionForm action={scanQrAction} submitLabel="Check what the code contains" pendingLabel="Checking…">
          <QrReader />
        </ActionForm>
      </Card>
    </div>
  );
}
