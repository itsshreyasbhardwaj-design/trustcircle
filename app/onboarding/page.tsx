import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, Languages, ScanLine, ShieldAlert, Users } from 'lucide-react';
import { getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { setOnboardingStepAction } from '@/app/actions/misc';
import { updateSettingsAction as saveSettings } from '@/app/actions/auth';
import { ActionButton, ActionForm } from '@/components/forms';
import { Alert, Badge, ButtonLink, Card, Checkbox, Field, Notice, Select } from '@/components/ui';
import { DemoCaseView } from '@/components/demo';
import { demoBySlug } from '@/lib/data/demo';
import { LANGUAGES } from '@/lib/i18n';
import { Logo } from '@/components/site';

export const metadata: Metadata = { title: 'Getting started' };

const TOTAL = 6;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; recovery?: string }>;
}) {
  const user = await requireUser();
  const settings = getSettings(user.id);
  const params = await searchParams;
  const step = Math.max(1, Math.min(Number(params.step ?? (settings.onboarding_step || 1)), TOTAL));
  const recovery = params.recovery;
  const demo = demoBySlug('bank-kyc')!;

  const next = (n: number) => `/onboarding?step=${n}${recovery ? `&recovery=${encodeURIComponent(recovery)}` : ''}`;

  return (
    <div className="tc-grid-bg min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-5">
        <Link href="/dashboard" className="tc-tap inline-flex items-center"><Logo /></Link>
        <span className="text-sm text-[var(--fg-subtle)]">Step {step} of {TOTAL}</span>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 pb-20">
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]" role="presentation">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>

        {step === 1 && (
          <Card className="tc-rise">
            <Badge tone="accent">Welcome</Badge>
            <h1 className="mt-4 text-2xl font-semibold">Welcome to TrustCircle, {user.display_name.split(' ')[0]}</h1>
            <p className="mt-3 text-[var(--fg-muted)]">
              TrustCircle helps you with one specific moment: a message arrives, it wants something from you,
              and you are not sure. It gives you two things — a plain explanation of what looks wrong, and an
              easy way to ask someone you trust.
            </p>

            {recovery && (
              <div className="mt-6 rounded-xl border border-[var(--caution-border)] bg-[var(--caution-bg)] p-4">
                <p className="flex items-center gap-2 font-semibold text-[var(--caution-fg)]">
                  <KeyRound className="h-4.5 w-4.5" aria-hidden /> Write this recovery code down now
                </p>
                <p className="mt-2 font-mono text-lg font-semibold tracking-wider text-[var(--caution-fg)]">{recovery}</p>
                <p className="mt-2 text-sm text-[var(--caution-fg)] opacity-90">
                  This is shown once and is not stored anywhere in readable form. Because TrustCircle has no
                  email provider, there is no password-reset email — this code is the only way to prove the
                  account is yours. If it is lost, the account cannot be recovered.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={next(2)}>Continue</ButtonLink>
              <ActionButton action={setOnboardingStepAction} label="Skip the introduction" tone="ghost" fields={{ step: '6', done: '1' }} />
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="tc-rise">
            <Badge tone="accent">How a check works</Badge>
            <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold">
              <ScanLine className="h-6 w-6 text-[var(--accent)]" aria-hidden /> You paste it, the rules read it
            </h1>
            <ul className="mt-4 space-y-3 text-[var(--fg-muted)]">
              <li className="ml-5 list-disc">Anything that should not be stored — a code, a PIN, a card number — is removed before anything is saved.</li>
              <li className="ml-5 list-disc">A published list of rules looks for known patterns in the words, the links and any payment code.</li>
              <li className="ml-5 list-disc">Every finding quotes the text that triggered it, so you can judge the rule as well as the message.</li>
              <li className="ml-5 list-disc">Screenshots and QR codes are read in your own browser. The image never leaves your device.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={next(3)}>Continue</ButtonLink>
              <ButtonLink href={next(1)} tone="ghost">Back</ButtonLink>
            </div>
          </Card>
        )}

        {step === 3 && (
          <div className="tc-rise space-y-5">
            <Card>
              <Badge tone="high">The most important thing on this screen</Badge>
              <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold">
                <ShieldAlert className="h-6 w-6 text-[var(--alert-fg)]" aria-hidden /> A result is never a safety guarantee
              </h1>
              <p className="mt-3 text-[var(--fg-muted)]">
                TrustCircle will tell you what is suspicious. It will never tell you that something is safe,
                because it cannot know. It cannot verify who sent a message, who owns a bank account or a UPI
                ID, or whether a business is real.
              </p>
              <Alert tone="caution" className="mt-4" title="So read a quiet result carefully">
                &ldquo;No known warning signs identified&rdquo; means these particular rules matched nothing. It is a
                statement about the checks, not about the message. Anything asking for money, codes or personal
                details still needs independent verification.
              </Alert>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={next(4)}>I understand</ButtonLink>
                <ButtonLink href={next(2)} tone="ghost">Back</ButtonLink>
              </div>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="tc-rise space-y-5">
            <Card>
              <Badge tone="accent">Verification</Badge>
              <h1 className="mt-4 text-2xl font-semibold">The part that actually settles it</h1>
              <p className="mt-3 text-[var(--fg-muted)]">
                Findings tell you something looks wrong. Verification tells you the truth. Every checklist
                TrustCircle produces routes you through a channel you already had — your own app, the number
                printed on your card, a contact already in your phone. Never the number in the message.
              </p>
            </Card>
            <DemoCaseView demo={demo} />
            <Card>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={next(5)}>Continue</ButtonLink>
                <ButtonLink href={next(3)} tone="ghost">Back</ButtonLink>
              </div>
            </Card>
          </div>
        )}

        {step === 5 && (
          <Card className="tc-rise">
            <Badge tone="accent">Trusted contacts</Badge>
            <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold">
              <Users className="h-6 w-6 text-[var(--accent)]" aria-hidden /> Asking should cost you no privacy
            </h1>
            <p className="mt-3 text-[var(--fg-muted)]">
              A circle is simply the group of people you can ask for a second opinion. Being in one gives
              nobody access to anything at all.
            </p>
            <ul className="mt-4 space-y-2 text-[var(--fg-muted)]">
              <li className="ml-5 list-disc">You share one case at a time, with the people you pick.</li>
              <li className="ml-5 list-disc">You choose whether they see the message or only the findings.</li>
              <li className="ml-5 list-disc">You can withdraw access at any time, and the server enforces it.</li>
              <li className="ml-5 list-disc">No reviewer can mark anything as safe. That option does not exist.</li>
            </ul>
            <Notice>
              Invitations work by copying a link and sending it yourself, because TrustCircle has no email
              provider and sends no email. Links expire after seven days.
            </Notice>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={next(6)}>Continue</ButtonLink>
              <ButtonLink href="/family" tone="secondary">Set up a circle now</ButtonLink>
              <ButtonLink href={next(4)} tone="ghost">Back</ButtonLink>
            </div>
          </Card>
        )}

        {step === 6 && (
          <Card className="tc-rise">
            <Badge tone="accent">Preferences</Badge>
            <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold">
              <Languages className="h-6 w-6 text-[var(--accent)]" aria-hidden /> Language and reading comfort
            </h1>
            <p className="mt-3 text-[var(--fg-muted)]">
              You can change these at any time in settings.
            </p>
            <div className="mt-5">
              <ActionForm action={saveSettings} submitLabel="Save and open my dashboard" pendingLabel="Saving…">
                <Field label="Language" htmlFor="language" hint="Navigation and safety guidance are translated. Untranslated text is shown in English and labelled as English.">
                  <Select id="language" name="language" defaultValue={settings.language}>
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.native} ({l.label})</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Text size" htmlFor="textScale">
                  <Select id="textScale" name="textScale" defaultValue={settings.text_scale}>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                    <option value="xlarge">Extra large</option>
                  </Select>
                </Field>
                <Field label="Appearance" htmlFor="theme">
                  <Select id="theme" name="theme" defaultValue={settings.theme}>
                    <option value="system">Match my device</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </Select>
                </Field>
                <Checkbox name="reduceMotion" value="1" defaultChecked={settings.reduce_motion === 1} label="Reduce animation" hint="Also honoured automatically if your device asks for reduced motion." />
                <Field label="Keep my saved checks for" htmlFor="retentionDays">
                  <Select id="retentionDays" name="retentionDays" defaultValue={String(settings.retention_days)}>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="0">Until I delete them</option>
                  </Select>
                </Field>
                <input type="hidden" name="notifyReviews" value="1" />
                <input type="hidden" name="finishOnboarding" value="1" />
                <input type="hidden" name="notifyInvitations" value="1" />
              </ActionForm>
            </div>
            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <ActionButton action={setOnboardingStepAction} label="Finish without changing anything" tone="ghost" fields={{ step: '6', done: '1' }} />
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
