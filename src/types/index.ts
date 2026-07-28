/**
 * Legacy public type surface — preserved for backwards compatibility.
 *
 * The canonical definitions now live in `src/shared/domain/grumble.ts`, where they are
 * derived from Zod schemas. These re-exports mean existing `import type { Grumble } from
 * './types'` statements continue to resolve to exactly the same structural types.
 */
export type { Grumble, Preferences, Tone } from '../shared/domain/grumble';
export { TONES, isTone } from '../shared/domain/grumble';
