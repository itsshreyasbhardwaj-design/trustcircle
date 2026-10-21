import Link from 'next/link';
import { ImageUp, Link2, MessageSquareText, QrCode, Wallet } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n';

const TILES = [
  { href: '/scan/text', icon: MessageSquareText, key: 'action.pasteMessage', hint: 'An SMS, WhatsApp message or email' },
  { href: '/scan/image', icon: ImageUp, key: 'action.uploadScreenshot', hint: 'Read on your device, never uploaded' },
  { href: '/scan/url', icon: Link2, key: 'action.checkLink', hint: 'Inspected as text, never opened' },
  { href: '/payment-check', icon: Wallet, key: 'action.checkPayment', hint: 'Before any money moves' },
  { href: '/scan/qr', icon: QrCode, key: 'action.scanQr', hint: 'Decoded in your browser' },
] as const;

export function ScanTiles({ lang, limit }: { lang: Lang; limit?: number }) {
  const tiles = limit ? TILES.slice(0, limit) : TILES;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map(({ href, icon: Icon, key, hint }) => (
        <Link
          key={href}
          href={href}
          className="tc-tap group flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-card)] hover:border-[var(--accent)]"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{t(lang, key).text}</span>
            <span className="mt-0.5 block text-xs text-[var(--fg-muted)]">{hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
