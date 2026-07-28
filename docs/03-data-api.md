# Data Model & Interface Specification

## ER model

```text
auth.users 1 ── 1 profiles
auth.users 1 ── 1 user_preferences
auth.users 1 ── * grumbles
```

The executable SQL is [`../db/001_initial.sql`](../db/001_initial.sql). `profiles.id`, `user_preferences.user_id`, and `grumbles.user_id` are UUID foreign keys to Supabase-managed `auth.users`. A `grumble` has content (1–1000 chars), tone enum, favorite flag, and creation timestamp. `grumbles.user_id` is nullable only to allow the Worker’s API response model to represent private generation; anonymous results are intentionally not stored in the database.

## HTTP API

### `POST /grumble`
**Authentication:** optional `Authorization: Bearer <Supabase access token>`. Valid users receive durable generation logging; anonymous requests receive the result only.

Request:
```json
{"tone":"dry","prompt":"I keep postponing my landing page"}
```
`tone` is `dry | brutal | supportive`; `prompt` is optional, trimmed, max 500 chars.

Success `200`:
```json
{"id":"uuid","text":"The landing page cannot disappoint visitors until it exists.","tone":"dry","createdAt":"2026-07-28T12:00:00.000Z","favorite":false}
```
Errors: `400` malformed/invalid payload; `404` unmatched route; `502` LLM failure. Error envelope: `{"error":"human-readable stable category"}`. Never return model/provider internals.

## Client state
- **Ephemeral UI:** prompt text, loading status, auth modal, selected entry.
- **Local durable:** `{history: Grumble[≤30], preferences}` in namespaced localStorage. Writes follow every mutation.
- **Server durable (authenticated):** profile/preferences/grumble records. Server sync/read query is the next vertical slice; it must use `user_id=auth.uid()` RLS, pagination by `(created_at,id)`, and optimistic favorite toggles.

## Component hierarchy
```text
App
├─ Header / identity actions
├─ Hero + Composer
├─ Grumble Stage (face, result, speak/favorite actions)
├─ History list
├─ Settings (tone, speech, motion, clearing)
└─ AuthPanel (conditional modal)
```
