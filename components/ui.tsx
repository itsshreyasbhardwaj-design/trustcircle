import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';

const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(' ');

/* ---------------- surfaces ---------------- */

export function Card({
  children,
  className,
  as: As = 'div',
  tone = 'raised',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
  tone?: 'raised' | 'sunken' | 'plain';
}) {
  return (
    <As
      className={cx(
        'rounded-2xl border p-5 sm:p-6',
        tone === 'raised' && 'bg-[var(--bg-raised)] shadow-[var(--shadow-card)]',
        tone === 'sunken' && 'bg-[var(--bg-sunken)]',
        tone === 'plain' && 'bg-transparent',
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  lead,
  center,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  center?: boolean;
}) {
  return (
    <div className={cx('max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
      {lead && <p className="mt-3 text-[var(--fg-muted)]">{lead}</p>}
    </div>
  );
}

/* ---------------- buttons ---------------- */

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_BASE =
  'tc-tap inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] disabled:cursor-not-allowed disabled:opacity-55';

const TONES: Record<ButtonTone, string> = {
  primary: 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110 shadow-sm',
  secondary: 'border border-[var(--border-strong)] bg-[var(--bg-raised)] text-[var(--fg)] hover:bg-[var(--bg-sunken)]',
  ghost: 'text-[var(--fg-muted)] hover:bg-[var(--bg-sunken)] hover:text-[var(--fg)]',
  danger: 'border border-[var(--alert-border)] bg-[var(--alert-bg)] text-[var(--alert-fg)] hover:brightness-105',
};

export function Button({
  tone = 'primary',
  className,
  wide,
  ...rest
}: ComponentProps<'button'> & { tone?: ButtonTone; wide?: boolean }) {
  return <button {...rest} className={cx(BUTTON_BASE, TONES[tone], wide && 'w-full', className)} />;
}

export function ButtonLink({
  tone = 'primary',
  className,
  wide,
  href,
  children,
  ...rest
}: ComponentProps<typeof Link> & { tone?: ButtonTone; wide?: boolean }) {
  return (
    <Link {...rest} href={href} className={cx(BUTTON_BASE, TONES[tone], wide && 'w-full', className)}>
      {children}
    </Link>
  );
}

/* ---------------- severity + state ---------------- */

export type Severity = 'info' | 'caution' | 'high';

const SEVERITY_STYLE: Record<Severity, string> = {
  info: 'bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--border)]',
  caution: 'bg-[var(--caution-bg)] text-[var(--caution-fg)] border-[var(--caution-border)]',
  high: 'bg-[var(--alert-bg)] text-[var(--alert-fg)] border-[var(--alert-border)]',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Severity | 'neutral' | 'accent';
  className?: string;
}) {
  const style =
    tone === 'neutral'
      ? 'bg-[var(--bg-sunken)] text-[var(--fg-muted)] border-[var(--border)]'
      : tone === 'accent'
        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--border)]'
        : SEVERITY_STYLE[tone];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', style, className)}>
      {children}
    </span>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Severity;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="note" className={cx('rounded-xl border p-4 text-sm', SEVERITY_STYLE[tone], className)}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="[&_a]:underline">{children}</div>
    </div>
  );
}

/** Errors from a form action. Announced to screen readers. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className={cx('rounded-xl border p-3 text-sm', SEVERITY_STYLE.high)}>
      {message}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-sunken)] p-3 text-xs leading-relaxed text-[var(--fg-muted)]">
      {children}
    </p>
  );
}

/* ---------------- forms ---------------- */

export function Field({
  label,
  hint,
  children,
  htmlFor,
  required,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-[var(--alert-fg)]" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-[var(--fg-subtle)]">{hint}</p>}
    </div>
  );
}

const CONTROL =
  'w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-raised)] px-3.5 py-2.5 text-[0.95rem] text-[var(--fg)] placeholder:text-[var(--fg-subtle)]';

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input {...rest} className={cx(CONTROL, className)} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea {...rest} className={cx(CONTROL, 'min-h-32 resize-y leading-relaxed', className)} />;
}

export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <select {...rest} className={cx(CONTROL, 'pr-8', className)}>
      {children}
    </select>
  );
}

export function Checkbox({ label, hint, ...rest }: ComponentProps<'input'> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-3.5">
      <input type="checkbox" {...rest} className="mt-0.5 shrink-0" />
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-[var(--fg-subtle)]">{hint}</span>}
      </span>
    </label>
  );
}

/* ---------------- states ---------------- */

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-raised)] p-8 text-center">
      {icon && <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</div>}
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--fg-muted)]">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('tc-skeleton h-4 w-full', className)} />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={i === rows - 1 ? 'w-2/3' : undefined} />
        ))}
      </div>
    </Card>
  );
}

/** Renders user-submitted content. Text nodes only — never dangerouslySetInnerHTML. */
export function SubmittedContent({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cx(
        'tc-content rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5 text-sm text-[var(--fg-muted)]',
        className,
      )}
    >
      {text}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--fg-subtle)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--fg-subtle)]">{hint}</p>}
    </div>
  );
}

/** Simple CSS bar chart — no charting dependency for four numbers. */
export function BarRow({ label, value, max, tone = 'neutral' }: { label: string; value: number; max: number; tone?: Severity | 'neutral' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const fill =
    tone === 'high' ? 'bg-[var(--color-red-500)]'
    : tone === 'caution' ? 'bg-[var(--color-amber-500)]'
    : tone === 'info' ? 'bg-[var(--color-slate-400)]'
    : 'bg-[var(--accent)]';
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[var(--fg-muted)]">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-sunken)]" role="presentation">
        <div className={cx('h-full rounded-full', fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 text-[0.95rem] leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)] [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--fg)] [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-[var(--fg)] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[var(--fg)]">
      {children}
    </div>
  );
}

export { cx };
