# System Architecture, Boundaries & Folder Tree

## Runtime design
`Browser → CDN-hosted Vite/React SPA → Cloudflare Worker /grumble → OpenAI-compatible model API`. The Worker verifies a Supabase bearer token when present and uses a server-only service role to insert generated entries. `Browser ↔ Supabase Auth/PostgREST` handles session/auth and future user-owned reads/settings under RLS. This is JAMstack: static frontend deploys independently; the small edge API is the dynamic island.

```
grumpy-guy-ai/
├── src/                    # React presentation and client application layer
│   ├── components/          # AuthPanel, Settings: reusable visual modules
│   ├── lib/                 # config, Supabase adapter, API client, local persistence
│   ├── types/               # domain contracts shared within UI
│   ├── App.tsx              # page composition/state orchestration
│   └── styles.css
├── functions/api/grumble.ts # edge trust boundary; validates, calls model, persists
├── db/001_initial.sql       # schema, indexes, RLS, provisioning trigger
├── docs/                    # engineering decision records/deliverables
├── .env.example             # public configuration shape, never real secrets
├── wrangler.toml            # Worker deployment config
└── package.json             # pinned tool/runtime dependencies
```

## Module boundaries
- **Components** receive typed props and do not call providers directly.
- **lib/api** owns fetch headers, failure semantics and API mapping; **lib/supabase** is the only browser auth SDK adapter.
- **Worker** is the sole holder/use site for LLM credential and service-role access. Validate all external input with Zod before business logic.
- **Database** is source of truth for signed-in records; localStorage is an explicitly disposable private-mode cache.

## Deployment
Deploy `npm run build` output to Cloudflare Pages, Netlify, or Vercel CDN; deploy Worker separately with `wrangler deploy`; configure `VITE_API_BASE_URL` to the Worker origin and restrictive `ALLOWED_ORIGIN`. Use distinct Supabase projects/API secrets per preview, staging, and production.
