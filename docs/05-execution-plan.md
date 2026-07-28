# Implementation Execution Plan

## Phase 1 — Core foundation (days 1–3)
1. Create Supabase dev/staging/prod projects; run the migration; set Auth redirect URLs and email templates.
2. Provision Cloudflare Worker/Pages projects and scoped secrets; point staging SPA API variable to staging Worker.
3. Establish CI quality gates, preview URLs, error monitoring, CSP/security headers, and privacy copy.
4. Validate the current static UI, private-mode storage, responsive layout, and accessibility baseline.

**Exit:** static app builds, secrets are absent from bundle, DB RLS tests pass.

## Phase 2 — Feature implementation (days 4–8)
1. Deploy `/grumble`, add rate limiting/WAF and moderation policy; smoke test model output and failover behavior.
2. Complete authenticated data sync: load paginated server history/preferences, merge local data after consent, persist favorites/settings.
3. Add user data export/delete screen and database retention job; instrument privacy-safe funnel events.
4. Write unit/component/API/E2E coverage and test magic-link flow against a dedicated test inbox/project.

**Exit:** a signed-in user can create, retrieve, favorite, update preferences, and delete their own data with no cross-user access.

## Phase 3 — Polish & deployment (days 9–10)
1. Run usability sessions with 5 target users; tune voice boundaries based on regenerate/favorite signal.
2. Resolve accessibility audit findings; test Safari/iOS speech fallback, slow network, no-JS error page, mobile devices.
3. Load test Worker/rate limits, set spend/availability alerts, review threat model, then deploy production with rollback procedure.
4. Monitor daily after launch; prioritise activation, safe output quality, and reliability over new features.

**Release checklist:** migrations applied; redirect/CORS origins exact; secrets set; production provider budget cap set; support/privacy URLs live; Sentry/alerts verified; rollback version tagged.
