import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { supabaseConfigured } from '../../../shared/config/env';
import { getSupabaseClient } from '../../../shared/lib/supabase-client';

export type AuthDialogProps = {
  onClose: () => void;
};

/**
 * Passwordless sign-in dialog.
 *
 * Adds the accessibility behaviour the legacy modal lacked: focus is moved into the
 * dialog on open, Escape closes it, focus is trapped while open, and it is restored
 * to the trigger on close.
 */
export function AuthDialog({ onClose }: AuthDialogProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const titleId = useId();
  const dialogRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Move focus in, and return it to whatever opened the dialog on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  // Escape to dismiss, Tab cycles within the dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href]',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const runSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!supabaseConfigured) {
        setMessage('Cloud sign-in is not configured. This browser is in private demo mode.');
        return;
      }

      setBusy(true);
      try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
          if (mountedRef.current) {
            setMessage('Cloud sign-in is not configured. This browser is in private demo mode.');
          }
          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });

        if (!mountedRef.current) return;
        setMessage(error ? error.message : 'Check your inbox for your secure sign-in link.');
      } catch (error) {
        // The legacy version had no catch: a network failure rejected the handler
        // and left the button stuck on "Sending…".
        console.error('[auth] Magic link request failed:', error);
        if (mountedRef.current) setMessage('Could not reach the sign-in service. Try again.');
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [email],
  );

  /**
   * Wrapper returning `void`: passing an async function straight to `onSubmit`
   * hands React a floating promise whose rejection nothing observes.
   */
  const submit = useCallback(
    (event: FormEvent) => {
      void runSubmit(event);
    },
    [runSubmit],
  );

  return (
    <div
      className="fixed inset-0 grid place-items-center bg-black/70 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-[min(450px,100%)] rounded-lg border border-outline bg-surface p-[34px]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-[10px] border-0 bg-transparent text-[27px] leading-none text-white"
        >
          ×
        </button>

        <p className="mb-[13px] font-mono text-xs leading-[normal] tracking-[1.3px] text-ember-soft">SAVE YOUR GRUMBLES</p>
        <h2 id={titleId} className="mb-[18px] text-[32px] tracking-[-1px]">
          Sign in. Reluctantly.
        </h2>
        <p className="text-quote">
          We send a passwordless magic link. No passwords to forget dramatically.
        </p>

        <label className="my-[22px] grid gap-2 text-label">
          Email
          <input
            ref={inputRef}
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@shipit.dev"
            className="rounded-[5px] border border-outline-soft bg-field-deep p-[13px] text-white"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="rounded-md border-0 bg-ember px-[19px] py-[13px] font-bold text-espresso"
        >
          {busy ? 'Sending…' : 'Email me a link'}
        </button>

        {message && (
          <p role="status" className="mt-3 text-sm text-ember-soft">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
