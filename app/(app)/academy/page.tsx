import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { progressFor, summary } from '@/lib/academy';
import { lessons } from '@/lib/data/lessons';
import { Badge, Notice, SectionTitle, Stat } from '@/components/ui';
import { pick, t, type Lang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Learn' };

export default async function AcademyPage() {
  const user = await requireUser();
  const lang = getSettings(user.id).language as Lang;
  const progress = progressFor(user.id);
  const stats = summary(user.id);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="TrustAcademy"
        title={t(lang, 'nav.academy').text}
        lead="Eight short lessons on recognising the patterns. Useful on an ordinary day, which is when there is time to read them."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Lessons done" value={`${stats.completed}/${stats.total}`} />
        <Stat label="Questions right" value={stats.answeredTotal > 0 ? `${stats.answeredCorrect}/${stats.answeredTotal}` : '—'} />
        <Stat label="Reading time" value={`${lessons.reduce((n, l) => n + l.minutes, 0)} min`} hint="All lessons" />
      </div>

      <ul className="space-y-2.5">
        {lessons.map((lesson) => {
          const p = progress.get(lesson.slug);
          const title = pick(lang, lesson.title);
          const summaryText = pick(lang, lesson.summary);
          return (
            <li key={lesson.slug}>
              <Link
                href={`/academy/${lesson.slug}`}
                className="tc-tap block rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 hover:border-[var(--accent)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {p?.completed_at ? (
                    <Badge tone="accent">Done · {p.correct_count}/{p.total_count}</Badge>
                  ) : (
                    <Badge>{lesson.minutes} min</Badge>
                  )}
                  {!title.translated && <Badge tone="caution">{t(lang, 'label.untranslated').text}</Badge>}
                  <GraduationCap className="ml-auto h-4 w-4 text-[var(--fg-subtle)]" aria-hidden />
                </div>
                <h2 className="mt-2 font-semibold">{title.value}</h2>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{summaryText.value}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      <Notice>
        Every scenario in these lessons is invented, and every address uses a domain reserved for
        documentation — nothing here links to a live site. Lesson titles and summaries are translated into
        Hindi and Bengali; lesson text and questions are English-only in this build, and are labelled where
        that applies.
      </Notice>
    </div>
  );
}
