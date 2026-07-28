/**
 * Legacy Supabase entry point.
 *
 * The client is now created lazily via a dynamic import so the ~110 kB SDK is code-split
 * out of the entry chunk (see `src/shared/lib/supabase-client.ts`). Because construction
 * is asynchronous, consumers await `getSupabaseClient()` instead of reading a
 * synchronously-initialised binding.
 */
export { getSupabaseClient, resetSupabaseClientForTests } from '../shared/lib/supabase-client';
