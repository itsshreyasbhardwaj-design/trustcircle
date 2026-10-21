import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signInAction } from '@/app/actions/auth';
import { ActionForm } from '@/components/forms';
import { Card, Field, Input, Notice, Alert } from '@/components/ui';
import { currentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; joined?: string }> }) {
  if (await currentUser()) redirect('/dashboard');
  const params = await searchParams;

  return (
    <Card className="tc-rise">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1.5 text-sm text-[var(--fg-muted)]">Welcome back.</p>

      {params.next && (
        <Alert tone="info" className="mt-4">
          Sign in to continue. You will be brought back afterwards.
        </Alert>
      )}

      <div className="mt-6">
        <ActionForm action={signInAction} submitLabel="Sign in" pendingLabel="Signing in…" wide>
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus inputMode="email" />
          </Field>
          <Field label="Password" htmlFor="password" required>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
        </ActionForm>
      </div>

      <p className="mt-6 text-sm text-[var(--fg-muted)]">
        No account yet? <Link href="/signup" className="font-medium text-[var(--accent)] underline">Create one</Link>
      </p>

      <Notice>
        <strong className="text-[var(--fg-muted)]">Forgotten your password?</strong> There is no reset email,
        because TrustCircle has no email provider configured and sends no email at all. The one-time recovery
        code shown when you registered is the only way back in. If it is lost, the account cannot be recovered —
        create a new one.
      </Notice>
    </Card>
  );
}
