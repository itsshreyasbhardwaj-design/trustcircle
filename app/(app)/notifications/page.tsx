import type { Metadata } from 'next';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { channels, listNotifications, unreadCount } from '@/lib/notifications';
import { dismissNotificationAction, markAllReadAction, markReadAction } from '@/app/actions/misc';
import { ActionButton } from '@/components/forms';
import { Badge, Card, EmptyState, Notice, SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = listNotifications(user.id, 100);
  const unread = unreadCount(user.id);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Notification centre"
        title="Notifications"
        lead={unread > 0 ? `${unread} unread.` : 'Everything is read.'}
      />

      {unread > 0 && (
        <ActionButton action={markAllReadAction} label="Mark all as read" tone="secondary" />
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" aria-hidden />}
          title="Nothing here"
          body="Invitations, second-opinion requests, comments and account-security events appear here."
        />
      ) : (
        <ul className="space-y-2.5">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${n.read_at ? 'border-[var(--border)] bg-[var(--bg-raised)]' : 'border-[var(--accent)] bg-[var(--accent-soft)]'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {!n.read_at && <Badge tone="accent">New</Badge>}
                <Badge>{n.kind.replace(/_/g, ' ')}</Badge>
                <span className="ml-auto text-xs text-[var(--fg-subtle)]">
                  {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <h2 className="mt-2 font-semibold">{n.title}</h2>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{n.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {n.href && (
                  <Link href={n.href} className="text-sm font-medium text-[var(--accent)] hover:underline">
                    Open →
                  </Link>
                )}
                {!n.read_at && (
                  <ActionButton action={markReadAction} label="Mark read" tone="ghost" fields={{ notificationId: n.id }} />
                )}
                <ActionButton action={dismissNotificationAction} label="Dismiss" tone="ghost" fields={{ notificationId: n.id }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <h2 className="font-semibold">How notifications are delivered</h2>
        <ul className="mt-4 space-y-2.5">
          {channels().map((c) => (
            <li key={c.name} className="flex flex-wrap items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{c.name}</span>
                <span className="mt-0.5 block text-sm text-[var(--fg-muted)]">{c.note}</span>
              </span>
              <Badge tone={c.status === 'active' ? 'accent' : 'neutral'} className="ml-auto">
                {c.status === 'active' ? 'Active' : 'Not configured'}
              </Badge>
            </li>
          ))}
        </ul>
        <Notice>
          Nothing is sent outside the application. The notification code is written against a single delivery
          function so email or push could be added later, but neither is configured and neither is simulated.
        </Notice>
      </Card>
    </div>
  );
}
