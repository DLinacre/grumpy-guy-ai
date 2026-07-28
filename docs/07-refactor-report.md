# Refactor & Modernization Report

Baseline: `593b815` · Target stack: TypeScript + React 19 + Tailwind v4 + clean modular architecture.

## Results

| Metric | Before | After |
| --- | --- | --- |
| Initial JS+CSS (gzip) | 127.39 kB | **69.71 kB** (−45.3%) |
| Initial JS+CSS (raw) | 441.16 kB | **220.36 kB** (−50.1%) |
| Entry chunks | 1 monolith (437 kB) | entry 18.6 kB + react 192 kB + async supabase/auth |
| Tests | 3 | **123** |
| Coverage | not measured | **83.7%** overall, 92.7% on the Worker |
| `npm run lint` | **crashed** (no config) | passes, 0 warnings |
| Type-checked scope | `src` only | `src` + `functions` + `vite.config.ts` |
| Visual diff vs. baseline | — | **0 pixels** (desktop 1280px & mobile 390px) |

## Verification

- `npm run verify` (typecheck → lint → test) passes from a clean `npm ci`.
- Rendered the pre- and post-refactor builds side by side in headless Chromium and
  compared ~90 computed style properties plus element geometry: **no differences**.
- Full-page screenshot diff at 2× DPR: **0 differing pixels** on desktop and mobile.
- Interaction parity checked end-to-end (tone select → generate → favourite → history →
  clear → auth dialog) with **no page errors** in either build.

## Behavioural contract

Every legacy import path still resolves and keeps its original signature. `src/lib/api.ts`,
`src/lib/storage.ts`, `src/lib/config.ts`, `src/types`, `src/App.tsx`,
`src/components/Settings.tsx` and `src/components/AuthPanel.tsx` are now thin re-export
shims over the new modules. The three original tests in `src/lib/api.test.ts` were kept
verbatim and still pass.

**One intentional signature change:** `src/lib/supabase.ts` previously exported an eagerly
constructed `supabase` client. It now exports `getSupabaseClient()`, which returns a promise.
This was required to code-split the 216 kB SDK out of the entry chunk — the single largest
win in the table above. No other module's public shape changed.

## What was fixed

### Crashes & data loss
- **Corrupt `localStorage` white-screened the app.** `loadLocal` cast `JSON.parse(...)` with
  `as LocalState`; a payload like `{"history":null}` made `initial.history[0]` throw during
  render. Now every field is validated and repaired field-by-field.
- **No error boundary** — any render throw blanked the page. Added one with a retry.
- **`localStorage` writes were unguarded**; Safari private mode and quota errors threw inside
  an effect on every state change. All access now goes through a probing, non-throwing wrapper.
- **`speechSynthesis` was used without feature detection** (`ReferenceError` on unsupported
  browsers) and was never cancelled on unmount.
- **Brand link pointed at `/`**, which 404s under the GitHub Pages sub-path. Now uses
  `import.meta.env.BASE_URL`.

### Leaks & races
- In-flight requests are now cancelled with an `AbortController` on unmount instead of calling
  `setState` on a dead component.
- Overlapping requests are sequenced by request id, so a slow earlier response can no longer
  overwrite a newer one.
- `setLoading(false)` is guaranteed on the failure path — the button could previously stick on
  "Grumbling…" forever.
- The auth subscription and `getUser()` promise are both unmount-guarded.

### Backend hardening
- CORS middleware was being **re-allocated on every request**; now built once, with support for
  a comma-separated allow-list.
- Added timeouts to all three upstream calls (auth 5 s, OpenAI 20 s, persistence 5 s) — a hung
  dependency previously pinned the Worker open.
- Added fixed-window **rate limiting** (20/min/IP) to an endpoint that spends an OpenAI key.
- Added a request body size guard before parsing.
- Persistence failures no longer turn a successful, already-paid-for generation into a 500.
- The response now returns the **persisted row id** rather than an unrelated throwaway UUID.

### Type safety
- Enabled `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `verbatimModuleSyntax`.
- Added `tsconfig.worker.json`: the Cloudflare Worker is now type-checked for the first time,
  which immediately surfaced an implicit `any`.
- Removed non-null assertions and `as` casts on env vars and API responses in favour of
  validation.

### Performance
- **Dropped `@tanstack/react-query`** — a provider was mounted but no query or mutation was ever
  issued. Pure dead weight.
- **Code-split `@supabase/supabase-js`** (216 kB) behind a dynamic import. On the live demo no
  `VITE_SUPABASE_*` variables are set, so this SDK was being shipped to every visitor and could
  never be used.
- **Removed Zod from the browser bundle** (~52 kB) by replacing two small schemas with
  hand-written type guards. Zod is retained in the Worker, where size is irrelevant.
- Split the React runtime into its own cacheable chunk, and lazy-loaded the auth dialog.
- Replaced the render-blocking Google Fonts `@import` with `preconnect` + `<link>`.

## Notes for the maintainer

- **Tailwind v4 Preflight caused four real visual regressions** that automated comparison caught:
  `h1`/`h2` dropped from weight 700 → 400, checkbox margins were zeroed (changing their height),
  paragraph margins were removed, and `leading-normal` in v4 means `1.5`, not the CSS keyword
  `normal`. All are corrected in `src/app/styles.css` with comments explaining why.
- `color-scheme: dark` is deliberately **not** set: it repaints native checkboxes from white to
  dark grey, which differs from the original design. Noted inline so it isn't "helpfully" re-added.
- The Worker rate limiter is per-isolate and in-memory. That is enough to blunt casual abuse, but
  a Durable Object or KV counter is the correct next step for strict global limits.
- `src/shared/config/env.ts` has low branch coverage because its failure paths depend on build-time
  `import.meta.env` values; those branches are best exercised in an E2E environment matrix.
