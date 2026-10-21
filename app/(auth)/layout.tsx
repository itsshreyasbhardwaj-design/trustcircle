import Link from 'next/link';
import { Logo } from '@/components/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tc-grid-bg flex min-h-screen flex-col">
      <header className="px-4 py-5">
        <Link href="/" className="tc-tap inline-flex items-center"><Logo /></Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-4 pb-8 text-center text-xs text-[var(--fg-subtle)]">
        <p>
          TrustCircle never asks for an OTP, PIN, card number or bank password — not here, not anywhere.
        </p>
        <p className="mt-2">
          <Link href="/privacy" className="underline">Privacy</Link> ·{' '}
          <Link href="/terms" className="underline">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
