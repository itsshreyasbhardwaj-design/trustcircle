import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSettings } from '@/lib/auth';
import { requireUser } from '@/lib/session';
import { lessonBySlug, lessons } from '@/lib/data/lessons';
import { progressFor } from '@/lib/academy';
import { submitLessonAction } from '@/app/actions/misc';
import { LessonQuiz } from '@/components/lesson-quiz';
import { Badge, ButtonLink, Card, Notice, SectionTitle } from '@/components/ui';
import { pick, t, type Lang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Lesson' };

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = lessonBySlug(lessonId);
  if (!lesson) notFound();

  const user = await requireUser();
  const lang = getSettings(user.id).language as Lang;
  const progress = progressFor(user.id).get(lesson.slug);

  const title = pick(lang, lesson.title);
  const summary = pick(lang, lesson.summary);
  const index = lessons.findIndex((l) => l.slug === lesson.slug);
  const next = lessons[index + 1];

  return (
    <div className="space-y-6">
      <Link href="/academy" className="tc-tap inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All lessons
      </Link>

      <SectionTitle eyebrow={`Lesson ${index + 1} of ${lessons.length} · ${lesson.minutes} min`} title={title.value} lead={summary.value} />

      <div className="flex flex-wrap gap-2">
        {progress?.completed_at && <Badge tone="accent">Completed · best {progress.correct_count}/{progress.total_count}</Badge>}
        {!title.translated && <Badge tone="caution">{t(lang, 'label.untranslated').text}</Badge>}
      </div>

      <Card>
        <div className="space-y-4">
          {lesson.body.map((para) =>
            para.startsWith('- ') ? (
              <p key={para} className="ml-5 list-disc text-[0.95rem] leading-relaxed text-[var(--fg-muted)]" style={{ display: 'list-item' }}>
                {para.slice(2)}
              </p>
            ) : (
              <p key={para} className="text-[0.95rem] leading-relaxed text-[var(--fg-muted)]">{para}</p>
            ),
          )}
        </div>
        {lang !== 'en' && (
          <Notice>
            {t(lang, 'label.untranslated').text} — the lesson text and questions are available in English only
            in this build. The summary above is translated.
          </Notice>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Check your understanding</h2>
        <LessonQuiz slug={lesson.slug} questions={lesson.questions} action={submitLessonAction} />
      </section>

      <Card tone="sunken">
        <div className="flex flex-wrap items-center gap-3">
          {next ? (
            <ButtonLink href={`/academy/${next.slug}`} tone="secondary">
              Next: {pick(lang, next.title).value}
            </ButtonLink>
          ) : (
            <ButtonLink href="/academy" tone="secondary">Back to all lessons</ButtonLink>
          )}
          <ButtonLink href="/scan" tone="ghost">Check something</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
