# Grumpy GuyAI — Product Requirements Document

**Product:** single-page web companion for hackers and hustlers who want a quick, funny push without productivity theatre. **MVP outcome:** a visitor can generate a safe, context-aware grumble in under five seconds, save it locally, and optionally sign in to persist it across devices.

## Personas

| Persona | Need | Success signal |
|---|---|---|
| The shipping hacker | A fast nudge while stuck or procrastinating | Generates and acts on a prompt without leaving the page |
| The hustler | A memorable ritual to start focused work | Returns daily and favorites resonant lines |
| Privacy-conscious visitor | Try product before surrendering email | Private/local mode is useful with no account |

## Core journeys
1. **First visit:** lands on dark, characterful dashboard → selects a tone or supplies optional context → receives one grumble → may listen, favorite, or generate another. Local history retains last 30.
2. **Account conversion:** selects Sign in → submits email → magic-link callback restores Supabase session → future generations are durably recorded.
3. **Personalisation/data control:** changes tone, read-aloud, or reduced motion; clears browser history. Signed-in deletion/export is a post-MVP account page but database supports deletion.

## MVP requirements
- Responsive single-page experience; keyboard Enter submits; screen-reader updates use `aria-live`; reduced-motion preference is honored.
- Three explicit voices: dry, brutal (still non-abusive), supportive. Prompt context limited to 500 characters.
- Passwordless email authentication via Supabase. Unauthenticated generation is permitted, but only authenticated generations are persisted server-side.
- Generation service returns one safe sentence; client has an offline fallback to preserve usability.
- Local browser history displays the newest six of a maximum 30 entries. Favorite and Web Speech read-aloud are client controls.

## Non-functional acceptance criteria
- Static app is cacheable at edge; API p95 target under 3 seconds excluding model incidents.
- No provider secret enters browser bundles. All user-owned DB rows protected by RLS.
- Mobile supports 360px wide screens; WCAG 2.2 AA contrast and focus visibility target.

## Deliberately out of MVP
Social feed, voice cloning, billing, teams, long chat threads, analytics dashboards, and autonomous outbound notifications.

## Measures and guardrails
Activation = first successful generation; retention = a generation on a later day; quality = favorite rate and regenerate rate. Instrument only anonymous, consent-aware product events (no raw prompt content by default). Enforce content moderation upstream as model/provider policy evolves.
