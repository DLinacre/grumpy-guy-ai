import {
  loadLocalState,
  saveLocalState,
  type LocalState,
} from '../features/preferences/model/local-state';
import { DEFAULT_PREFERENCES } from '../shared/domain/grumble';
import type { Preferences } from '../shared/domain/grumble';

/**
 * Legacy storage entry point — preserved for backwards compatibility.
 *
 * `loadLocal`, `saveLocal` and `defaults` keep their original names and signatures.
 * The behaviour is strictly safer: reads are schema-validated instead of cast, and
 * neither function can throw.
 */

/** Default preferences. Mutable copy retained for API parity with the original export. */
const defaults: Preferences = { ...DEFAULT_PREFERENCES };

export function loadLocal(): LocalState {
  return loadLocalState();
}

export function saveLocal(state: LocalState): void {
  saveLocalState(state);
}

export { defaults };
export type { LocalState };
