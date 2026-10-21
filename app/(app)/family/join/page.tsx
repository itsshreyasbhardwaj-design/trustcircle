import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { previewInvitation } from '@/lib/family';
import { acceptInvitationAction } from '@/app/actions/family';
import { ActionForm } from '@/components/forms';
import { Alert, ButtonLink, Card, Notice, SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Join a circle' };

const REASON: Record<string, string> = {
  not_found: 'This invitation link is not valid. Check that you copied the whole thing.',
  expired: 'This invitation has expired. Invitations last seven days — ask for a new link.',
  revoked: 'This invitation was cancelled by the person who created it.',
  used: 'This invitation has already been used. Each link works once.',
};

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const user = await requireUser();
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card className="mx-auto max-w-lg">
        <h1 className="text-xl font-semibold">No invitation link</h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Open the link you were sent, or paste it on the circles page.
        </p>
        <ButtonLink href="/family" tone="secondary" className="mt-4">Go to circles</ButtonLink>
      </Card>
    );
  }

  const preview = previewInvitation(token, user.id);

  if (!preview.ok) {
    return (
      <Card className="mx-auto max-w-lg">
        <h1 className="text-xl font-semibold">That invitation cannot be used</h1>
        <Alert tone="caution" className="mt-4">{REASON[preview.reason]}</Alert>
        <ButtonLink href="/family" tone="secondary" className="mt-4">Go to circles</ButtonLink>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <SectionTitle eyebrow="FamilyShield" title={`Join “${preview.circleName}”`} lead={`${preview.invitedBy} invited you.`} />

      {preview.alreadyMember ? (
        <Card>
          <p className="text-sm text-[var(--fg-muted)]">You are already a member of this circle.</p>
          <ButtonLink href={`/family/${preview.circleId}`} className="mt-4">Open the circle</ButtonLink>
        </Card>
      ) : (
        <Card>
          <h2 className="font-semibold">What joining does</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
            <li className="ml-5 list-disc">You can be asked for a second opinion on a specific case.</li>
            <li className="ml-5 list-disc">You can ask the others for a second opinion on yours.</li>
          </ul>
          <h2 className="mt-5 font-semibold">What joining does not do</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
            <li className="ml-5 list-disc">It gives nobody access to your checks or your history.</li>
            <li className="ml-5 list-disc">It gives you no access to theirs.</li>
            <li className="ml-5 list-disc">There is no monitoring and no administrator override.</li>
          </ul>
          <div className="mt-5">
            <ActionForm action={acceptInvitationAction} submitLabel="Join this circle" pendingLabel="Joining…" wide>
              <input type="hidden" name="token" value={token} />
            </ActionForm>
          </div>
          <Notice>
            Joined by mistake? You can leave at any time from the circle page, which also withdraws anything
            you had shared through it. Or simply{' '}
            <Link href="/dashboard" className="underline">go to your dashboard</Link> and ignore this.
          </Notice>
        </Card>
      )}
    </div>
  );
}
