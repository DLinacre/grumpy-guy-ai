import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES, HISTORY_LIMIT, type Grumble } from '../../../shared/domain/grumble';
import { LOCAL_STORAGE_KEY, loadLocalState, saveLocalState } from './local-state';
import { resetStorageProbeForTests } from '../../../shared/lib/safe-storage';

function grumble(id: string): Grumble {
  return {
    id,
    text: `Grumble ${id}`,
    tone: 'dry',
    createdAt: '2026-07-28T10:00:00.000Z',
    favorite: false,
  };
}

beforeEach(() => {
  localStorage.clear();
  resetStorageProbeForTests();
});

describe('loadLocalState', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadLocalState()).toEqual({ history: [], preferences: DEFAULT_PREFERENCES });
  });

  it('round-trips a saved state', () => {
    const state = {
      history: [grumble('a')],
      preferences: { tone: 'brutal' as const, autoplay: true, reducedMotion: false },
    };
    saveLocalState(state);
    expect(loadLocalState()).toEqual(state);
  });

  /**
   * Regression: the legacy loader cast the parsed JSON with `as LocalState`, so
   * `{"history":null}` reached the component and `initial.history[0]` threw,
   * producing a permanently blank page.
   */
  it('does not throw and recovers when history is null', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ history: null }));
    expect(() => loadLocalState()).not.toThrow();
    expect(loadLocalState().history).toEqual([]);
  });

  it('recovers from malformed JSON', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, '{not json');
    expect(loadLocalState()).toEqual({ history: [], preferences: DEFAULT_PREFERENCES });
  });

  it('recovers from a stored primitive', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, '"a string"');
    expect(loadLocalState()).toEqual({ history: [], preferences: DEFAULT_PREFERENCES });
  });

  it('drops only the corrupt entries in history', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        history: [grumble('good'), { id: 'bad' }, null, 'nope', grumble('also-good')],
        preferences: DEFAULT_PREFERENCES,
      }),
    );
    const { history } = loadLocalState();
    expect(history.map((h) => h.id)).toEqual(['good', 'also-good']);
  });

  it('repairs corrupt preferences while keeping valid history', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ history: [grumble('a')], preferences: { tone: 'wrong' } }),
    );
    const state = loadLocalState();
    expect(state.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(state.history).toHaveLength(1);
  });

  it('caps restored history at the retention limit', () => {
    const history = Array.from({ length: HISTORY_LIMIT + 15 }, (_, i) => grumble(`g${i}`));
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ history, preferences: DEFAULT_PREFERENCES }),
    );
    expect(loadLocalState().history).toHaveLength(HISTORY_LIMIT);
  });
});

describe('saveLocalState', () => {
  it('reports success on a healthy store', () => {
    expect(saveLocalState({ history: [], preferences: DEFAULT_PREFERENCES })).toBe(true);
  });

  it('trims history to the retention limit before writing', () => {
    const history = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) => grumble(`g${i}`));
    saveLocalState({ history, preferences: DEFAULT_PREFERENCES });
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)!) as { history: Grumble[] };
    expect(stored.history).toHaveLength(HISTORY_LIMIT);
  });

  /**
   * Regression: the legacy `saveLocal` called `setItem` bare inside an effect, so a
   * quota error (or Safari private mode) threw on every state change.
   */
  it('returns false instead of throwing when the quota is exceeded', () => {
    resetStorageProbeForTests();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => saveLocalState({ history: [], preferences: DEFAULT_PREFERENCES })).not.toThrow();
    expect(saveLocalState({ history: [], preferences: DEFAULT_PREFERENCES })).toBe(false);

    spy.mockRestore();
    resetStorageProbeForTests();
  });
});
