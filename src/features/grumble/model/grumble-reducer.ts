import { HISTORY_LIMIT, type Grumble, type Preferences } from '../../../shared/domain/grumble';

/**
 * Typed state contract for the grumble session.
 *
 * The legacy component held seven independent `useState` calls chained together with
 * commas on a single line. Related transitions ("a request finished": set current,
 * prepend history, clear the prompt, stop loading) had to be kept in sync by hand
 * across multiple setters. Folding them into one reducer makes each transition atomic
 * and unit-testable in isolation from React.
 */
export type GrumbleState = {
  readonly history: readonly Grumble[];
  readonly current: Grumble | null;
  readonly preferences: Preferences;
  readonly prompt: string;
  readonly loading: boolean;
  /** Populated when a request fails in a way worth surfacing to the user. */
  readonly error: string | null;
};

export type GrumbleAction =
  | { type: 'prompt/changed'; prompt: string }
  | { type: 'request/started' }
  | { type: 'request/succeeded'; grumble: Grumble }
  | { type: 'request/failed'; message: string }
  | { type: 'grumble/selected'; id: string }
  | { type: 'grumble/favoriteToggled'; id: string }
  | { type: 'preferences/changed'; preferences: Preferences }
  | { type: 'history/cleared' };

export function createInitialState(
  history: readonly Grumble[],
  preferences: Preferences,
): GrumbleState {
  return {
    history,
    current: history[0] ?? null,
    preferences,
    prompt: '',
    loading: false,
    error: null,
  };
}

export function grumbleReducer(state: GrumbleState, action: GrumbleAction): GrumbleState {
  switch (action.type) {
    case 'prompt/changed':
      return { ...state, prompt: action.prompt };

    case 'request/started':
      return { ...state, loading: true, error: null };

    case 'request/succeeded':
      return {
        ...state,
        loading: false,
        error: null,
        current: action.grumble,
        history: [action.grumble, ...state.history].slice(0, HISTORY_LIMIT),
        prompt: '',
      };

    case 'request/failed':
      // `loading` is always cleared here, so a rejection can never strand the
      // button in its permanently-disabled "Grumbling…" state.
      return { ...state, loading: false, error: action.message };

    case 'grumble/selected': {
      const selected = state.history.find((item) => item.id === action.id);
      return selected ? { ...state, current: selected } : state;
    }

    case 'grumble/favoriteToggled': {
      const history = state.history.map((item) =>
        item.id === action.id ? { ...item, favorite: !item.favorite } : item,
      );
      const current =
        state.current?.id === action.id
          ? { ...state.current, favorite: !state.current.favorite }
          : state.current;
      return { ...state, history, current };
    }

    case 'preferences/changed':
      return { ...state, preferences: action.preferences };

    case 'history/cleared':
      return { ...state, history: [], current: null };

    default: {
      // Exhaustiveness guard: adding an action without handling it fails the build.
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
