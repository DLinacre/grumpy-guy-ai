/**
 * Validated browser environment.
 *
 * The legacy implementation cast `import.meta.env` values with `as string | undefined`
 * and then asserted them non-null at the call site, so a typo'd URL produced a Supabase
 * client that failed on first use with an opaque error. Here the values are checked once
 * at startup and a misconfiguration is reported immediately.
 *
 * Validation is hand-rolled rather than Zod-based to keep the schema library out of the
 * browser bundle; the Worker still uses Zod, where size does not matter.
 */

type RawEnv = Record<string, unknown>;

/** Reads a variable, treating empty strings (common for unset CI vars) as absent. */
function readString(source: RawEnv, key: string): string | undefined {
  const value = source[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Returns the value only if it parses as an absolute URL. */
function readUrl(source: RawEnv, key: string, problems: string[]): string | undefined {
  const value = readString(source, key);
  if (value === undefined) return undefined;
  try {
    new URL(value);
    return value;
  } catch {
    problems.push(`${key} is not a valid URL`);
    return undefined;
  }
}

const raw = import.meta.env as unknown as RawEnv;
const problems: string[] = [];

const supabaseUrl = readUrl(raw, 'VITE_SUPABASE_URL', problems);
const supabaseAnonKey = readString(raw, 'VITE_SUPABASE_ANON_KEY');
const apiBaseUrl = readString(raw, 'VITE_API_BASE_URL') ?? '/api';

// Partial configuration is a deployment mistake worth shouting about: it silently
// disables sign-in, which otherwise looks like a bug to the operator.
if (Boolean(supabaseUrl) !== Boolean(supabaseAnonKey)) {
  problems.push(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set, or both be omitted',
  );
}

if (problems.length > 0) {
  console.error('[config] Invalid environment variables:', problems);
}

/**
 * Public runtime configuration.
 *
 * Preserves the legacy `config` shape (`supabaseUrl`, `supabaseAnonKey`, `apiBaseUrl`)
 * so existing imports keep working unchanged.
 */
export const config = {
  supabaseUrl,
  supabaseAnonKey,
  apiBaseUrl,
  /** Vite base path, used to build links that survive GitHub Pages sub-path hosting. */
  baseUrl: (typeof raw['BASE_URL'] === 'string' ? raw['BASE_URL'] : undefined) ?? '/',
} as const;

/**
 * Whether cloud sync is available. When false the UI stays in local-only mode and the
 * Supabase SDK is never downloaded.
 */
export const supabaseConfigured: boolean = Boolean(config.supabaseUrl && config.supabaseAnonKey);

/** Problems detected while validating the environment. Empty when healthy. */
export const configProblems: readonly string[] = problems;

export type AppConfig = typeof config;
