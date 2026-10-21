import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { currentUser } from '@/lib/session';
import { ButtonLink } from './ui';

const NAV = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/family-protection', label: 'Family protection' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className ?? ''}`}>
      <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden />
      TrustCircle
    </span>
  );
}

export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="tc-tap flex items-center">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="tc-tap inline-flex items-center rounded-lg px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--bg-sunken)] hover:text-[var(--fg)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <ButtonLink href="/dashboard" tone="primary">Open dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" tone="ghost" className="hidden sm:inline-flex">Sign in</ButtonLink>
              <ButtonLink href="/signup" tone="primary">Create account</ButtonLink>
            </>
          )}
        </div>
      </div>
      <nav aria-label="Main, compact" className="flex gap-1 overflow-x-auto border-t border-[var(--border)] px-3 py-2 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[var(--fg-muted)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--bg-raised)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-[var(--fg-muted)]">
              Think twice. Stay protected. Together.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              ['/features', 'Features'],
              ['/how-it-works', 'How it works'],
              ['/family-protection', 'Family protection'],
              ['/pricing', 'Pricing'],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ['/about', 'About'],
              ['/contact', 'Contact'],
              ['/faq', 'FAQ'],
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              ['/privacy', 'Privacy policy'],
              ['/terms', 'Terms of service'],
            ]}
          />
        </div>
        <div className="mt-10 space-y-3 border-t border-[var(--border)] pt-6 text-xs leading-relaxed text-[var(--fg-subtle)]">
          <p>
            <strong className="text-[var(--fg-muted)]">TrustCircle is not a fraud-prevention guarantee.</strong>{' '}
            It checks content against a published list of known patterns and helps you verify claims yourself.
            It cannot confirm who sent a message, who owns an account, or whether a website is honest. A result
            showing no warning signs is never proof that something is safe.
          </p>
          <p>
            Not a bank, not an antivirus product, and not a law-enforcement service. If money has already left
            your account, contact your bank and then call 1930 — do not wait for a scan.
          </p>
          <p>© {new Date().getFullYear()} TrustCircle. An independent project. Not affiliated with any bank, payment network or government body.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
