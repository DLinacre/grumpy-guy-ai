# Phase 1 — Audit & Analysis

Baseline commit: `593b815`. Measured on Node 20.20.2 / npm 10.8.2.

## Baseline metrics

| Signal | Result |
| --- | --- |
| `npm run build` | passes — `dist/assets/index-DN-VM-XT.js` **437.16 kB** (125.80 kB gzip), 1 chunk |
| `npm test` | 3 tests pass (all in `src/lib/api.test.ts`) |
| `npm run lint` | **FAILS** — `ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file` |
| Type-check coverage | `src` only. `functions/` is in **no** tsconfig `include` |
| Component tests | none (no DOM environment configured) |

## Dependency map

```
main.tsx ──> QueryClientProvider (@tanstack/react-query)   [DEAD: no useQuery/useMutation anywhere]
   └─> App.tsx  (god component: state, effects, layout, speech, auth, history)
        ├─> lib/api.ts ──> lib/config.ts
        │                └─> lib/supabase.ts ──> @supabase/supabase-js  [EAGER, 8.5 MB on disk]
        ├─> lib/storage.ts
        ├─> components/AuthPanel.tsx ──> lib/supabase.ts
        └─> components/Settings.tsx
functions/api/grumble.ts  (Hono worker, untyped by build, untested)
```

No circular dependencies detected. Side-effects at module scope: `lib/supabase.ts` calls
`createClient()` on import; `main.tsx` calls `new QueryClient()` inside the `render()` argument.

## Defects found

### Correctness / crash risks

1. **`loadLocal()` returns unvalidated data.** `JSON.parse(localStorage.getItem(KEY) ?? '')` is cast
   `as LocalState` with no schema check. Any hand-edited, truncated, or version-skewed payload
   (e.g. `{"history":null}`) flows straight into `useState`, and `initial.history[0]` then throws
   `TypeError: Cannot read properties of null` → **white screen with no recovery**.
2. **No error boundary.** Any render throw unmounts the whole tree to a blank page.
3. **`localStorage` unguarded.** Safari private mode and quota-exceeded make `setItem` throw; the
   `saveLocal` effect has no `try/catch` → unhandled exception on every state change.
4. **`speechSynthesis` used without feature detection** → `ReferenceError` on browsers/webviews
   lacking the Web Speech API.
5. **Brand link `<a href="/">` is wrong under the deployed base path** (`/grumpy-guy-ai/`); clicking
   the logo on the live demo 404s. Must honour `import.meta.env.BASE_URL`.

### Memory leaks / lifecycle

6. **In-flight request outlives the component.** `generate()` has no `AbortController`; on unmount
   the resolved promise still calls `setCurrent`/`setHistory`.
7. **No `try/finally` around `setLoading`.** If `requestGrumble` ever rejects, the button stays
   permanently disabled at "Grumbling…".
8. **Concurrent-request race.** Rapid Enter presses run overlapping requests; the *slowest* response
   wins and overwrites the newest.
9. **`supabase.auth.getUser()` promise is not cancellation-guarded** → `setEmail` after unmount.
10. **Speech is never cancelled on unmount** — the utterance keeps talking after teardown.
11. **`new QueryClient()` constructed inline in the render argument** — anti-pattern; a new cache on
    every evaluation.

### Backend (Cloudflare Worker)

12. **CORS middleware is re-allocated on every single request** (`cors()` called inside the handler).
13. **No timeouts** on the Supabase `/auth/v1/user` or OpenAI calls → a hung upstream hangs the Worker
    until the platform kills it.
14. **Unprotected persistence.** The Supabase insert is `await`ed bare; if it rejects, an already
    successful generation turns into a 500.
15. **No rate limiting** on an endpoint that spends `OPENAI_API_KEY` — direct cost/abuse exposure.
16. **ID contract mismatch.** The response returns a fresh `crypto.randomUUID()` rather than the
    persisted row id, so the client id can never be used to reference the DB record.
17. **No request-body size guard**; `c.req.json()` parses arbitrary payloads before validation.

### Type safety

18. `config.ts` uses `as string | undefined` casts instead of validating `import.meta.env`.
19. Non-null assertions `config.supabaseUrl!`, `document.getElementById('root')!`.
20. `tsconfig.app.json` omits `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
    `noFallthroughCasesInSwitch`, `noImplicitOverride`.
21. Worker `Env`/`Variables` types exist but are never verified — `functions/` is never compiled.
22. `fallback()` hardcodes `Math.random() * 3` against a 3-element array — silently biased/undefined
    the moment a line is added. Combined with missing `noUncheckedIndexedAccess`, returns `undefined`.

### Testing

23. `api.test.ts` claims to test "offline fallback" but performs a **real `fetch`**. It passes only
    because a relative URL throws under Node — environment-dependent and flaky, not a controlled test.
24. Zero coverage of storage, preferences, reducers, components, or the Worker.

### Performance / bundle

25. **`@tanstack/react-query` is a dead dependency** — a provider is mounted but no query is ever
    issued. Pure payload.
26. **`@supabase/supabase-js` is eagerly imported** into the entry chunk. The GitHub Pages workflow
    sets no `VITE_SUPABASE_*` variables, so on the live demo this large client is **shipped and can
    never be used**.
27. Single 437 kB monolithic chunk; no code splitting, no manual chunk strategy.
28. Google Fonts pulled via a CSS `@import`, which blocks the CSS parser and serialises the
    stylesheet→font round trip instead of preconnecting.

### Architecture / style

29. `App.tsx` is a god component — data loading, persistence, auth, speech, history and full page
    layout in one function, written as minified single-line statements with comma-chained `useState`.
30. Formatting is deliberately compressed (1-space indent, multiple statements per line), defeating
    review and blame.
31. Target stack requires **Tailwind v4**; the project ships a hand-rolled 2-line `styles.css`.

## Phase 2–4 plan

- **Contracts:** every existing public entry point (`src/lib/api.ts` `requestGrumble`,
  `src/lib/storage.ts` `loadLocal`/`saveLocal`/`defaults`, `src/lib/config.ts` `config`/
  `supabaseConfigured`, `src/lib/supabase.ts` `supabase`, `src/types`) is preserved as a re-export
  shim so no consumer or existing test changes.
- **Migrate** to feature-sliced modules under `src/features/*`, `src/shared/*`, `src/app/*`.
- **Adopt Tailwind v4** via `@tailwindcss/vite` with the existing palette lifted into `@theme`,
  reproducing the current design exactly.
- **Verify** with typecheck + lint + expanded Vitest suite (jsdom + Testing Library) and a bundle
  comparison against the 437.16 kB baseline.
