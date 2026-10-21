import 'server-only';
import { all, id, now, one, run, tx } from './db.ts';
import { lessons, lessonBySlug } from './data/lessons.ts';
import { audit } from './auth.ts';

export type Progress = {
  lesson_slug: string;
  correct_count: number;
  total_count: number;
  completed_at: number | null;
};

export function progressFor(userId: string): Map<string, Progress> {
  const rows = all<Progress>(
    'SELECT lesson_slug, correct_count, total_count, completed_at FROM academy_progress WHERE user_id = ?',
    userId,
  );
  return new Map(rows.map((r) => [r.lesson_slug, r]));
}

export function recordAnswers(
  userId: string,
  slug: string,
  answers: Record<string, string>,
): { correct: number; total: number; perQuestion: Record<string, { correct: boolean; explanation: string }> } {
  const lesson = lessonBySlug(slug);
  if (!lesson) throw new Error('not_found');

  const perQuestion: Record<string, { correct: boolean; explanation: string }> = {};
  let correct = 0;
  for (const q of lesson.questions) {
    const given = answers[q.id];
    const isCorrect = given === q.correct;
    if (isCorrect) correct++;
    perQuestion[q.id] = { correct: isCorrect, explanation: q.explanation };
  }
  const total = lesson.questions.length;

  tx(() => {
    run(
      `INSERT INTO academy_progress (id, user_id, lesson_slug, correct_count, total_count, completed_at, updated_at)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(user_id, lesson_slug) DO UPDATE SET
         correct_count = MAX(academy_progress.correct_count, excluded.correct_count),
         total_count = excluded.total_count,
         completed_at = COALESCE(academy_progress.completed_at, excluded.completed_at),
         updated_at = excluded.updated_at`,
      id(), userId, slug, correct, total, now(), now(),
    );
    audit(userId, 'academy.answered', 'academy_lesson', slug, `${correct}/${total}`);
  });

  return { correct, total, perQuestion };
}

export function summary(userId: string): { completed: number; total: number; answeredCorrect: number; answeredTotal: number } {
  const row = one<{ completed: number; c: number; t: number }>(
    `SELECT COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) AS completed,
            COALESCE(SUM(correct_count), 0) AS c, COALESCE(SUM(total_count), 0) AS t
       FROM academy_progress WHERE user_id = ?`,
    userId,
  );
  return {
    completed: row?.completed ?? 0,
    total: lessons.length,
    answeredCorrect: row?.c ?? 0,
    answeredTotal: row?.t ?? 0,
  };
}

/** Opt-in family challenge: compares lesson completion inside one circle. */
export function circleLeaderboard(circleId: string): Array<{ display_name: string; completed: number }> {
  return all(
    `SELECT u.display_name,
            (SELECT COUNT(*) FROM academy_progress p WHERE p.user_id = u.id AND p.completed_at IS NOT NULL) AS completed
       FROM family_membership m JOIN user u ON u.id = m.user_id
      WHERE m.circle_id = ? AND m.left_at IS NULL
      ORDER BY completed DESC, u.display_name`,
    circleId,
  );
}
