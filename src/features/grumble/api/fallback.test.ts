import { describe, expect, it } from 'vitest';
import { TONES } from '../../../shared/domain/grumble';
import { FALLBACK_LINES, pickFallback } from './fallback';

describe('pickFallback', () => {
  it.each(TONES)('returns a non-empty line for %s', (tone) => {
    const line = pickFallback(tone);
    expect(typeof line).toBe('string');
    expect(line.length).toBeGreaterThan(0);
    expect(FALLBACK_LINES[tone]).toContain(line);
  });

  /**
   * Regression: the legacy picker hardcoded `Math.floor(Math.random() * 3)`, which
   * silently breaks (biasing, or returning `undefined`) as soon as the copy changes.
   * Deriving the bound from the array length keeps every line reachable.
   */
  it('can reach every line for a tone', () => {
    for (const tone of TONES) {
      const lines = FALLBACK_LINES[tone];
      const seen = lines.map((_, index) => pickFallback(tone, () => index / lines.length));
      expect(new Set(seen).size).toBe(lines.length);
    }
  });

  it('never returns undefined even when random() returns exactly 1', () => {
    for (const tone of TONES) {
      expect(pickFallback(tone, () => 1)).toBeTruthy();
      expect(pickFallback(tone, () => 0.999999)).toBeTruthy();
    }
  });

  it('returns the first line when random() is 0', () => {
    for (const tone of TONES) {
      expect(pickFallback(tone, () => 0)).toBe(FALLBACK_LINES[tone][0]);
    }
  });
});
