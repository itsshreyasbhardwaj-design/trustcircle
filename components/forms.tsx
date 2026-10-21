'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, FormError, Alert, cx } from './ui';
import type { ActionState } from '@/lib/actions-shared';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * One client component for every form in the app. The fields themselves stay in
 * server components, so pages remain almost entirely server-rendered.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitTone = 'primary',
  pendingLabel,
  className,
  wide,
  confirm,
  footer,
  resetOnSuccess,
}: {
  action: Action;
  children?: ReactNode;
  submitLabel: string;
  submitTone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  pendingLabel?: string;
  className?: string;
  wide?: boolean;
  /** When set, the browser asks this before submitting. */
  confirm?: string;
  footer?: ReactNode;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
    // One-shot secrets (an invitation token) are handed to the page by event rather
    // than being rendered into a URL or stored anywhere.
    if (state?.data?.token) {
      window.dispatchEvent(new CustomEvent('trustcircle:invite', { detail: { token: state.data.token } }));
    }
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={cx('space-y-4', className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <FormError message={state?.error} />
      {state?.ok && <Alert tone="info">{state.ok}</Alert>}
      {children}
      <Button type="submit" tone={submitTone} wide={wide} disabled={pending} aria-busy={pending}>
        {pending ? (pendingLabel ?? 'Working…') : submitLabel}
      </Button>
      {footer}
    </form>
  );
}

/** A single-button form, for toggles and one-shot actions. */
export function ActionButton({
  action,
  label,
  tone = 'secondary',
  confirm,
  fields,
  className,
  pendingLabel,
}: {
  action: Action;
  label: string;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  confirm?: string;
  fields?: Record<string, string>;
  className?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={cx('inline-block', className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {fields &&
        Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Button type="submit" tone={tone} disabled={pending} aria-busy={pending}>
        {pending ? (pendingLabel ?? 'Working…') : label}
      </Button>
      {state?.error && (
        <p role="alert" className="mt-1.5 text-xs text-[var(--alert-fg)]">{state.error}</p>
      )}
    </form>
  );
}

/** Copy-to-clipboard for invitation links — the only share mechanism without email. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="copy-field">{label}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="copy-field"
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-sunken)] px-3.5 py-2.5 font-mono text-xs"
        />
        <Button
          type="button"
          tone="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  );
}
