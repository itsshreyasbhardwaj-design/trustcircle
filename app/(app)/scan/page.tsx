import type { Metadata } from 'next';
import { getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { ScanTiles } from '@/components/scan-tiles';
import { Alert, Card, SectionTitle } from '@/components/ui';
import type { Lang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Check something' };

export default async function ScanHubPage() {
  const user = await requireUser();
  const lang = getSettings(user.id).language as Lang;

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="TrustScan"
        title="What do you want to check?"
        lead="Pick whichever matches what you have. All four run the same rules — the difference is only how the content gets in."
      />
      <ScanTiles lang={lang} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">What happens to what you submit</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
            <li className="ml-5 list-disc">Codes, PINs, card numbers, Aadhaar and PAN are removed before anything is saved.</li>
            <li className="ml-5 list-disc">Screenshots and QR images are read on your device and never uploaded.</li>
            <li className="ml-5 list-disc">Links are inspected as text. Nothing is opened, fetched or followed.</li>
            <li className="ml-5 list-disc">Saved content is encrypted at rest and visible only to you.</li>
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">What you will get back</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
            <li className="ml-5 list-disc">Each warning sign found, with the words that triggered it.</li>
            <li className="ml-5 list-disc">A list of what could not be established.</li>
            <li className="ml-5 list-disc">A verification route through a channel you already had.</li>
            <li className="ml-5 list-disc">The option to ask someone in your circle.</li>
          </ul>
        </Card>
      </div>

      <Alert tone="info" title="What you will never get back">
        A verdict that something is safe, a probability, or a claim about who sent it. Those would all be
        invented, so they are not offered.
      </Alert>
    </div>
  );
}
