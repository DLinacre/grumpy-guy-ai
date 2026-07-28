import { useCallback, useEffect, useState } from 'react';
import { supabaseConfigured } from '../../../shared/config/env';
import { getSupabaseClient } from '../../../shared/lib/supabase-client';

export type AuthState = {
  /** Signed-in user's email, or `null` in private/local mode. */
  email: string | null;
  /** True until the initial session lookup settles. */
  loading: boolean;
  /** Whether cloud auth is configured at all. */
  enabled: boolean;
  signOut: () => Promise<void>;
};

/**
 * Subscribes to Supabase auth state.
 *
 * The legacy effect called `getUser()` and applied the result with no unmount guard,
 * producing a state update on a torn-down component whenever the request outlived the
 * mount. It also dereferenced `s?.user.email` — `user` is optional on a session, so a
 * partial session object threw. Both are fixed here.
 */
export function useAuth(): AuthState {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const supabase = await getSupabaseClient();
        if (!supabase || !active) {
          if (active) setLoading(false);
          return;
        }

        const { data } = await supabase.auth.getUser();
        if (!active) return;
        setEmail(data.user?.email ?? null);
        setLoading(false);

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          // Optional chaining through `user`: a session can exist without one.
          setEmail(session?.user?.email ?? null);
        });

        unsubscribe = () => subscription.unsubscribe();

        // The component may have unmounted while `onAuthStateChange` was wiring up.
        if (!active) {
          unsubscribe();
          unsubscribe = undefined;
        }
      } catch (error) {
        console.error('[auth] Failed to initialise session:', error);
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient();
      await supabase?.auth.signOut();
    } catch (error) {
      console.error('[auth] Sign out failed:', error);
    }
  }, []);

  return { email, loading, enabled: supabaseConfigured, signOut };
}
