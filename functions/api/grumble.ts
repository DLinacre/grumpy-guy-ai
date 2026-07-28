import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

/**
 * Grumble generation Worker.
 *
 * Hardened against the issues listed in docs/06-refactor-audit.md: per-request
 * middleware allocation, unbounded upstream calls, unprotected persistence, and an
 * unmetered endpoint spending an OpenAI key.
 */

export type Env = {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Comma-separated list of permitted origins. */
  ALLOWED_ORIGIN: string;
};

type Variables = { userId?: string };

type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

/** Upstream call budgets. Without these a stalled dependency pins the Worker open. */
const AUTH_TIMEOUT_MS = 5_000;
const OPENAI_TIMEOUT_MS = 20_000;
const PERSIST_TIMEOUT_MS = 5_000;

/** Requests permitted per window, per client key. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/** Largest request body accepted before parsing. */
const MAX_BODY_BYTES = 4_096;

const MAX_PROMPT_LENGTH = 500;
const MAX_GRUMBLE_LENGTH = 1000;

const TONES = ['dry', 'brutal', 'supportive'] as const;

const inputSchema = z.object({
  tone: z.enum(TONES).default('dry'),
  prompt: z.string().trim().max(MAX_PROMPT_LENGTH).optional(),
});

const SYSTEM_PROMPT =
  'You are Grumpy GuyAI: a witty, mildly grumpy productivity companion for hackers and hustlers. ' +
  'Return exactly one original sentence, 8–35 words. Be playful, never cruel; do not insult ' +
  'protected traits, give medical/legal/financial advice, threaten, or use profanity. ' +
  'Do not claim consciousness. Tone: ';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * CORS.
 *
 * The legacy code called `cors(...)` *inside* the handler, constructing a new
 * middleware closure on every request. Hono's `origin` option accepts a callback, so
 * the middleware is built once at module scope and still honours a per-environment
 * allow-list.
 */
const corsMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = cors({
  origin: (origin, c) => {
    // `c` is loosely typed by Hono's cors signature; narrow the binding explicitly.
    const configured = (c.env as Env | undefined)?.ALLOWED_ORIGIN ?? '';
    const allowed = configured
      .split(',')
      .map((value: string) => value.trim())
      .filter(Boolean);
    if (allowed.length === 0) return null;
    if (allowed.includes('*')) return origin ?? '*';
    return origin && allowed.includes(origin) ? origin : null;
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'OPTIONS'],
  maxAge: 86_400,
});

app.use('*', corsMiddleware);

/** Never leak a stack trace to the client. */
app.onError((error, c) => {
  console.error('[worker] Unhandled error:', error);
  return c.json({ error: 'Internal error' }, 500);
});

/**
 * Fixed-window rate limiter.
 *
 * In-memory and therefore per-isolate — enough to blunt casual abuse of a
 * spend-incurring endpoint. A Durable Object or KV counter is the correct next step
 * for strict global limits.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(c: AppContext): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'anonymous'
  );
}

function checkRateLimit(key: string, now: number): boolean {
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });

    // Opportunistic sweep keeps the map from growing without bound in a
    // long-lived isolate.
    if (hits.size > 1_000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

/** `fetch` with a hard deadline, so no upstream can hang the request. */
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  return await fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

/** Resolves the caller's user id from a bearer token, or `undefined` when anonymous. */
async function authenticatedUser(c: AppContext): Promise<string | undefined> {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return undefined;

  try {
    const response = await fetchWithTimeout(
      `${c.env.SUPABASE_URL}/auth/v1/user`,
      { headers: { Authorization: `Bearer ${token}`, apikey: c.env.SUPABASE_SERVICE_ROLE_KEY } },
      AUTH_TIMEOUT_MS,
    );
    if (!response.ok) return undefined;

    const user = await response.json<{ id?: unknown }>();
    return typeof user.id === 'string' ? user.id : undefined;
  } catch (error) {
    // A slow or failing auth service degrades the caller to anonymous rather than
    // failing an otherwise serviceable request.
    console.warn('[worker] Auth lookup failed:', error);
    return undefined;
  }
}

/** Persists a grumble. Returns the row id when the insert succeeded. */
async function persistGrumble(
  c: AppContext,
  row: { user_id: string; content: string; tone: string },
): Promise<string | undefined> {
  try {
    const response = await fetchWithTimeout(
      `${c.env.SUPABASE_URL}/rest/v1/grumbles`,
      {
        method: 'POST',
        headers: {
          apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(row),
      },
      PERSIST_TIMEOUT_MS,
    );

    if (!response.ok) {
      console.warn('[worker] Persist failed with status', response.status);
      return undefined;
    }

    const rows = await response.json<Array<{ id?: unknown }>>();
    const id = Array.isArray(rows) ? rows[0]?.id : undefined;
    return typeof id === 'string' ? id : undefined;
  } catch (error) {
    // Persistence is best-effort: a database problem must not discard a grumble the
    // user already paid for. The legacy code awaited this bare, so a rejection here
    // turned a successful generation into a 500.
    console.warn('[worker] Persist error:', error);
    return undefined;
  }
}

app.post('/grumble', async (c) => {
  // 1. Rate limit before spending anything.
  if (!checkRateLimit(rateLimitKey(c), Date.now())) {
    return c.json({ error: 'Too many grumbles. Pace yourself.' }, 429, {
      'Retry-After': String(Math.ceil(RATE_WINDOW_MS / 1000)),
    });
  }

  // 2. Reject oversized bodies before parsing them.
  const declaredLength = Number(c.req.header('Content-Length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return c.json({ error: 'Payload too large' }, 413);
  }

  // 3. Validate input.
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { tone, prompt } = parsed.data;
  const userId = await authenticatedUser(c);

  // 4. Generate.
  let completion: Response;
  try {
    completion = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.9,
          max_tokens: 80,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + tone },
            { role: 'user', content: prompt ? `Context: ${prompt}` : 'Give me a grumble.' },
          ],
        }),
      },
      OPENAI_TIMEOUT_MS,
    );
  } catch (error) {
    console.error('[worker] Generation request failed:', error);
    return c.json({ error: 'Generation temporarily unavailable' }, 502);
  }

  if (!completion.ok) return c.json({ error: 'Generation temporarily unavailable' }, 502);

  const payload = (await completion.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  const text = payload?.choices?.[0]?.message?.content?.trim();
  if (!text) return c.json({ error: 'Empty generation' }, 502);

  const content = text.slice(0, MAX_GRUMBLE_LENGTH);

  // 5. Persist for signed-in users, then answer with the *stored* id when we have
  //    one so the client id actually references the database row.
  const persistedId = userId
    ? await persistGrumble(c, { user_id: userId, content, tone })
    : undefined;

  return c.json({
    id: persistedId ?? crypto.randomUUID(),
    text: content,
    tone,
    createdAt: new Date().toISOString(),
    favorite: false,
  });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

/** Test-only hook: clears the in-memory rate-limit window. */
export function __resetRateLimitForTests(): void {
  hits.clear();
}

export default app;
