import { ButtonLink, Card } from '@/components/ui';

export default function ScanNotFound() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <h1 className="text-xl font-semibold">That case is not available</h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        It may have been deleted by its owner, reached the end of its retention period, or had its sharing
        withdrawn. Access is checked on the server every time, so this is the same answer you would get
        however you reached the page.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/history" tone="secondary">My checks</ButtonLink>
        <ButtonLink href="/dashboard">Dashboard</ButtonLink>
      </div>
    </Card>
  );
}
