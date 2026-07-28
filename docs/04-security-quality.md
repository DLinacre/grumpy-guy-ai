# Security, Auth & Quality Standards

## Security baseline
- **Secrets:** `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and Worker environment values reside in Cloudflare encrypted secrets only. Vite values are public by definition; no `VITE_*` secret is permitted. Rotate provider keys on suspected exposure.
- **Authentication/authorisation:** Supabase magic links establish short-lived JWT sessions. Worker verifies supplied JWT against Supabase Auth before associating data. Postgres RLS is enabled on every public data table; policies compare `auth.uid()` to ownership. Service role bypass is Worker-only.
- **Validation:** Zod validates API body shape, enum and sizes. Database check constraints repeat critical boundaries. Return generic provider failures. Escape React-rendered content by default; no `dangerouslySetInnerHTML`.
- **Abuse controls before public launch:** add Cloudflare WAF/bot rules and per-IP/per-user rate limits (e.g. 20 generations/10 min), model budget caps, request IDs, and an abuse report route. Restrict CORS to known frontend origins, HTTPS only, and CSP headers at CDN.
- **Privacy:** Prompt content is sent to the selected LLM processor. Declare this in a privacy notice; minimize logs; set retention limits; offer account deletion/export. Do not send raw prompts to analytics.

## Quality gates
1. **Unit (Vitest):** schema edge cases, fallback selection, local state limits, preference mutations.
2. **Component (React Testing Library):** keyboard generation, modal status/error, favorite toggle, ARIA/live behavior and reduced-motion class.
3. **API (Miniflare/Wrangler):** reject bad payloads, reject forged JWT association, provider error normalization, CORS allow/deny cases.
4. **E2E (Playwright):** anonymous core path, Supabase magic-link test fixture, responsive 360px check, authenticated record persists.
5. **CI:** `npm ci && npm run lint && npm run test && npm run build`; dependency audit; preview deployment; Lighthouse accessibility/performance budget.

Observe Worker error rate, model latency/cost, auth completion rate, generation success, and client fallback rate. Alert on 5xx spikes or unexpected spend.
