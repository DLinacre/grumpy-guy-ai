import type { Grumble, Preferences } from '../types';
const KEY = 'grumpy-guy-ai';
const defaults: Preferences = { tone: 'dry', autoplay: false, reducedMotion: false };
type LocalState = { history: Grumble[]; preferences: Preferences };
export function loadLocal(): LocalState { try { return JSON.parse(localStorage.getItem(KEY) ?? '') as LocalState; } catch { return { history: [], preferences: defaults }; } }
export function saveLocal(state: LocalState) { localStorage.setItem(KEY, JSON.stringify(state)); }
export { defaults };
