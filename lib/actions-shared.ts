/** Shape every server action in this app returns to `ActionForm`. */
export type ActionState = {
  error?: string;
  ok?: string;
  /** Opaque payload a page may read back after a successful submit. */
  data?: Record<string, string>;
} | null;

/** Turns thrown domain errors into a message safe to show a user. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof Error) {
    if (err.message === 'not_found') {
      return { error: 'That item does not exist, or you do not have access to it.' };
    }
    if (err.message.startsWith('plan_limit:')) {
      return { error: err.message.slice('plan_limit:'.length) };
    }
    // Domain errors in this codebase carry user-facing text; anything else is a bug.
    if (err.message.length < 300 && !/\b(SQLITE|at |TypeError|undefined)\b/.test(err.message)) {
      return { error: err.message };
    }
  }
  console.error('[action] unexpected error', err);
  return { error: 'Something went wrong. Nothing was changed — please try again.' };
}
