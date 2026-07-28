import { config } from '../../../shared/config/env';
import {
  MAX_PROMPT_LENGTH,
  parseGrumble,
  type Grumble,
  type Tone,
} from '../../../shared/domain/grumble';
import { getSupabaseClient } from '../../../shared/lib/supabase-client';
import { isAbortError } from '../../../shared/lib/result';
import { pickFallback } from './fallback';

/** Upper bound on a single generation request before we give up and use a fallback. */
const REQUEST_TIMEOUT_MS = 15_000;

export type RequestGrumbleOptions = {
  /** Caller-owned signal so an unmounting component can cancel an in-flight request. */
  signal?: AbortSignal;
};

/** Builds a locally-generated grumble used when the service is unreachable. */
function createFallbackGrumble(tone: Tone): Grumble {
  return {
    id: crypto.randomUUID(),
    text: pickFallback(tone),
    tone,
    createdAt: new Date().toISOString(),
    favorite: false,
  };
}

/** Reads the current access token without letting an auth failure break generation. */
async function readAccessToken(): Promise<string | undefined> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return undefined;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  } catch {
    // An expired/offline session must not prevent an anonymous grumble.
    return undefined;
  }
}

/**
 * Requests a grumble from the API, falling back to a local line on any failure.
 *
 * Behavioural contract is unchanged from the legacy `requestGrumble`: it always
 * resolves with a valid {@link Grumble} and never rejects — *except* when the caller
 * aborts, which rethrows so the caller can distinguish cancellation from failure.
 *
 * Improvements over the original: a hard timeout (the original could hang forever on
 * a stalled connection), caller-supplied cancellation, and runtime validation of the
 * response instead of an unchecked `as Grumble` cast.
 */
export async function requestGrumble(
  tone: Tone,
  prompt?: string,
  options: RequestGrumbleOptions = {},
): Promise<Grumble> {
  const token = await readAccessToken();

  // Compose the caller's signal with our timeout so either can cancel the fetch.
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  try {
    const response = await fetch(`${config.apiBaseUrl}/grumble`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ tone, prompt: prompt?.slice(0, MAX_PROMPT_LENGTH) }),
      signal,
    });

    if (!response.ok) throw new Error(`Grumble service unavailable (${response.status})`);

    // Validate rather than cast: a proxy returning an HTML error page must not
    // become a `Grumble`-shaped object that breaks rendering downstream.
    const grumble = parseGrumble(await response.json());
    if (!grumble) throw new Error('Malformed grumble payload');

    return grumble;
  } catch (cause) {
    // Deliberate cancellation is propagated; everything else degrades gracefully.
    if (options.signal?.aborted && isAbortError(cause)) throw cause;
    return createFallbackGrumble(tone);
  }
}
