import { getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { unreadCount } from '@/lib/notifications';
import { pendingForMe } from '@/lib/reviews';
import { applyRetention } from '@/lib/scans';
import { AppMobileBars, AppMoreLinks, AppSidebar } from '@/components/app-nav';
import type { Lang } from '@/lib/i18n';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = getSettings(user.id);
  // Retention is applied on navigation rather than by a background job: there is no
  // scheduler in this deployment, and a promise of one would be fiction.
  applyRetention(user.id);
  const lang = settings.language as Lang;
  const unread = unreadCount(user.id);
  const pending = pendingForMe(user.id);

  return (
    <div className="flex min-h-screen">
      <AppSidebar lang={lang} unread={unread} pendingReviews={pending} userName={user.display_name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileBars lang={lang} unread={unread} pendingReviews={pending} />
        <AppMoreLinks lang={lang} />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
