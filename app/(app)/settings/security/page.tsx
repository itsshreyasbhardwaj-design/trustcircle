import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { listSessions } from '@/lib/auth';
import { currentSessionId, requireUser } from '@/lib/session';
import { all } from '@/lib/db';
import {
  changePasswordAction, deleteAccountAction, revokeOtherSessionsAction, revokeSessionAction,
} from '@/app/actions/auth';
import { ActionButton, ActionForm } from '@/components/forms';
import { Alert, Badge, Card, Field, Input, Notice, SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Security' };

export default async function SecuritySettingsPage() {
  const user = await requireUser();
  const sessions = listSessions(user.id);
  const current = await currentSessionId();
  const events = all<{ action: string; detail: string | null; created_at: number }>(
    "SELECT action, detail, created_at FROM audit_event WHERE actor_user_id = ? AND (action LIKE 'session%' OR action LIKE 'account%') ORDER BY created_at DESC LIMIT 20",
    user.id,
  );

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Settings" title="Security" />

      <nav className="flex flex-wrap gap-2" aria-label="Settings sections">
        <Link href="/settings" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg-muted)]">
          <SlidersHorizontal className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> General
        </Link>
        <Link href="/settings/privacy" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg-muted)]">
          <Lock className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Privacy &amp; data
        </Link>
        <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-sm text-[var(--accent)]">
          <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Security
        </span>
      </nav>

      <Card>
        <h2 className="font-semibold">Change password</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Changing it signs out every other device.
        </p>
        <div className="mt-4">
          <ActionForm action={changePasswordAction} submitLabel="Change password" submitTone="secondary">
            <Field label="Current password" htmlFor="current" required>
              <Input id="current" name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="New password" htmlFor="next" hint="At least 10 characters." required>
              <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm" required>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
            </Field>
          </ActionForm>
        </div>
        <Notice>
          Passwords are stored as a salted scrypt hash at the OWASP-recommended parameters (N=2^17, r=8, p=1),
          never in readable form. There is no password-reset email, because no email provider is configured —
          the one-time recovery code from registration is the only alternative route in.
        </Notice>
      </Card>

      <Card>
        <h2 className="font-semibold">Signed-in devices</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          {sessions.length} active session{sessions.length === 1 ? '' : 's'}. Only a hash of each session token
          is stored, so these rows cannot be used to impersonate you.
        </p>
        <ul className="mt-4 space-y-2.5">
          {sessions.map((s) => (
            <li key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {s.id === current && <Badge tone="accent">This device</Badge>}
                <span className="min-w-0 truncate text-sm text-[var(--fg-muted)]">{s.user_agent ?? 'Unknown device'}</span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--fg-subtle)]">
                Signed in {new Date(s.created_at).toLocaleString('en-IN')} · last seen{' '}
                {new Date(s.last_seen_at).toLocaleString('en-IN')} · expires{' '}
                {new Date(s.expires_at).toLocaleDateString('en-IN')}
              </p>
              <div className="mt-2">
                <ActionButton
                  action={revokeSessionAction}
                  label={s.id === current ? 'Sign out this device' : 'Sign out'}
                  tone={s.id === current ? 'secondary' : 'danger'}
                  fields={{ sessionId: s.id }}
                />
              </div>
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <div className="mt-4">
            <ActionButton
              action={revokeOtherSessionsAction}
              label="Sign out every other device"
              tone="danger"
              confirm="Sign out all other devices?"
            />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Account activity</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--fg-muted)]">Nothing recorded yet.</p>
        ) : (
          <ol className="mt-4 space-y-2 text-sm">
            {events.map((e, i) => (
              <li key={`${e.created_at}-${i}`} className="flex flex-wrap gap-3">
                <span className="text-xs text-[var(--fg-subtle)] tabular-nums">
                  {new Date(e.created_at).toLocaleString('en-IN')}
                </span>
                <code className="text-xs">{e.action}</code>
                {e.detail && <span className="text-xs text-[var(--fg-subtle)]">{e.detail}</span>}
              </li>
            ))}
          </ol>
        )}
        <Notice>
          This log records actions, never content. If you see a sign-in you do not recognise, change your
          password — that also ends every other session.
        </Notice>
      </Card>

      <Card tone="sunken">
        <h2 className="font-semibold">Delete account</h2>
        <Alert tone="high" className="mt-3" title="This cannot be undone">
          Your account, every check, every finding, every checklist, every recovery case and attachment, your
          comments and your circle memberships are removed from the database by cascading deletion. Nothing is
          kept in a hidden state. Export your data first if you want a copy.
        </Alert>
        <div className="mt-4">
          <ActionForm action={deleteAccountAction} submitLabel="Permanently delete my account" submitTone="danger">
            <Field label="Type your email address to confirm" htmlFor="confirmEmail" hint={user.email} required>
              <Input id="confirmEmail" name="confirmEmail" required autoComplete="off" />
            </Field>
            <Field label="Your password" htmlFor="password" required>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}
