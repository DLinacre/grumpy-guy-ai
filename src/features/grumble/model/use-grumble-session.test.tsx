import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Grumble } from '../../../shared/domain/grumble';
import { useGrumbleSession } from './use-grumble-session';
import { LOCAL_STORAGE_KEY } from '../../preferences/model/local-state';
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

describe('useGrumbleSession', () => {
  it('generates a grumble and records it as current', async () => {
    const fetchGrumble = vi.fn().mockResolvedValue(grumble('one'));
    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble }));

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.current?.id).toBe('one');
    expect(result.current.history).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it('sends the trimmed prompt, or undefined when blank', async () => {
    const fetchGrumble = vi.fn().mockResolvedValue(grumble('one'));
    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble }));

    act(() => result.current.setPrompt('   spaced   '));
    await act(async () => {
      await result.current.generate();
    });
    expect(fetchGrumble).toHaveBeenLastCalledWith('dry', 'spaced', expect.anything());

    act(() => result.current.setPrompt('    '));
    await act(async () => {
      await result.current.generate();
    });
    expect(fetchGrumble).toHaveBeenLastCalledWith('dry', undefined, expect.anything());
  });

  it('clears the prompt after a successful generation', async () => {
    const fetchGrumble = vi.fn().mockResolvedValue(grumble('one'));
    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble }));

    act(() => result.current.setPrompt('why'));
    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.prompt).toBe('');
  });

  /** Regression: no `finally` in the legacy code left the button stuck on "Grumbling…". */
  it('clears loading when the request rejects', async () => {
    const fetchGrumble = vi.fn().mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble }));

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  /**
   * Regression: the legacy component fired overlapping requests and applied whichever
   * resolved last, so a slow early response could overwrite a newer one.
   */
  it('ignores a stale response that resolves after a newer one', async () => {
    let resolveFirst: ((value: Grumble) => void) | undefined;
    const fetchGrumble = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Grumble>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(grumble('second'));

    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble }));

    act(() => {
      void result.current.generate();
    });
    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.current?.id).toBe('second');

    // The superseded request now resolves; it must not clobber the newer result.
    await act(async () => {
      resolveFirst?.(grumble('first'));
      await Promise.resolve();
    });

    expect(result.current.current?.id).toBe('second');
    expect(result.current.history.map((h) => h.id)).toEqual(['second']);
  });

  it('speaks the result only when autoplay is enabled', async () => {
    const speak = vi.fn();
    const fetchGrumble = vi.fn().mockResolvedValue(grumble('one'));
    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble, speak }));

    await act(async () => {
      await result.current.generate();
    });
    expect(speak).not.toHaveBeenCalled();

    act(() =>
      result.current.setPreferences({ tone: 'dry', autoplay: true, reducedMotion: false }),
    );
    await act(async () => {
      await result.current.generate();
    });
    expect(speak).toHaveBeenCalledWith('Grumble one');
  });

  it('persists history and preferences to localStorage', async () => {
    const fetchGrumble = vi.fn().mockResolvedValue(grumble('one'));
    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble }));

    await act(async () => {
      await result.current.generate();
    });

    await waitFor(() => {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).history).toHaveLength(1);
    });
  });

  it('restores persisted state on mount', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        history: [grumble('restored')],
        preferences: { tone: 'brutal', autoplay: true, reducedMotion: true },
      }),
    );

    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble: vi.fn() }));

    expect(result.current.current?.id).toBe('restored');
    expect(result.current.preferences.tone).toBe('brutal');
  });

  /** Regression: corrupt persisted state used to crash the whole app on mount. */
  it('mounts safely when persisted state is corrupt', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ history: null }));
    expect(() => renderHook(() => useGrumbleSession({ fetchGrumble: vi.fn() }))).not.toThrow();
  });

  it('toggles favorites and clears history', async () => {
    const fetchGrumble = vi.fn().mockResolvedValue(grumble('one'));
    const { result } = renderHook(() => useGrumbleSession({ fetchGrumble }));

    await act(async () => {
      await result.current.generate();
    });

    act(() => result.current.toggleFavorite('one'));
    expect(result.current.current?.favorite).toBe(true);

    act(() => result.current.clearHistory());
    expect(result.current.history).toEqual([]);
    expect(result.current.current).toBeNull();
  });

  /** Regression: an in-flight request used to update state after unmount. */
  it('aborts the in-flight request on unmount', () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchGrumble = vi.fn(
      (_tone: unknown, _prompt: unknown, options?: { signal?: AbortSignal }) =>
        new Promise<Grumble>(() => {
          capturedSignal = options?.signal;
        }),
    );

    const { result, unmount } = renderHook(() => useGrumbleSession({ fetchGrumble }));

    act(() => {
      void result.current.generate();
    });
    expect(capturedSignal?.aborted).toBe(false);

    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
