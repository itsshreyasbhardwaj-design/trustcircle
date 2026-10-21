import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { getEntitlement, getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { updateProfileAction, updateSettingsAction } from '@/app/actions/auth';
import { ActionForm } from '@/components/forms';
import { Badge, Card, Checkbox, Field, Input, Notice, SectionTitle, Select } from '@/components/ui';
import { LANGUAGES, coverage, t, type Lang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = getSettings(user.id);
  const entitlement = getEntitlement(user.id);
  const lang = settings.language as Lang;
  const cov = coverage();

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Settings" title={t(lang, 'nav.settings').text} />

      <nav className="flex flex-wrap gap-2" aria-label="Settings sections">
        <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-sm text-[var(--accent)]">
          <SlidersHorizontal className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> General
        </span>
        <Link href="/settings/privacy" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg-muted)]">
          <Lock className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Privacy &amp; data
        </Link>
        <Link href="/settings/security" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg-muted)]">
          <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" aria-hidden /> Security
        </Link>
      </nav>

      <Card>
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Signed in as <strong>{user.email}</strong>. The email address cannot be changed, because there is no
          email provider to verify a new one with.
        </p>
        <div className="mt-4">
          <ActionForm action={updateProfileAction} submitLabel="Save name" submitTone="secondary">
            <Field label={t(lang, 'label.name').text} htmlFor="displayName" hint="Shown to people in your circles." required>
              <Input id="displayName" name="displayName" defaultValue={user.display_name} required maxLength={80} />
            </Field>
          </ActionForm>
        </div>
        <p className="mt-4 text-xs text-[var(--fg-subtle)]">
          Account created {new Date(user.created_at).toLocaleDateString('en-IN')} · plan{' '}
          <Badge>{entitlement.plan}</Badge>
          {entitlement.source === 'dev_simulation' && <Badge tone="caution" className="ml-1.5">development simulation</Badge>}
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold">Language and accessibility</h2>
        <div className="mt-4">
          <ActionForm action={updateSettingsAction} submitLabel={t(lang, 'action.save').text} submitTone="secondary">
            <Field
              label={t(lang, 'label.language').text}
              htmlFor="language"
              hint="Untranslated text is shown in English and labelled as English — never passed off as a translation."
            >
              <Select id="language" name="language" defaultValue={settings.language}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native} ({l.label}) — {cov[l.code].translated}/{cov[l.code].total} strings
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t(lang, 'label.textSize').text} htmlFor="textScale" hint="Scales the entire interface, not just body text.">
              <Select id="textScale" name="textScale" defaultValue={settings.text_scale}>
                <option value="normal">Normal</option>
                <option value="large">Large (112%)</option>
                <option value="xlarge">Extra large (131%)</option>
              </Select>
            </Field>

            <Field label="Appearance" htmlFor="theme">
              <Select id="theme" name="theme" defaultValue={settings.theme}>
                <option value="system">Match my device</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </Field>

            <Checkbox
              name="reduceMotion"
              value="1"
              defaultChecked={settings.reduce_motion === 1}
              label={t(lang, 'label.reduceMotion').text}
              hint="Also applied automatically when your device asks for reduced motion."
            />

            <Field label="Keep my saved checks for" htmlFor="retentionDays" hint="Cases past this age are deleted, along with their findings and any sharing attached to them.">
              <Select id="retentionDays" name="retentionDays" defaultValue={String(settings.retention_days)}>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="0">Until I delete them</option>
              </Select>
            </Field>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Notify me about</legend>
              <Checkbox name="notifyReviews" value="1" defaultChecked={settings.notify_reviews === 1} label="Second-opinion requests and comments" />
              <Checkbox name="notifyInvitations" value="1" defaultChecked={settings.notify_invitations === 1} label="Circle invitations" />
              <Checkbox checked disabled label="Account-security events" hint="Always on. Password changes and sign-in events are not optional." />
            </fieldset>
          </ActionForm>
        </div>
        <Notice>
          These translations were written by the project author and have not been reviewed by a professional
          translator. Detection rules for Hindi and Bengali cover the most common phrases only, and any result
          containing those scripts says so on the result itself.
        </Notice>
      </Card>
    </div>
  );
}
