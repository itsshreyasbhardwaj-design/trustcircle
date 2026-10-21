import Link from 'next/link';
import {
  Bell, GraduationCap, History, LayoutDashboard, LifeBuoy, ScanLine, Settings, ShieldQuestion, Users, Wallet,
} from 'lucide-react';
import { Logo } from './site';
import { Badge } from './ui';
import { t, type Lang } from '@/lib/i18n';
import { signOutAction } from '@/app/actions/auth';

const ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { href: '/scan', icon: ScanLine, key: 'nav.scan' },
  { href: '/history', icon: History, key: 'nav.history' },
  { href: '/family', icon: Users, key: 'nav.family' },
  { href: '/reviews', icon: ShieldQuestion, key: 'nav.reviews' },
  { href: '/verify', icon: ShieldQuestion, key: 'nav.verify' },
  { href: '/payment-check', icon: Wallet, key: 'nav.payment' },
  { href: '/recovery', icon: LifeBuoy, key: 'nav.recovery' },
  { href: '/academy', icon: GraduationCap, key: 'nav.academy' },
] as const;

export function AppSidebar({
  lang,
  unread,
  pendingReviews,
  userName,
}: {
  lang: Lang;
  unread: number;
  pendingReviews: number;
  userName: string;
}) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--bg-raised)] lg:flex lg:flex-col">
      <div className="px-5 py-4">
        <Link href="/dashboard" className="tc-tap inline-flex items-center"><Logo /></Link>
      </div>
      <nav aria-label="Application" className="flex-1 space-y-0.5 px-3">
        {ITEMS.map(({ href, icon: Icon, key }) => (
          <Link
            key={href}
            href={href}
            className="tc-tap flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--bg-sunken)] hover:text-[var(--fg)]"
          >
            <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
            <span className="truncate">{t(lang, key).text}</span>
            {href === '/reviews' && pendingReviews > 0 && (
              <Badge tone="caution" className="ml-auto">{pendingReviews}</Badge>
            )}
          </Link>
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-[var(--border)] px-3 py-3">
        <Link
          href="/notifications"
          className="tc-tap flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--bg-sunken)]"
        >
          <Bell className="h-4.5 w-4.5" aria-hidden />
          <span>{t(lang, 'nav.notifications').text}</span>
          {unread > 0 && <Badge tone="accent" className="ml-auto">{unread}</Badge>}
        </Link>
        <Link
          href="/settings"
          className="tc-tap flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--bg-sunken)]"
        >
          <Settings className="h-4.5 w-4.5" aria-hidden />
          <span>{t(lang, 'nav.settings').text}</span>
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="tc-tap flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--fg-muted)] hover:bg-[var(--bg-sunken)]"
          >
            <span className="flex h-4.5 w-4.5 items-center justify-center text-xs" aria-hidden>↩</span>
            <span>{t(lang, 'action.signOut').text}</span>
          </button>
        </form>
        <p className="truncate px-3 pt-2 text-xs text-[var(--fg-subtle)]">{userName}</p>
      </div>
    </aside>
  );
}

/** Mobile: a compact top bar plus a bottom tab bar for the five most-used routes. */
export function AppMobileBars({ lang, unread, pendingReviews }: { lang: Lang; unread: number; pendingReviews: number }) {
  const tabs = [
    { href: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
    { href: '/scan', icon: ScanLine, key: 'nav.scan' },
    { href: '/reviews', icon: ShieldQuestion, key: 'nav.reviews', badge: pendingReviews },
    { href: '/family', icon: Users, key: 'nav.family' },
    { href: '/settings', icon: Settings, key: 'nav.settings' },
  ] as const;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="tc-tap inline-flex items-center"><Logo /></Link>
        <Link href="/notifications" className="tc-tap relative ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[var(--bg-sunken)]" aria-label={`${t(lang, 'nav.notifications').text}${unread ? `, ${unread} unread` : ''}`}>
          <Bell className="h-5 w-5" aria-hidden />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[0.6rem] font-bold text-[var(--accent-fg)]">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
      </header>

      <nav
        aria-label="Application, compact"
        className="sticky bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--bg-raised)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {tabs.map(({ href, icon: Icon, key, ...rest }) => (
          <Link
            key={href}
            href={href}
            className="tc-tap relative flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[0.68rem] text-[var(--fg-muted)]"
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{t(lang, key).text}</span>
            {'badge' in rest && (rest as { badge: number }).badge > 0 && (
              <span className="absolute right-1/4 top-1 h-2 w-2 rounded-full bg-[var(--color-amber-500)]" aria-hidden />
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}

/** Secondary links that do not fit the mobile tab bar. */
export function AppMoreLinks({ lang }: { lang: Lang }) {
  const extra = ITEMS.filter((i) => !['/dashboard', '/scan', '/reviews', '/family'].includes(i.href));
  return (
    <nav aria-label="More sections" className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3 lg:hidden">
      {extra.map(({ href, key }) => (
        <Link
          key={href}
          href={href}
          className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1.5 text-xs text-[var(--fg-muted)]"
        >
          {t(lang, key).text}
        </Link>
      ))}
    </nav>
  );
}
