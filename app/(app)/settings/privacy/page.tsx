import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Lock, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { getEntitlement, getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { listGrantsBy } from '@/lib/authz';
import { countScans } from '@/lib/scans';
import { all, one } from '@/lib/db';
import { deleteAllScansAction, importDemoAction } from '@/app/actions/scan';
import { revokeGrantAction } from '@/app/actions/reviews';
import { setPlanAction } from '@/app/actions/auth';
import { ActionButton, ActionForm } from '@/components/forms';
import { Alert, Badge, ButtonLink, Card, Field, Input, Notice, SectionTitle, Stat } from '@/components/ui';
import { demoCases } from '@/lib/data/demo';

export const metadata: Metadata = { title: 'Privacy and data' };

export default async function PrivacySettingsPage() {
  const user = await requireUser();
  const settings = getSettings(user.id);
  const entitlement = getEntitlement(user.id);
  const grants = listGrantsBy(user.id);
  const scanCount = countScans(user.id);

  const counts = {
    checklists: one<{ n: number }>('SELECT COUNT(*) AS n FROM verification_checklist WHERE owner_user_id = ?', user.id)?.n ?? 0,
    recovery: one<{ n: number }>('SELECT COUNT(*) AS n FROM recovery_case WHERE owner_user_id = ?', user.id)?.n ?? 0,
    attachments: one<{ n: number; bytes: number }>('SELECT COUNT(*) AS n, COALESCE(SUM(byte_size),0) AS bytes FROM attachment WHERE owner_user_id = ?', user.id),
    reviews: one<{ n: number }>('SELECT COUNT(*) AS n FROM review_request WHERE owner_user_id = ?', user.id)?.n ?? 0,
  };
  const demoCount = all<{ n: number }>('SELECT COUNT(*) AS n FROM scan_case WHERE owner_user_id = ? AND is_demo = 1', user.id)[0]?.n ?? 0;

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Settings" title="Privacy and data" lead="Everything TrustCircle holds about you, and the controls for removing it." />

      <nav className="flex flex-wrap gap-2" aria-label="Settings sections">
        <Link href="/settings" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg-muted)]">
          <SlidersHorizontal className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> General
        </Link>
        <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-sm text-[var(--accent)]">
          <Lock className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Privacy &amp; data
        </span>
        <Link href="/settings/security" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg-muted)]">
          <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Security
        </Link>
      </nav>

      <section>
        <h2 className="mb-3 text-lg font-semibold">What is stored</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Saved checks" value={scanCount} hint={`Limit ${entitlement.history_limit}`} />
          <Stat label="Checklists" value={counts.checklists} />
          <Stat label="Recovery cases" value={counts.recovery} />
          <Stat
            label="Attachments"
            value={counts.attachments?.n ?? 0}
            hint={`${Math.round((counts.attachments?.bytes ?? 0) / 1024)} KB`}
          />
        </div>
        <Notice>
          Message content and finding excerpts are encrypted at rest with a key held outside the database.
          Credentials found in content — codes, PINs, card numbers, Aadhaar, PAN — are removed before anything
          is written, so they are not in there to export or leak. Screenshots are never uploaded at all.
        </Notice>
      </section>

      <Card>
        <h2 className="flex items-center gap-2 font-semibold">
          <Download className="h-4.5 w-4.5 text-[var(--accent)]" aria-hidden /> Export everything
        </h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          One JSON file with your account, settings, every check (content decrypted), checklists, circles,
          reviews, comments, active shares, recovery cases, learning progress, notifications and account
          activity. Attachment contents are not included — download those individually from each case.
        </p>
        <ButtonLink href="/api/export" tone="secondary" className="mt-4">Download my data</ButtonLink>
        <p className="mt-3 text-xs text-[var(--fg-subtle)]">
          The file contains your message content in readable form. Treat it as sensitive.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold">What you have shared</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Every active permission you have given. Withdrawal takes effect on the server immediately.
        </p>
        {grants.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--fg-muted)]">Nothing is shared with anyone.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {grants.map((g) => (
              <li key={g.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{g.grantee_name}</Badge>
                  <Badge>{g.resource_type === 'scan_case' ? 'Check' : 'Recovery case'}</Badge>
                  <Badge>{g.scope === 'findings_and_content' ? 'Findings + content' : 'Findings only'}</Badge>
                  <span className="ml-auto text-xs text-[var(--fg-subtle)]">{new Date(g.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                {g.resource_title && <p className="mt-2 truncate text-sm text-[var(--fg-muted)]">{g.resource_title}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {g.review_request_id && (
                    <Link href={`/reviews/${g.review_request_id}`} className="text-sm text-[var(--accent)] underline">Open request</Link>
                  )}
                  <ActionButton
                    action={revokeGrantAction}
                    label="Withdraw access"
                    tone="danger"
                    fields={{ grantId: g.id }}
                    confirm={`Withdraw ${g.grantee_name}'s access to this?`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Demo data</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Imports {demoCases.length} clearly-labelled fictional cases so you can click through real results.
          Nothing fictional is ever put in your account unless you ask for it here.
          {demoCount > 0 && ` You currently have ${demoCount} demo case${demoCount === 1 ? '' : 's'}.`}
        </p>
        <div className="mt-4">
          <ActionButton action={importDemoAction} label="Import demo cases" tone="secondary" />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Plan (development simulation)</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Current plan: <Badge>{entitlement.plan}</Badge> — {entitlement.max_members} circle seats,{' '}
          {entitlement.max_reviewers} reviewer{entitlement.max_reviewers === 1 ? '' : 's'} per request,{' '}
          {entitlement.history_limit} saved checks.
        </p>
        <Alert tone="caution" className="mt-4" title="No payment is involved">
          No payment provider is connected to this application. Switching here changes entitlements for
          development and evaluation only, records itself in the database as a simulation, and creates no
          transaction, invoice or receipt. See <Link href="/pricing">plans</Link>.
        </Alert>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton action={setPlanAction} label="Simulate Free" tone="secondary" fields={{ plan: 'free' }} />
          <ActionButton action={setPlanAction} label="Simulate Family" tone="secondary" fields={{ plan: 'family' }} />
        </div>
      </Card>

      <Card tone="sunken">
        <h2 className="font-semibold">Delete all saved checks</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Removes {scanCount} case{scanCount === 1 ? '' : 's'} with their findings, excerpts, and any sharing
          attached to them. Your circles, recovery cases and learning progress are untouched.
        </p>
        <div className="mt-4">
          <ActionForm action={deleteAllScansAction} submitLabel="Delete all checks" submitTone="danger">
            <Field label="Type DELETE to confirm" htmlFor="confirm" required>
              <Input id="confirm" name="confirm" required placeholder="DELETE" autoComplete="off" />
            </Field>
          </ActionForm>
        </div>
      </Card>

      <Card tone="sunken">
        <h2 className="font-semibold">Retention</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Currently {settings.retention_days === 0 ? 'keeping checks until you delete them' : `deleting checks after ${settings.retention_days} days`}.
          Change it in <Link href="/settings" className="text-[var(--accent)] underline">general settings</Link>.
          Expired cases are removed when you next open the app — there is no background scheduler in this
          deployment, and pretending otherwise would be fiction.
        </p>
      </Card>
    </div>
  );
}
