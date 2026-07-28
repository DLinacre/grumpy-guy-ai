/**
 * Defensive `localStorage` wrapper.
 *
 * `localStorage` is not universally available: Safari's private mode historically
 * threw on write, embedded webviews and sandboxed iframes can throw merely on
 * *access*, and every browser throws `QuotaExceededError` once full. The legacy
 * code called `localStorage.getItem`/`setItem` bare, so any of those conditions
 * produced an unhandled exception during render or inside an effect.
 */

function probe(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    // Touching a key proves the store is readable and writable, not merely present.
    const probeKey = '__grumpy_probe__';
    storage.setItem(probeKey, probeKey);
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

let cached: Storage | null | undefined;

function storage(): Storage | null {
  if (cached === undefined) cached = probe();
  return cached;
}

/** Reads a key, returning `null` when unavailable or unreadable. */
export function readItem(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Writes a key. Returns `false` when the write was rejected (e.g. quota exceeded). */
export function writeItem(key: string, value: string): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Removes a key, ignoring any failure. */
export function removeItem(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* nothing sensible to do */
  }
}

/** True when a working `localStorage` is available in this context. */
export function isStorageAvailable(): boolean {
  return storage() !== null;
}

/** Test-only hook: forgets the cached availability probe. */
export function resetStorageProbeForTests(): void {
  cached = undefined;
}
