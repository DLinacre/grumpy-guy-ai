import { describe, expect, it, beforeEach } from 'vitest';
import { loadLocal, saveLocal, defaults } from './storage';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  for (const key in mockStorage) delete mockStorage[key];
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { for (const key in mockStorage) delete mockStorage[key]; },
    length: 0,
    key: () => null,
  };
});

describe('Local Storage Utility', () => {
  it('returns default preferences when storage is empty', () => {
    localStorage.clear();
    const data = loadLocal();
    expect(data.history).toEqual([]);
    expect(data.preferences).toEqual(defaults);
  });

  it('saves and reloads state correctly', () => {
    const mockState = {
      history: [{ id: '123', text: 'Test grumble', tone: 'dry' as const, createdAt: new Date().toISOString(), favorite: true }],
      preferences: { tone: 'brutal' as const, autoplay: true, reducedMotion: false }
    };
    saveLocal(mockState);
    const loaded = loadLocal();
    expect(loaded.history.length).toBe(1);
    expect(loaded.history[0]?.id).toBe('123');
    expect(loaded.preferences.tone).toBe('brutal');
  });
});
