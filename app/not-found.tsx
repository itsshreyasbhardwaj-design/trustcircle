import Link from 'next/link';
import { ButtonLink, Card } from '@/components/ui';
import { Logo } from '@/components/site';

export default function NotFound() {
  return (
    <div className="tc-grid-bg flex min-h-screen flex-col">
      <header className="px-4 py-5">
        <Link href="/" className="tc-tap inline-flex items-center"><Logo /></Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16">
        <Card className="w-full max-w-lg text-center">
          <h1 className="text-xl font-semibold">Page not found</h1>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            This address does not exist. If you followed a link from a message, that in itself is worth a
            second look — the link text in a message can say anything.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/">Home</ButtonLink>
            <ButtonLink href="/scan/text" tone="secondary">Check a message</ButtonLink>
          </div>
        </Card>
      </main>
    </div>
  );
}
