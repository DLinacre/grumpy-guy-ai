import type { SupabaseClient } from '@supabase/supabase-js';
import { config, supabaseConfigured } from '../config/env';

/**
 * Lazily-instantiated Supabase client.
 *
 * The legacy module built the client at import time, which pulled the entire
 * `@supabase/supabase-js` package into the entry chunk — even on the GitHub Pages
 * demo, where no `VITE_SUPABASE_*` variables are defined and the client can never
 * be used. Loading it through a dynamic `import()` lets Rollup split it into a
 * separate chunk that is fetched only when a visitor actually reaches for auth.
 *
 * The promise is memoised, so concurrent callers share one client instance and one
 * network request for the chunk.
 */

type MaybeClient = SupabaseClient | null;

let clientPromise: Promise<MaybeClient> | null = null;

async function createSupabaseClient(): Promise<MaybeClient> {
  if (!supabaseConfigured || !config.supabaseUrl || !config.supabaseAnonKey) return null;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    // Only ever constructed with the browser-safe anonymous key.
    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (error) {
    // A failed chunk fetch (offline, blocked CDN) degrades to local-only mode
    // rather than taking down the application shell.
    console.error('[supabase] Failed to load client:', error);
    return null;
  }
}

/**
 * Resolves the shared Supabase client, or `null` when cloud sync is not configured
 * or the SDK could not be loaded.
 */
export function getSupabaseClient(): Promise<MaybeClient> {
  clientPromise ??= createSupabaseClient();
  return clientPromise;
}

/** Test-only hook: clears the memoised client so cases can start from a clean slate. */
export function resetSupabaseClientForTests(): void {
  clientPromise = null;
}
