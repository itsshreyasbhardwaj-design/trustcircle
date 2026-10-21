'use client';

import { Button, Card } from '@/components/ui';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Nothing was changed. The details are in the server log rather than on this page, so nothing from
          your content ends up in an error message.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={reset}>Try again</Button>
        </div>
      </Card>
    </div>
  );
}
