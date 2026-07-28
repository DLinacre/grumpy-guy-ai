/**
 * Legacy API entry point — preserved for backwards compatibility.
 *
 * `requestGrumble(tone, prompt?)` keeps its exact signature and contract: it always
 * resolves with a valid `Grumble` and never rejects for network reasons. The optional
 * third `options` argument (abort signal) is additive and therefore non-breaking.
 */
export { requestGrumble } from '../features/grumble/api/grumble-client';
export type { RequestGrumbleOptions } from '../features/grumble/api/grumble-client';
