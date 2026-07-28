/**
 * Canonical domain contracts.
 *
 * These are hand-written types plus narrow runtime guards rather than Zod schemas.
 * Zod is excellent on the server, but pulling it into the browser bundle cost ~52 kB
 * (11.8 kB gzip) on first paint purely to validate two small, stable shapes. The
 * guards below are exhaustive for those shapes and add no dependency weight.
 * The Worker still uses Zod, where bundle size is irrelevant.
 */

export const TONES = ['dry', 'brutal', 'supportive'] as const;

/** A grumble's tone. Preserved from the original `src/types` contract. */
export type Tone = (typeof TONES)[number];

/** Maximum characters accepted for user-supplied context. Mirrors the API guard. */
export const MAX_PROMPT_LENGTH = 500;

/** Maximum characters persisted for generated text. Mirrors the DB check constraint. */
export const MAX_GRUMBLE_LENGTH = 1000;

/** Number of grumbles retained in local history. */
export const HISTORY_LIMIT = 30;

/** A single generated grumble. Field-for-field identical to the legacy `Grumble` type. */
export type Grumble = {
  id: string;
  text: string;
  tone: Tone;
  createdAt: string;
  favorite: boolean;
};

/** User preferences. Field-for-field identical to the legacy `Preferences` type. */
export type Preferences = {
  tone: Tone;
  autoplay: boolean;
  reducedMotion: boolean;
};

/** Default preferences applied to a first-time visitor. */
export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
  tone: 'dry',
  autoplay: false,
  reducedMotion: false,
});

/** Narrows an unknown value to a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Type guard narrowing an arbitrary value to a known {@link Tone}. */
export function isTone(value: unknown): value is Tone {
  return typeof value === 'string' && (TONES as readonly string[]).includes(value);
}

/**
 * Validates an untrusted value as a {@link Grumble}.
 *
 * @returns The grumble, or `null` when any field is missing or the wrong type.
 */
export function parseGrumble(value: unknown): Grumble | null {
  if (!isRecord(value)) return null;

  const { id, text, tone, createdAt, favorite } = value;

  if (typeof id !== 'string' || id.length === 0) return null;
  if (typeof text !== 'string' || text.length === 0) return null;
  if (!isTone(tone)) return null;
  if (typeof createdAt !== 'string') return null;
  if (typeof favorite !== 'boolean') return null;

  return { id, text, tone, createdAt, favorite };
}

/**
 * Validates an untrusted value as {@link Preferences}, filling in defaults per field
 * so a partially-corrupt payload degrades gracefully instead of being discarded.
 */
export function parsePreferences(value: unknown): Preferences {
  if (!isRecord(value)) return { ...DEFAULT_PREFERENCES };

  return {
    tone: isTone(value['tone']) ? value['tone'] : DEFAULT_PREFERENCES.tone,
    autoplay:
      typeof value['autoplay'] === 'boolean' ? value['autoplay'] : DEFAULT_PREFERENCES.autoplay,
    reducedMotion:
      typeof value['reducedMotion'] === 'boolean'
        ? value['reducedMotion']
        : DEFAULT_PREFERENCES.reducedMotion,
  };
}
