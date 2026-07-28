import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestGrumble } from './api';
import { FALLBACK_LINES } from '../features/grumble/api/fallback';
import type { Grumble } from '../shared/domain/grumble';

/**
 * Tests for the legacy public entry point `src/lib/api.ts`.
 *
 * The original three cases are retained verbatim below to prove the refactor is
 * behaviour-preserving, but the network is now mocked. Previously they issued a real
 * `fetch` and passed only because a relative URL happens to throw under Node — an
 * environment-dependent accident rather than a controlled offline test.
 */

/** Narrows a fetch `BodyInit` to the JSON string these tests always send. */
function asBodyString(body: BodyInit | null | undefined): string {
  return typeof body === 'string' ? body : '';
}

const validResponse: Grumble = {
  id: 'server-id',
  text: 'A grumble from the server.',
  tone: 'dry',
  createdAt: '2026-07-28T10:00:00.000Z',
  favorite: false,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Preserved legacy contract
// ---------------------------------------------------------------------------
describe('requestGrumble (legacy contract)', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
  });

  it('returns a grumble object with fallback text when offline', async () => {
    const result = await requestGrumble('dry', 'Writing unit tests');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('text');
    expect(result.tone).toBe('dry');
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('handles brutal tone correctly', async () => {
    const result = await requestGrumble('brutal');
    expect(result.tone).toBe('brutal');
    expect(result.text).toBeTruthy();
  });

  it('handles supportive tone correctly', async () => {
    const result = await requestGrumble('supportive');
    expect(result.tone).toBe('supportive');
    expect(result.text).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// New coverage
// ---------------------------------------------------------------------------
describe('requestGrumble (network behaviour)', () => {
  it('returns the server payload when the request succeeds', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(validResponse));
    await expect(requestGrumble('dry')).resolves.toEqual(validResponse);
  });

  it('POSTs the tone and prompt as JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(validResponse));
    await requestGrumble('brutal', '  procrastinating  ');

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.method).toBe('POST');
    expect(JSON.parse(asBodyString(init?.body))).toEqual({
      tone: 'brutal',
      prompt: '  procrastinating  ',
    });
  });

  it('omits the Authorization header when signed out', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(validResponse));
    await requestGrumble('dry');

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.headers).not.toHaveProperty('Authorization');
  });

  it('falls back when the service returns a non-OK status', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'boom' }, 502));
    const result = await requestGrumble('dry');
    expect(FALLBACK_LINES.dry).toContain(result.text);
  });

  /** A proxy returning an HTML error page must not become a `Grumble`. */
  it('falls back when the payload is malformed', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ nonsense: true }));
    const result = await requestGrumble('supportive');
    expect(FALLBACK_LINES.supportive).toContain(result.text);
  });

  it('falls back when the response is not JSON at all', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('<html>502</html>', { status: 200 }));
    const result = await requestGrumble('dry');
    expect(FALLBACK_LINES.dry).toContain(result.text);
  });

  it('always produces a schema-valid grumble on the fallback path', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    const result = await requestGrumble('brutal', 'x');

    expect(result.id).toMatch(/[0-9a-f-]{36}/i);
    expect(result.favorite).toBe(false);
    expect(result.tone).toBe('brutal');
    expect(() => new Date(result.createdAt).toISOString()).not.toThrow();
  });

  it('truncates an over-long prompt to the documented maximum', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(validResponse));
    await requestGrumble('dry', 'x'.repeat(2000));

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(asBodyString(init?.body)) as { prompt: string };
    expect(body.prompt).toHaveLength(500);
  });

  it('passes an abort signal to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(validResponse));
    const controller = new AbortController();
    await requestGrumble('dry', undefined, { signal: controller.signal });

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  /** Cancellation is a caller decision, so it propagates instead of silently falling back. */
  it('rethrows when the caller aborts', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    await expect(
      requestGrumble('dry', undefined, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
