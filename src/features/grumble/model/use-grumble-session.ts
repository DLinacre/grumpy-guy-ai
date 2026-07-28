import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Grumble, Preferences, Tone } from '../../../shared/domain/grumble';
import { isAbortError } from '../../../shared/lib/result';
import { loadLocalState, saveLocalState } from '../../preferences/model/local-state';
import { requestGrumble } from '../api/grumble-client';
import {
  createInitialState,
  grumbleReducer,
  type GrumbleState,
} from './grumble-reducer';

export type GrumbleSession = GrumbleState & {
  setPrompt: (prompt: string) => void;
  generate: () => Promise<void>;
  select: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setPreferences: (preferences: Preferences) => void;
  clearHistory: () => void;
  speechSupported: boolean;
  speak: (text: string) => void;
};

type Options = {
  /** Injected so tests can drive generation without touching the network. */
  fetchGrumble?: typeof requestGrumble;
  /** Injected speech sink; defaults to the Web Speech API wrapper. */
  speak?: (text: string) => void;
  speechSupported?: boolean;
};

/**
 * Owns the full grumble session lifecycle.
 *
 * Extracting this from the god component isolates every async side-effect behind one
 * testable surface and fixes the concurrency and teardown bugs described in the audit.
 */
export function useGrumbleSession(options: Options = {}): GrumbleSession {
  const { fetchGrumble = requestGrumble, speak: speakFn, speechSupported = false } = options;

  // Read persisted state exactly once. Passing the initialiser as a function keeps
  // `localStorage` off the hot render path on every subsequent render.
  const [state, dispatch] = useReducer(
    grumbleReducer,
    undefined,
    (): GrumbleState => {
      const persisted = loadLocalState();
      return createInitialState(persisted.history, persisted.preferences);
    },
  );

  /** Tracks the newest request so slower stale responses can be discarded. */
  const requestIdRef = useRef(0);
  /** Aborts whatever is in flight when the component unmounts. */
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel the in-flight request so its resolution cannot call dispatch
      // after teardown, and so the browser can drop the connection.
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  // Persist on change. Writes go through the guarded storage wrapper, so a full or
  // unavailable store degrades silently instead of throwing inside the effect.
  useEffect(() => {
    saveLocalState({ history: [...state.history], preferences: state.preferences });
  }, [state.history, state.preferences]);

  const generate = useCallback(async (): Promise<void> => {
    // Supersede any request already running: the user asked for something newer.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const requestId = ++requestIdRef.current;
    const tone: Tone = state.preferences.tone;
    const prompt = state.prompt.trim() || undefined;
    const shouldAutoplay = state.preferences.autoplay;

    dispatch({ type: 'request/started' });

    try {
      const grumble: Grumble = await fetchGrumble(tone, prompt, { signal: controller.signal });

      // Guard against both unmount and out-of-order completion. Without the
      // requestId check, a slow first response could overwrite a newer one.
      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      dispatch({ type: 'request/succeeded', grumble });
      if (shouldAutoplay) speakFn?.(grumble.text);
    } catch (cause) {
      if (isAbortError(cause)) return; // Intentional cancellation, not a failure.
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      dispatch({
        type: 'request/failed',
        message: 'He is sulking and will not respond. Try again.',
      });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [fetchGrumble, speakFn, state.preferences.autoplay, state.preferences.tone, state.prompt]);

  const setPrompt = useCallback((prompt: string) => {
    dispatch({ type: 'prompt/changed', prompt });
  }, []);

  const select = useCallback((id: string) => {
    dispatch({ type: 'grumble/selected', id });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    dispatch({ type: 'grumble/favoriteToggled', id });
  }, []);

  const setPreferences = useCallback((preferences: Preferences) => {
    dispatch({ type: 'preferences/changed', preferences });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'history/cleared' });
  }, []);

  const speak = useCallback((text: string) => speakFn?.(text), [speakFn]);

  return useMemo(
    () => ({
      ...state,
      setPrompt,
      generate,
      select,
      toggleFavorite,
      setPreferences,
      clearHistory,
      speechSupported,
      speak,
    }),
    [
      state,
      setPrompt,
      generate,
      select,
      toggleFavorite,
      setPreferences,
      clearHistory,
      speechSupported,
      speak,
    ],
  );
}
