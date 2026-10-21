'use client';

import { useEffect, useState } from 'react';
import { Alert } from './ui';
import { CopyField } from './forms';

/**
 * The raw invitation token exists for exactly one render. Rather than thread it
 * through the page, this picks it up from the form's success state via a custom
 * event, so the token never lands in a URL, a log line or the database.
 */
export function InviteResult() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ token?: string }>).detail;
      if (detail?.token) setToken(detail.token);
    };
    window.addEventListener('trustcircle:invite', handler);
    return () => window.removeEventListener('trustcircle:invite', handler);
  }, []);

  if (!token) return null;
  const url = `${window.location.origin}/family/join?token=${encodeURIComponent(token)}`;

  return (
    <div className="mt-4 space-y-3">
      <Alert tone="caution" title="Copy this now — it is shown only once">
        Send it to the person yourself, through whatever you normally use to talk to them. Anyone who has this
        link can join the circle until it expires or you cancel it, so do not post it anywhere public.
      </Alert>
      <CopyField value={url} label="Invitation link" />
    </div>
  );
}
