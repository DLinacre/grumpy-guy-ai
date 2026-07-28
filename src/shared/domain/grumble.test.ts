import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  TONES,
  isTone,
  parseGrumble,
  parsePreferences,
  type Grumble,
} from './grumble';

const valid: Grumble = {
  id: 'abc',
  text: 'Ship it.',
  tone: 'dry',
  createdAt: '2026-07-28T10:00:00.000Z',
  favorite: false,
};

describe('isTone', () => {
  it.each(TONES)('accepts the known tone %s', (tone) => {
    expect(isTone(tone)).toBe(true);
  });

  it.each([['angry'], [''], [null], [undefined], [42], [{}]])('rejects %s', (value) => {
    expect(isTone(value)).toBe(false);
  });
});

describe('parseGrumble', () => {
  it('accepts a well-formed grumble', () => {
    expect(parseGrumble(valid)).toEqual(valid);
  });

  it('rejects non-objects', () => {
    for (const value of [null, undefined, 'text', 7, [], true]) {
      expect(parseGrumble(value)).toBeNull();
    }
  });

  it.each([
    ['id', { ...valid, id: 1 }],
    ['empty id', { ...valid, id: '' }],
    ['text', { ...valid, text: null }],
    ['empty text', { ...valid, text: '' }],
    ['tone', { ...valid, tone: 'sarcastic' }],
    ['createdAt', { ...valid, createdAt: 12345 }],
    ['favorite', { ...valid, favorite: 'yes' }],
  ])('rejects a bad %s', (_label, value) => {
    expect(parseGrumble(value)).toBeNull();
  });

  it('does not carry unknown properties through', () => {
    const result = parseGrumble({ ...valid, injected: 'nope' });
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('injected');
  });
});

describe('parsePreferences', () => {
  it('accepts well-formed preferences', () => {
    const prefs = { tone: 'brutal' as const, autoplay: true, reducedMotion: true };
    expect(parsePreferences(prefs)).toEqual(prefs);
  });

  it('falls back to defaults for a non-object', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('nope')).toEqual(DEFAULT_PREFERENCES);
  });

  it('repairs individual invalid fields without discarding valid ones', () => {
    expect(parsePreferences({ tone: 'nonsense', autoplay: true, reducedMotion: 'x' })).toEqual({
      tone: DEFAULT_PREFERENCES.tone,
      autoplay: true,
      reducedMotion: DEFAULT_PREFERENCES.reducedMotion,
    });
  });
});

describe('DEFAULT_PREFERENCES', () => {
  it('is frozen so callers cannot mutate shared defaults', () => {
    expect(Object.isFrozen(DEFAULT_PREFERENCES)).toBe(true);
  });
});
