import {
  DEFAULT_PREFERENCES,
  HISTORY_LIMIT,
  parseGrumble,
  parsePreferences,
  type Grumble,
  type Preferences,
} from '../../../shared/domain/grumble';
import { readItem, writeItem } from '../../../shared/lib/safe-storage';

/** Storage key. Unchanged from the legacy build so existing users keep their history. */
const KEY = 'grumpy-guy-ai';

/** Shape persisted to `localStorage`. Preserves the legacy `LocalState` contract. */
export type LocalState = {
  history: Grumble[];
  preferences: Preferences;
};

/**
 * Tolerant rehydration.
 *
 * The legacy loader did `JSON.parse(...) as LocalState` — a cast, not a check. A
 * truncated or hand-edited payload such as `{"history":null}` therefore reached
 * `useState`, and the very next line (`initial.history[0]`) threw, leaving a blank
 * page with no way to recover short of clearing site data.
 *
 * Here every field is validated. A corrupt *part* of the payload degrades to its
 * default rather than discarding everything, and unparseable grumbles are dropped
 * individually instead of poisoning the whole array.
 */
function rehydrate(raw: unknown): LocalState {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  const rawHistory = source['history'];
  const history = Array.isArray(rawHistory)
    ? rawHistory.flatMap((entry) => {
        const grumble = parseGrumble(entry);
        return grumble ? [grumble] : [];
      })
    : [];

  return {
    history: history.slice(0, HISTORY_LIMIT),
    preferences: parsePreferences(source['preferences']),
  };
}

/** Immutable empty state handed back whenever nothing usable was stored. */
function emptyState(): LocalState {
  return { history: [], preferences: { ...DEFAULT_PREFERENCES } };
}

/**
 * Loads persisted state, never throwing.
 *
 * @returns Validated state, falling back to defaults for anything missing or corrupt.
 */
export function loadLocalState(): LocalState {
  const raw = readItem(KEY);
  if (!raw) return emptyState();

  try {
    return rehydrate(JSON.parse(raw));
  } catch {
    // Malformed JSON — treat as a first-time visit.
    return emptyState();
  }
}

/**
 * Persists state, never throwing.
 *
 * @returns `true` when the write succeeded; `false` when storage is unavailable or full.
 */
export function saveLocalState(state: LocalState): boolean {
  try {
    const payload: LocalState = {
      history: state.history.slice(0, HISTORY_LIMIT),
      preferences: state.preferences,
    };
    return writeItem(KEY, JSON.stringify(payload));
  } catch {
    // Circular or non-serialisable input can make `stringify` throw.
    return false;
  }
}

export { KEY as LOCAL_STORAGE_KEY };
