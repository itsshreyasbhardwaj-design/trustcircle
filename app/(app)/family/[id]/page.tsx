import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Crown } from 'lucide-react';
import { getEntitlement } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { getCircle, listInvitations, listMembers } from '@/lib/family';
import { circleLeaderboard } from '@/lib/academy';
import {
  createInvitationAction, leaveCircleAction, promoteMemberAction, removeMemberAction, revokeInvitationAction,
} from '@/app/actions/family';
import { ActionButton, ActionForm } from '@/components/forms';
import { InviteResult } from '@/components/invite-result';
import { Alert, Badge, Card, Field, Input, Notice, SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Circle' };

export default async function CirclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ joined?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();

  let circle;
  try {
    circle = getCircle(user.id, id);
  } catch {
    notFound();
  }
  if (!circle) notFound();

  const members = listMembers(user.id, id);
  const isAdmin = circle.role === 'admin';
  const invitations = isAdmin ? listInvitations(user.id, id) : [];
  const entitlement = getEntitlement(user.id);
  const leaderboard = circleLeaderboard(id);
  const pending = invitations.filter((i) => !i.accepted_at && !i.revoked_at && i.expires_at > Date.now());

  return (
    <div className="space-y-6">
      <Link href="/family" className="tc-tap inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All circles
      </Link>

      {query.joined && <Alert tone="info">You have joined this circle. Nothing has been shared with you — access only ever comes from a specific case someone sends you.</Alert>}

      <SectionTitle
        eyebrow={isAdmin ? 'You administer this circle' : 'You are a member'}
        title={circle.name}
        lead={`${members.length} of ${entitlement.max_members} seats used on your plan.`}
      />

      <Card>
        <h2 className="font-semibold">Members</h2>
        <ul className="mt-4 space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]" aria-hidden>
                {m.display_name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {m.display_name}
                  {m.user_id === user.id && <span className="ml-1.5 text-xs text-[var(--fg-subtle)]">(you)</span>}
                </span>
                <span className="block text-xs text-[var(--fg-subtle)]">{m.email}</span>
              </span>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                <Badge tone={m.role === 'admin' ? 'accent' : 'neutral'}>{m.role}</Badge>
                {isAdmin && m.user_id !== user.id && m.role !== 'admin' && (
                  <ActionButton
                    action={promoteMemberAction}
                    label="Make admin"
                    tone="ghost"
                    fields={{ circleId: id, userId: m.user_id }}
                    confirm={`Let ${m.display_name} manage this circle? It gives them no access to anyone's cases.`}
                  />
                )}
                {isAdmin && m.user_id !== user.id && (
                  <ActionButton
                    action={removeMemberAction}
                    label="Remove"
                    tone="danger"
                    fields={{ circleId: id, userId: m.user_id }}
                    confirm={`Remove ${m.display_name}? Every case shared with them through this circle becomes inaccessible immediately.`}
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
        <Notice>
          <Crown className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          An administrator manages membership and invitations. That is all it means — an administrator cannot
          see any member&apos;s checks, history or activity.
        </Notice>
      </Card>

      {isAdmin && (
        <Card>
          <h2 className="font-semibold">Invite someone</h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            TrustCircle sends no email, so you copy the link and send it to them yourself. The link is shown
            once, expires in seven days, and can be cancelled below.
          </p>
          <div className="mt-4">
            <ActionForm action={createInvitationAction} submitLabel="Create invitation link" pendingLabel="Creating…">
              <Field label="Who is this for?" htmlFor="label" hint="A note for your own reference. It is not sent anywhere.">
                <Input id="label" name="label" maxLength={80} placeholder="e.g. Papa" />
              </Field>
              <input type="hidden" name="circleId" value={id} />
            </ActionForm>
          </div>
          <InviteResult />

          {invitations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold">Invitations</h3>
              <ul className="mt-3 space-y-2">
                {invitations.map((i) => {
                  const expired = !i.accepted_at && !i.revoked_at && i.expires_at <= Date.now();
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm">
                      <span className="font-medium">{i.label ?? 'Unlabelled'}</span>
                      {i.accepted_at ? (
                        <Badge>Accepted by {i.accepted_by_name ?? 'a member'}</Badge>
                      ) : i.revoked_at ? (
                        <Badge>Cancelled</Badge>
                      ) : expired ? (
                        <Badge tone="caution">Expired</Badge>
                      ) : (
                        <Badge tone="accent">Pending</Badge>
                      )}
                      <span className="text-xs text-[var(--fg-subtle)]">
                        created {new Date(i.created_at).toLocaleDateString('en-IN')}
                        {!i.accepted_at && !i.revoked_at && ` · expires ${new Date(i.expires_at).toLocaleDateString('en-IN')}`}
                      </span>
                      {!i.accepted_at && !i.revoked_at && !expired && (
                        <span className="ml-auto">
                          <ActionButton action={revokeInvitationAction} label="Cancel link" tone="ghost" fields={{ circleId: id, inviteId: i.id }} />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {members.length + pending.length >= entitlement.max_members && (
            <Alert tone="caution" className="mt-4" title="Seats are full on your plan">
              This circle has {members.length} member{members.length === 1 ? '' : 's'} and {pending.length} pending
              invitation{pending.length === 1 ? '' : 's'}, which fills the {entitlement.max_members} seats your
              plan allows. Cancel a pending invitation, remove a member, or see{' '}
              <Link href="/pricing">plans</Link>.
            </Alert>
          )}
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">Family learning challenge</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Lesson completion counts only. No scores, no answers, and nothing about anyone&apos;s checks.
        </p>
        <ul className="mt-4 space-y-2">
          {leaderboard.map((row) => (
            <li key={row.display_name} className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{row.display_name}</span>
              <Badge>{row.completed} lesson{row.completed === 1 ? '' : 's'}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card tone="sunken">
        <h2 className="font-semibold">Leave this circle</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Leaving withdraws every case you shared through this circle, immediately and on the server.
          {isAdmin && ' As the only administrator you will need to promote someone else first, unless you are the last member.'}
        </p>
        <div className="mt-4">
          <ActionButton
            action={leaveCircleAction}
            label="Leave circle"
            tone="danger"
            fields={{ circleId: id }}
            confirm="Leave this circle? Cases you shared through it will no longer be accessible to its members."
          />
        </div>
      </Card>
    </div>
  );
}
