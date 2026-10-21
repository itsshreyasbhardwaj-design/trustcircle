import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signUpAction } from '@/app/actions/auth';
import { ActionForm } from '@/components/forms';
import { Card, Checkbox, Field, Input, Notice } from '@/components/ui';
import { currentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage() {
  if (await currentUser()) redirect('/dashboard');

  return (
    <Card className="tc-rise">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
        Free, and no payment details are requested at any point.
      </p>

      <div className="mt-6">
        <ActionForm action={signUpAction} submitLabel="Create account" pendingLabel="Creating…" wide>
          <Field label="Your name" htmlFor="displayName" hint="Shown to people in your circle." required>
            <Input id="displayName" name="displayName" autoComplete="name" required autoFocus maxLength={80} />
          </Field>
          <Field
            label="Email"
            htmlFor="email"
            hint="Used only to sign in. No email is ever sent to it, because no email provider is configured."
            required
          >
            <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            hint="At least 10 characters. A short phrase you will remember beats a short password with symbols in it."
            required
          >
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
          </Field>
          <Field label="Confirm password" htmlFor="confirm" required>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
          </Field>
          <Checkbox
            name="accept"
            value="1"
            label="I understand that TrustCircle cannot guarantee anything is safe"
            hint="It shows known warning signs and helps you verify a claim yourself. It cannot confirm who sent a message or who owns an account."
          />
        </ActionForm>
      </div>

      <p className="mt-6 text-sm text-[var(--fg-muted)]">
        Already registered? <Link href="/login" className="font-medium text-[var(--accent)] underline">Sign in</Link>
      </p>

      <Notice>
        On the next screen you will see a one-time recovery code. Write it down. Because no email is sent from
        this application, that code is the only way to prove the account is yours if you forget your password.
        By creating an account you agree to the{' '}
        <Link href="/terms" className="underline">terms</Link> and{' '}
        <Link href="/privacy" className="underline">privacy policy</Link>.
      </Notice>
    </Card>
  );
}
