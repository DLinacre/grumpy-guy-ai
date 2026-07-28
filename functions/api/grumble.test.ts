import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app, { __resetRateLimitForTests, type Env } from './grumble';

/**
 * Worker tests.
 *
 * The Worker was previously untested *and* excluded from every tsconfig, so it was
 * neither type-checked nor exercised. These cases cover the security-relevant paths:
 * validation, rate limiting, CORS, upstream failure handling and persistence.
 */

const env: Env = {
  OPENAI_API_KEY: 'test-openai-key',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
  ALLOWED_ORIGIN: 'https://dlinacre.github.io',
};

function completion(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Safely renders a fetch input (string | Request | URL) as a URL string. */
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Narrows a fetch `BodyInit` to the JSON string these tests always send. */
function asBodyString(body: BodyInit | null | undefined): string {
  return typeof body === 'string' ? body : '';
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://worker.dev/grumble', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetRateLimitForTests();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /grumble', () => {
  it('returns a generated grumble', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('Ship it, eventually.'));

    const res = await app.fetch(post({ tone: 'dry' }), env);
    expect(res.status).toBe(200);

    const body: Record<string, unknown> = await res.json();
    expect(body).toMatchObject({ text: 'Ship it, eventually.', tone: 'dry', favorite: false });
    expect(typeof body['id']).toBe('string');
  });

  it('defaults the tone to dry', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('A grumble.'));
    const res = await app.fetch(post({}), env);
    const body: { tone: string } = await res.json();
    expect(body.tone).toBe('dry');
  });

  it('rejects an unknown tone', async () => {
    const res = await app.fetch(post({ tone: 'furious' }), env);
    expect(res.status).toBe(400);
  });

  it('rejects a prompt over the length limit', async () => {
    const res = await app.fetch(post({ tone: 'dry', prompt: 'x'.repeat(501) }), env);
    expect(res.status).toBe(400);
  });

  it('rejects a malformed JSON body', async () => {
    const request = new Request('https://worker.dev/grumble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
      body: 'not json',
    });
    expect((await app.fetch(request, env)).status).toBe(400);
  });

  it('rejects an oversized payload before parsing it', async () => {
    const res = await app.fetch(post({ tone: 'dry' }, { 'Content-Length': '99999' }), env);
    expect(res.status).toBe(413);
  });

  it('passes the selected tone through to the model prompt', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('Brutal truth.'));
    await app.fetch(post({ tone: 'brutal', prompt: 'my backlog' }), env);

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const payload = JSON.parse(asBodyString(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(payload.messages[0]?.content).toContain('Tone: brutal');
    expect(payload.messages[1]?.content).toContain('my backlog');
  });

  it('returns 502 when the model call fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 500 }));
    expect((await app.fetch(post({ tone: 'dry' }), env)).status).toBe(502);
  });

  it('returns 502 when the model call throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    expect((await app.fetch(post({ tone: 'dry' }), env)).status).toBe(502);
  });

  it('returns 502 on an empty generation', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('   '));
    expect((await app.fetch(post({ tone: 'dry' }), env)).status).toBe(502);
  });

  it('truncates generated text to the persisted maximum', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('x'.repeat(1500)));
    const res = await app.fetch(post({ tone: 'dry' }), env);
    const body: { text: string } = await res.json();
    expect(body.text).toHaveLength(1000);
  });

  /** Regression: the legacy handler awaited the insert bare, so a DB error became a 500. */
  it('still returns the grumble when persistence fails', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes('openai')) return Promise.resolve(completion('Persisted or not.'));
      if (url.includes('/auth/v1/user')) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: 'user-1' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.reject(new Error('database on fire'));
    });

    const res = await app.fetch(post({ tone: 'dry' }, { Authorization: 'Bearer token' }), env);
    expect(res.status).toBe(200);
    const body: { text: string } = await res.json();
    expect(body.text).toBe('Persisted or not.');
  });

  /** Regression: the id used to be a throwaway UUID unrelated to the stored row. */
  it('returns the persisted row id for a signed-in user', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes('openai')) return Promise.resolve(completion('Stored.'));
      if (url.includes('/auth/v1/user')) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: 'user-1' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify([{ id: 'row-42' }]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    const res = await app.fetch(post({ tone: 'dry' }, { Authorization: 'Bearer token' }), env);
    const body: { id: string } = await res.json();
    expect(body.id).toBe('row-42');
  });

  it('treats a failed auth lookup as anonymous rather than erroring', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes('openai')) return Promise.resolve(completion('Anonymous grumble.'));
      return Promise.resolve(new Response('unauthorized', { status: 401 }));
    });

    const res = await app.fetch(post({ tone: 'dry' }, { Authorization: 'Bearer bad' }), env);
    expect(res.status).toBe(200);
    // No persistence attempt should have been made for an anonymous caller.
    const persisted = vi.mocked(fetch).mock.calls.some(([url]) => urlOf(url).includes('/rest/v1/'));
    expect(persisted).toBe(false);
  });

  it('does not persist for anonymous callers', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('Anonymous.'));
    await app.fetch(post({ tone: 'dry' }), env);

    const persisted = vi.mocked(fetch).mock.calls.some(([url]) => urlOf(url).includes('/rest/v1/'));
    expect(persisted).toBe(false);
  });
});

describe('rate limiting', () => {
  it('returns 429 once the window budget is spent', async () => {
    // A Response body can only be read once, so build a fresh one per call.
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(completion('Grumble.')));

    const send = () => app.fetch(post({ tone: 'dry' }, { 'CF-Connecting-IP': '198.51.100.7' }), env);
    for (let i = 0; i < 20; i += 1) {
      expect((await send()).status).toBe(200);
    }

    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
  });

  it('tracks clients independently', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(completion('Grumble.')));

    for (let i = 0; i < 20; i += 1) {
      await app.fetch(post({ tone: 'dry' }, { 'CF-Connecting-IP': '198.51.100.8' }), env);
    }

    const other = await app.fetch(
      post({ tone: 'dry' }, { 'CF-Connecting-IP': '198.51.100.9' }),
      env,
    );
    expect(other.status).toBe(200);
  });
});

describe('CORS', () => {
  it('reflects an allowed origin', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('Grumble.'));
    const res = await app.fetch(
      post({ tone: 'dry' }, { Origin: 'https://dlinacre.github.io' }),
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://dlinacre.github.io');
  });

  it('does not reflect a disallowed origin', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('Grumble.'));
    const res = await app.fetch(post({ tone: 'dry' }, { Origin: 'https://evil.example' }), env);
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('https://evil.example');
  });

  it('supports a comma-separated allow-list', async () => {
    vi.mocked(fetch).mockResolvedValue(completion('Grumble.'));
    const multi: Env = {
      ...env,
      ALLOWED_ORIGIN: 'http://localhost:5173, https://dlinacre.github.io',
    };
    const res = await app.fetch(post({ tone: 'dry' }, { Origin: 'http://localhost:5173' }), multi);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
});

describe('routing', () => {
  it('returns a JSON 404 for unknown paths', async () => {
    const res = await app.fetch(new Request('https://worker.dev/nope'), env);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});
