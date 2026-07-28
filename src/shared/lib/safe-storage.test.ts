import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isStorageAvailable,
  readItem,
  removeItem,
  resetStorageProbeForTests,
  writeItem,
} from './safe-storage';

beforeEach(() => {
  localStorage.clear();
  resetStorageProbeForTests();
});

describe('safe-storage', () => {
  it('round-trips a value', () => {
    expect(writeItem('k', 'v')).toBe(true);
    expect(readItem('k')).toBe('v');
  });

  it('returns null for a missing key', () => {
    expect(readItem('absent')).toBeNull();
  });

  it('removes a value', () => {
    writeItem('k', 'v');
    removeItem('k');
    expect(readItem('k')).toBeNull();
  });

  it('reports availability in a healthy environment', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  /** Safari private mode and full quotas throw on write; this must not propagate. */
  it('returns false rather than throwing when writes are rejected', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    resetStorageProbeForTests();

    expect(() => writeItem('k', 'v')).not.toThrow();
    expect(writeItem('k', 'v')).toBe(false);
    expect(isStorageAvailable()).toBe(false);

    spy.mockRestore();
    resetStorageProbeForTests();
  });

  it('returns null rather than throwing when reads fail', () => {
    resetStorageProbeForTests();
    isStorageAvailable();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => readItem('k')).not.toThrow();
    expect(readItem('k')).toBeNull();

    spy.mockRestore();
  });

  it('swallows failures when removing', () => {
    resetStorageProbeForTests();
    isStorageAvailable();
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => removeItem('k')).not.toThrow();
    spy.mockRestore();
  });
});
