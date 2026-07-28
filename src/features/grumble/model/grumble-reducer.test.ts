import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, HISTORY_LIMIT, type Grumble } from '../../../shared/domain/grumble';
import { createInitialState, grumbleReducer, type GrumbleState } from './grumble-reducer';

function grumble(id: string, favorite = false): Grumble {
  return {
    id,
    text: `Grumble ${id}`,
    tone: 'dry',
    createdAt: '2026-07-28T10:00:00.000Z',
    favorite,
  };
}

const base: GrumbleState = createInitialState([], { ...DEFAULT_PREFERENCES });

describe('createInitialState', () => {
  it('selects the newest grumble as current', () => {
    const state = createInitialState([grumble('a'), grumble('b')], { ...DEFAULT_PREFERENCES });
    expect(state.current?.id).toBe('a');
  });

  it('handles an empty history without throwing', () => {
    expect(createInitialState([], { ...DEFAULT_PREFERENCES }).current).toBeNull();
  });
});

describe('grumbleReducer', () => {
  it('records the prompt', () => {
    const next = grumbleReducer(base, { type: 'prompt/changed', prompt: 'hello' });
    expect(next.prompt).toBe('hello');
  });

  it('sets loading and clears any previous error when a request starts', () => {
    const errored = { ...base, error: 'boom' };
    const next = grumbleReducer(errored, { type: 'request/started' });
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it('applies a success atomically', () => {
    const loading = grumbleReducer({ ...base, prompt: 'typed' }, { type: 'request/started' });
    const next = grumbleReducer(loading, { type: 'request/succeeded', grumble: grumble('new') });

    expect(next.loading).toBe(false);
    expect(next.current?.id).toBe('new');
    expect(next.history[0]?.id).toBe('new');
    expect(next.prompt).toBe('');
    expect(next.error).toBeNull();
  });

  /** Regression: the legacy code had no `finally`, so a rejection stuck the button. */
  it('always clears loading on failure', () => {
    const loading = grumbleReducer(base, { type: 'request/started' });
    const next = grumbleReducer(loading, { type: 'request/failed', message: 'nope' });
    expect(next.loading).toBe(false);
    expect(next.error).toBe('nope');
  });

  it('caps history at the retention limit', () => {
    let state: GrumbleState = base;
    for (let i = 0; i < HISTORY_LIMIT + 10; i += 1) {
      state = grumbleReducer(state, { type: 'request/succeeded', grumble: grumble(`g${i}`) });
    }
    expect(state.history).toHaveLength(HISTORY_LIMIT);
    expect(state.history[0]?.id).toBe(`g${HISTORY_LIMIT + 9}`);
  });

  it('selects an existing grumble and ignores an unknown id', () => {
    const seeded = createInitialState([grumble('a'), grumble('b')], { ...DEFAULT_PREFERENCES });
    expect(grumbleReducer(seeded, { type: 'grumble/selected', id: 'b' }).current?.id).toBe('b');
    expect(grumbleReducer(seeded, { type: 'grumble/selected', id: 'zzz' })).toBe(seeded);
  });

  it('keeps history and current in sync when toggling a favorite', () => {
    const seeded = createInitialState([grumble('a')], { ...DEFAULT_PREFERENCES });
    const next = grumbleReducer(seeded, { type: 'grumble/favoriteToggled', id: 'a' });

    expect(next.history[0]?.favorite).toBe(true);
    expect(next.current?.favorite).toBe(true);

    const back = grumbleReducer(next, { type: 'grumble/favoriteToggled', id: 'a' });
    expect(back.history[0]?.favorite).toBe(false);
    expect(back.current?.favorite).toBe(false);
  });

  it('does not mutate the previous state', () => {
    const seeded = createInitialState([grumble('a')], { ...DEFAULT_PREFERENCES });
    const snapshot = JSON.stringify(seeded);
    grumbleReducer(seeded, { type: 'grumble/favoriteToggled', id: 'a' });
    expect(JSON.stringify(seeded)).toBe(snapshot);
  });

  it('clears history and current but preserves preferences', () => {
    const seeded = createInitialState([grumble('a')], {
      tone: 'brutal',
      autoplay: true,
      reducedMotion: false,
    });
    const next = grumbleReducer(seeded, { type: 'history/cleared' });

    expect(next.history).toEqual([]);
    expect(next.current).toBeNull();
    expect(next.preferences.tone).toBe('brutal');
  });

  it('replaces preferences', () => {
    const next = grumbleReducer(base, {
      type: 'preferences/changed',
      preferences: { tone: 'supportive', autoplay: true, reducedMotion: true },
    });
    expect(next.preferences).toEqual({ tone: 'supportive', autoplay: true, reducedMotion: true });
  });
});
