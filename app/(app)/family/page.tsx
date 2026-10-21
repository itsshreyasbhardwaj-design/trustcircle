import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { getEntitlement } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { listCircles, possibleReviewers } from '@/lib/family';
import { createCircleAction, acceptInvitationAction } from '@/app/actions/family';
import { ActionForm } from '@/components/forms';
import { Alert, Badge, ButtonLink, Card, EmptyState, Field, Input, Notice, SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Trusted circle' };

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ left?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const circles = listCircles(user.id);
  const contacts = possibleReviewers(user.id);
  const entitlement = getEntitlement(user.id);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="FamilyShield"
        title="Your trusted circle"
        lead="The people you can ask for a second opinion. Membership on its own gives nobody access to anything you check."
      />

      {params.left && <Alert tone="info">You left that circle. Every case you had shared through it is no longer accessible to its members.</Alert>}

      <Alert tone="info" title="What a circle is not">
        It is not a monitoring tool. No member — including an administrator — can see anyone else&apos;s checks,
        history or activity. Access exists only for a case someone has explicitly shared.
      </Alert>

      {circles.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" aria-hidden />}
          title="No circle yet"
          body="Create one and invite the people you would actually ring before paying someone you do not know."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {circles.map((c) => (
            <li key={c.id}>
              <Link href={`/family/${c.id}`} className="tc-tap block rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-5 shadow-[var(--shadow-card)] hover:border-[var(--accent)]">
                <div className="flex items-center gap-2">
                  <h2 className="min-w-0 flex-1 truncate font-semibold">{c.name}</h2>
                  <Badge tone={c.role === 'admin' ? 'accent' : 'neutral'}>{c.role}</Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--fg-muted)]">
                  {c.member_count} of {entitlement.max_members} member{c.member_count === 1 ? '' : 's'} · created{' '}
                  {new Date(c.created_at).toLocaleDateString('en-IN')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Create a circle</h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            Your plan allows up to {entitlement.max_members} people per circle.
          </p>
          <div className="mt-4">
            <ActionForm action={createCircleAction} submitLabel="Create circle" pendingLabel="Creating…">
              <Field label="Circle name" htmlFor="name" hint="Something you will recognise, like a family name." required>
                <Input id="name" name="name" required maxLength={80} placeholder="e.g. Sharma family" />
              </Field>
            </ActionForm>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Join with an invitation link</h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            Paste the whole link you were sent, or just the token at the end of it.
          </p>
          <div className="mt-4">
            <ActionForm action={acceptInvitationAction} submitLabel="Join circle" pendingLabel="Joining…">
              <Field label="Invitation link or token" htmlFor="token" required>
                <Input id="token" name="token" required maxLength={400} className="font-mono text-xs" placeholder="/family/join?token=…" />
              </Field>
            </ActionForm>
          </div>
          <Notice>
            Links expire seven days after they are created and can be cancelled by whoever made them. Only a
            hash of the token is stored, so nobody — including the server operator — can reconstruct a link
            from the database.
          </Notice>
        </Card>
      </div>

      {contacts.length > 0 && (
        <Card>
          <h2 className="font-semibold">People you can ask</h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            Everyone you currently share a circle with. You can send any one of them a specific case.
          </p>
          <ul className="mt-4 space-y-2">
            {contacts.map((c) => (
              <li key={`${c.user_id}-${c.circle_id}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5 text-sm">
                <span className="font-medium">{c.display_name}</span>
                <span className="text-[var(--fg-subtle)]">{c.email}</span>
                <Badge className="ml-auto">{c.circle_name}</Badge>
              </li>
            ))}
          </ul>
          <ButtonLink href="/history" tone="secondary" className="mt-4">Pick a case to share</ButtonLink>
        </Card>
      )}
    </div>
  );
}
