import type { Tone } from '../../../shared/domain/grumble';

/**
 * Offline/demo grumbles.
 *
 * The production Worker is always authoritative; these exist so the experience
 * degrades to something usable without a network or API key.
 */
const FALLBACK_LINES: Readonly<Record<Tone, readonly [string, ...string[]]>> = Object.freeze({
  dry: [
    'Another tab, another tiny betrayal.',
    'The plan is fine. Your calendar is the crime scene.',
    'Ambition is cute. Ship it.',
  ],
  brutal: [
    'You asked for momentum, then opened social media. Remarkable.',
    'The deadline is not impressed by your intentions.',
    'Less theatre. More commit messages.',
  ],
  supportive: [
    'You are allowed to do the next small thing badly. Do it.',
    'Progress has poor manners. It arrives one boring step at a time.',
    'Still here? Good. That counts.',
  ],
});

/**
 * Picks a fallback line for a tone.
 *
 * The legacy implementation indexed with a hardcoded `Math.floor(Math.random() * 3)`.
 * That silently biases (or returns `undefined`) the moment a line is added or removed.
 * Deriving the bound from `lines.length` keeps the distribution correct as the copy
 * changes, and the non-empty tuple type guarantees index `0` always exists.
 */
export function pickFallback(tone: Tone, random: () => number = Math.random): string {
  const lines = FALLBACK_LINES[tone];
  const index = Math.min(lines.length - 1, Math.floor(random() * lines.length));
  return lines[index] ?? lines[0];
}

export { FALLBACK_LINES };
