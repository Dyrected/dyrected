# Plan — Close the token-mode (server-side) live-preview gap

**Goal:** make `previewMode: "token"` a working, documented feature: a server-rendered/SSG frontend that can't receive `postMessage` can still show draft content in the live-preview pane, by redeeming a short-lived token during its server render.

**Principle (repo rule):** production-ready, not a patch. Reuse the existing token primitives; don't invent a parallel channel.

---

## How it will work (target flow)

1. Editor opens a document whose collection has `previewMode: "token"` and a `previewUrl`.
2. The admin pane mints a token from the current draft (`POST /api/preview-token`) and loads the iframe at `previewUrl` + `?dyPreview=<token>`.
3. The frontend page, **on the server**, reads `dyPreview` from the query, calls `GET /api/preview-data?token=`, and renders the draft as `initialData` instead of published data.
4. When the editor changes fields, the pane re-mints (debounced) and reloads the iframe — a server round-trip per refresh. This is refresh-based, not per-keystroke; that's the documented server-side tradeoff.

`postMessage` mode is unchanged and remains the default.

---

## Phase 1 — SDK: add the mint method

**File:** `packages/sdk/src/index.ts` (next to `getPreviewData`, ~L288)

- Add `createPreviewToken(input: { collectionSlug: string; documentId?: string; data: unknown }): Promise<{ token: string; expiresAt: string }>` → `POST /api/preview-token`.
- Uses the authenticated `request()` path (admin is logged in), so the auth header is attached.

## Phase 2 — Admin: implement the token branch

**Files:** `packages/admin/src/components/live-preview/LivePreviewPane.tsx`, `packages/admin/src/pages/collections/edit-page.tsx`

1. Thread `collectionSlug` and `documentId` into the pane. `edit-page.tsx` already has `slug` and `id` (`useParams`) and passes `mode` at L743 — add the two props through `PreviewPaneWithNav` → `LivePreviewPane`.
2. In `LivePreviewPane`, add a `mode === 'token'` effect:
   - On mount and on debounced `data` change (~800ms), call `useDyrected().client.createPreviewToken({ collectionSlug, documentId, data })`.
   - Build the iframe src by merging `?dyPreview=<token>` into `previewUrl` via the `URL` API (preserve existing query/hash).
   - Set the iframe `src` to the new URL (this reloads the frame — the server re-fetches the draft). Guard against redundant reloads when the token is unchanged.
   - Keep a cancelled-flag guard so a stale mint never overwrites a newer one (async-effect safety per AGENTS.md).
3. **Scope calls in token mode:** no `postMessage` data streaming, no enter/exit-edit-mode, no click-to-edit (there's no return channel from a server-only page). Skip those effects when `mode !== 'postMessage'`. The desktop/mobile/zoom/reload/open-in-tab toolbar still works.
4. Loading/expiry: show the existing pane chrome while the first token mints; on a mint failure, surface a small inline error (don't leave a blank frame). Re-mint also covers the 15-min expiry naturally because every edit re-mints.

## Phase 3 — Frontend: redeem the token on the server

**Files:** `packages/react/` (+ `@dyrected/next` re-export), `packages/vue/` (+ `@dyrected/nuxt`), docs.

The redemption happens in the page's server data fetch, so this is mostly a small ergonomic helper plus documentation — the SDK already has `getPreviewData`.

1. Add a tiny framework-agnostic helper (in `@dyrected/sdk` or `@dyrected/react`+`@dyrected/vue`):
   `getPreviewToken(search: string | URLSearchParams | Record<string,string|undefined>): string | null` — extracts `dyPreview`.
2. Document the pattern per framework:
   - **Next.js** (App Router): read `searchParams.dyPreview`; if present, `initialData = (await getDyrectedClient().getPreviewData(token)).data`, else the normal published fetch.
   - **Nuxt**: read `route.query.dyPreview`; same branch server-side.
3. The rest of the page is unchanged — the existing `useLivePreview({ initialData })` renders whatever it's given, so draft-from-server "just renders." `isLive` stays `false` (no postMessage), which is correct.

## Phase 4 — Security & config hardening

1. **JWT secret.** `PreviewController.getSecret()` falls back to `'dyrected-preview-secret-change-me'` ([preview.controller.ts:8](packages/core/src/controllers/preview.controller.ts#L8)). Document that self-hosters MUST set `DYRECTED_JWT_SECRET`; consider a startup warning when the default is in use.
2. **Token in URL.** It can leak via referer/logs; the 15-min expiry limits the blast radius. Document it, and recommend guarding the preview path (referer from the admin origin) for sites that care.
3. **Payload size (known limit).** The token embeds the full draft `data`, so very large documents produce very long URLs (browser/server URL-length limits). Ship v1 with the embed approach + a documented size caveat; note a future improvement: store the draft server-side keyed by a short id and put only the id in the token. Flag whether we want the store in this pass.

## Phase 5 — Reference example + tests

1. Add a token-mode reference to an example app — **`example-creator-next`** is the natural fit (RSC/SSG is where token mode earns its keep). One `pages`-style collection set to `previewMode: "token"`, plus the server-fetch branch from Phase 3.
2. Tests: unit-test `createPreviewToken`/`getPreviewData` round-trip and `getPreviewToken` extraction; a smoke test that the pane sets `?dyPreview=` on the iframe src in token mode.

## Phase 6 — Docs: re-publish server-side

1. Rename `__server-side.mdx` → `server-side.mdx`, rewrite as the real working flow (mint → URL → server redeem), with the refresh-based tradeoff, the "no click-to-edit in token mode" note, and the secret/size caveats.
2. `frontend.mdx`: upgrade the decision note from "not wired" to "client-side (`postMessage`) for live-as-you-type; server-side (`token`) for server-only/SSG frontends."
3. `admin/preview.mdx`: remove the "not wired yet" warn callout added earlier; make the `previewMode` table describe both working modes.
4. `meta.json`: add `server-side` back.
5. Changeset (patch, per the fixed-group constraint): `@dyrected/sdk`, `@dyrected/admin`, `@dyrected/react`, `@dyrected/vue`, `@dyrected/next`, `@dyrected/nuxt`, `dyrected`.

---

## Decisions I need from you

1. **Query param name** — `dyPreview` OK? (short, namespaced)
2. **Refresh cadence** — debounced re-mint + iframe reload (server-side, no live-typing) is inherent to token mode. Confirm that's the intended UX, not something you want to fight.
3. **Click-to-edit** — I'll leave it as a `postMessage`-only feature (token mode has no return channel). OK, or do you want token pages to *also* run the client hook to keep click-to-edit? (adds complexity; can be a follow-up.)
4. **Large-doc handling** — v1 embeds draft in the token (simple, has a URL-size ceiling) vs. building a server-side draft store now (robust, more work). My recommendation: ship embed + caveat, store as a fast-follow.
5. **Example app** — `example-creator-next` (Next/RSC) for the reference, or add it to `example-saas-nuxt` alongside the existing postMessage demo?

## Scope estimate
Phases 1–2 (SDK + admin wiring) are the core and are small, self-contained changes. Phase 3 is mostly docs + a ~10-line helper. Phase 4–6 are hardening, an example, and doc re-publish. No schema/DB changes; no breaking changes; all patch-level.
