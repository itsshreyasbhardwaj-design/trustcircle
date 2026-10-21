'use client';

import { useActionState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { Alert, Badge, Button, Card, FormError } from './ui';
import type { ActionState } from '@/lib/actions-shared';
import type { Question } from '@/lib/data/lessons';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * The explanation is shown for every question after submitting, including the ones
 * answered correctly — the reasoning is the lesson, not the score.
 */
export function LessonQuiz({
  slug,
  questions,
  action,
}: {
  slug: string;
  questions: Question[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const submitted = Boolean(state?.ok);
  const given: Record<string, string> = state?.data?.answers ? JSON.parse(state.data.answers) : {};

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      <FormError message={state?.error} />
      {state?.ok && <Alert tone="info" title="Answers recorded">{state.ok}</Alert>}

      {questions.map((q, qi) => {
        const answer = given[q.id];
        const correct = submitted && answer === q.correct;
        return (
          <Card key={q.id} as="section">
            <div className="flex items-center gap-2">
              <Badge>Question {qi + 1}</Badge>
              {submitted && (
                <Badge tone={correct ? 'accent' : 'caution'}>
                  {correct ? <CircleCheck className="h-3.5 w-3.5" aria-hidden /> : <CircleX className="h-3.5 w-3.5" aria-hidden />}
                  {correct ? 'Correct' : 'Not quite'}
                </Badge>
              )}
            </div>
            <h3 className="mt-3 font-semibold">{q.prompt}</h3>
            {q.scenario && <p className="mt-1.5 text-xs text-[var(--fg-subtle)]">{q.scenario}</p>}

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">{q.prompt}</legend>
              {q.options.map((o) => {
                const isAnswer = submitted && o.id === q.correct;
                const isChosenWrong = submitted && answer === o.id && o.id !== q.correct;
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm ${
                      isAnswer
                        ? 'border-[var(--color-teal-600)] bg-[var(--bg-sunken)]'
                        : isChosenWrong
                          ? 'border-[var(--alert-border)] bg-[var(--alert-bg)]'
                          : 'border-[var(--border)] bg-[var(--bg-raised)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q:${q.id}`}
                      value={o.id}
                      defaultChecked={answer === o.id}
                      required
                      className="mt-0.5 shrink-0"
                      style={{ minHeight: '1.1rem', minWidth: '1.1rem' }}
                    />
                    <span>{o.label}</span>
                  </label>
                );
              })}
            </fieldset>

            {submitted && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">Why</p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{q.explanation}</p>
              </div>
            )}
          </Card>
        );
      })}

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Checking…' : submitted ? 'Answer again' : 'Check my answers'}
      </Button>
    </form>
  );
}
