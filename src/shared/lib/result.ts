/**
 * A minimal typed Result used to move recoverable failures out of the exception
 * channel and into the type system, so callers cannot forget to handle them.
 */

export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Normalises an unknown `catch` binding into a real `Error`. */
export function toError(cause: unknown): Error {
  if (cause instanceof Error) return cause;
  return new Error(typeof cause === 'string' ? cause : 'Unknown error', { cause });
}

/** True when a rejection was caused by an `AbortController`, not a real failure. */
export function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException
    ? cause.name === 'AbortError'
    : cause instanceof Error && cause.name === 'AbortError';
}
