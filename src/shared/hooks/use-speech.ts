import { useCallback, useEffect, useRef } from 'react';

/**
 * Web Speech API wrapper.
 *
 * Fixes two defects in the legacy `speak()` helper:
 *  1. It referenced the global `speechSynthesis` with no feature detection, throwing
 *     a `ReferenceError` in browsers and webviews that do not implement it.
 *  2. Nothing cancelled the utterance on unmount, so the voice kept talking after the
 *     component was torn down.
 */
export function useSpeech(): {
  speak: (text: string) => void;
  cancel: () => void;
  supported: boolean;
} {
  const supportedRef = useRef<boolean | null>(null);

  if (supportedRef.current === null) {
    supportedRef.current =
      typeof globalThis !== 'undefined' &&
      'speechSynthesis' in globalThis &&
      typeof globalThis.SpeechSynthesisUtterance === 'function';
  }

  const supported = supportedRef.current;

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      globalThis.speechSynthesis.cancel();
    } catch {
      /* speech is a progressive enhancement; failures are non-fatal */
    }
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return;
      try {
        // Cancel first so a rapid second grumble replaces the first instead of queueing.
        globalThis.speechSynthesis.cancel();
        globalThis.speechSynthesis.speak(new globalThis.SpeechSynthesisUtterance(text));
      } catch {
        /* non-fatal */
      }
    },
    [supported],
  );

  // Stop any in-flight speech when the owning component unmounts.
  useEffect(() => cancel, [cancel]);

  return { speak, cancel, supported };
}
