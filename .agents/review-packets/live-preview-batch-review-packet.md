# Review Packet — `features/live-preview` docs batch

**Scope:** All four `*.mdx` files in `apps/docs/content/new-docs/features/live-preview/` were empty stubs (`overview`, `frontend`, `server-side`, `client-side`). This batch followed the `$api-doc-hitl` workflow: structure informed by the closest live Payload pages, grounded in Dyrected's real behavior verified against `packages/admin`, `packages/react`, `packages/vue`, `packages/nuxt`, and `packages/core`. **Review-ready, not final.**

**Method:** Two grounding passes — a Dyrected live-preview probe and a Payload structure extraction — plus direct reads of the source below.

---

## Headline: postMessage live preview is real; token/server-side mode is not wired

Dyrected has a genuine, end-to-end **client-side (`postMessage`)** live preview: an iframe pane in the admin, a two-way message protocol, click-to-edit, and consumer-side hooks for React and Vue, with a working example in `apps/example-saas-nuxt`. The second mode Payload calls "server-side" (Dyrected's `previewMode: "token"`) has config + backend plumbing but **no admin integration and no reference implementation** — it does nothing today.

### Confirmed real (with citations)
- **Admin pane** — `packages/admin/src/components/live-preview/LivePreviewPane.tsx`: iframe, desktop/mobile toggle, zoom (50/75/100%), edit-mode toggle (on by default), reload, open-in-tab. Only handles `mode === 'postMessage'`; the `'token'` branch is inert (`:22`).
- **Wiring** — `packages/admin/src/pages/collections/edit-page.tsx` resolves `previewUrl` via `packages/admin/src/lib/preview-url.ts` (shared with the list page's "View" link), shows the pane only when a URL resolves, and drills into nested blocks on `dyrected-element-clicked`.
- **Config** — `packages/core/src/types/schema-config.ts:326,333`: `previewUrl?: string | ((doc, {locale}) => string | null)` and `previewMode?: "postMessage" | "token"` (documented already in `features/admin/preview.mdx`).
- **React** — `packages/react/src/hooks/useLivePreview.ts` → `{ data, isLive }`; `useDyPath.ts` → `{ 'data-dy-path': string }`; `components/Blocks.tsx` (`<Blocks items components path>`) + `providers/DyPathProvider`. Re-exported by `@dyrected/next` (`packages/next/src/index.ts:23,28`).
- **Vue** — `packages/vue/src/composables/useLivePreview.ts` → `{ data: Ref, isLive: Ref }`; `useDyPath` + `provideDyPath`; `components/Blocks.ts` + `DyPathScope`. Nuxt (`packages/nuxt/src/module.ts:102`) registers `<DyrectedBlocks>` (exported as `Blocks`) and auto-imports the composables.
- **Protocol** (message types, both hooks): `dyrected-live-preview-ready`/`-ack`, `dyrected-live-preview` (data), `dyrected-enter-edit-mode`/`-exit-edit-mode`, `dyrected-element-clicked` `{ path }`.
- **Working example** — `apps/example-saas-nuxt/app/pages/[...slug].vue` uses `useLivePreview` + `<DyrectedBlocks>`.

### Confirmed NOT wired
- `previewMode: "token"` — server can mint/verify a JWT (`packages/core/src/controllers/preview.controller.ts`, routes at `router.ts:561-562`) and the SDK exposes `getPreviewData(token)` (`packages/sdk/src/index.ts:285`), but **the admin never mints a token, never appends `?token=`**, and nothing in the repo redeems one. No RSC-refresh ("RefreshRouteOnSave") equivalent exists either. So "server-side live preview" is absent in both Payload senses.

---

## Pages: 3 published, 1 unpublished

| Page | Verdict | Action |
|---|---|---|
| `overview` | REAL | Written — the feature, the admin pane, the postMessage protocol, click-to-edit, the two ingredients |
| `frontend` | REAL | Written — the overlay model (published on server, draft overlaid in browser), one-route pattern, the three pieces + import table, path decision |
| `client-side` | REAL | Written — `useLivePreview` API, per-framework code (Next/React/Nuxt/Vue), `useDyPath` + `<Blocks>`, origin security, troubleshooting |
| `server-side` | REAL (gap now closed) | Written — token mode implemented end to end (see below) |

**Update:** the token-mode gap was subsequently **closed** (see `token-preview-implementation-plan.md`). `server-side.mdx` is now published documenting a working flow: the admin mints a token and appends `?dyPreview=<token>`; the frontend redeems it server-side via `getPreviewData`. Nuxt reference lives in `example-saas-nuxt` (the `blog` collection is now `previewMode: "token"`). `meta.json` includes all four pages.

---

## Cross-page consistency changes (outside the batch folder)

`features/admin/preview.mdx` already forward-linked to these pages and presented `token` mode as functional. Adjusted to avoid contradiction:
- Forward-link list now points to `overview` / `frontend` / `client-side` (was `.../server-side`).
- Added a `warn` callout under the `previewMode` table: `token` mode is not wired into the admin yet.

**Deliberately did NOT link** the old tutorial at `/docs/guides/live-preview.mdx` — per the batch rule (only link `/new-docs/` pages). It remains a good, accurate source; the new pages were written to stand alone. Consider porting it into `/new-docs/` later.

---

## Review questions (need a human / SME)

1. **Server-side page fate.** I unpublished `server-side` because token mode is inert. Alternatives: (a) delete it entirely, (b) keep the `__` stub as-is (current), (c) publish it as an explicitly-flagged "advanced/manual" pattern showing raw `getPreviewData` usage. I chose (b). Confirm.
2. **`frontend` vs `client-side` split.** Payload uses `frontend` as a thin decision page and `client`/`server` as implementations. Since Dyrected has one real path, I made `frontend` the conceptual/model page and `client-side` the API reference. Is two pages right, or should they merge into one?
3. **`serverURL` semantics.** I state that setting `serverURL` both filters incoming messages by origin and targets outgoing messages at that origin (verified in the hooks). Confirm the phrasing "lock the exchange down" matches how you want to advise production users, given the default is `"*"`.
4. **Nuxt auto-imports.** I claim `useLivePreview`, `useDyPath`, and `<DyrectedBlocks>` are auto-imported in Nuxt (module registers the component; composables via the runtime dir). Please confirm `useDyPath` is genuinely auto-imported (the example relies on it without an import).
5. **`depth` guidance.** I tell readers to set `depth` on the data fetch, not the hook (the hook only takes `initialData`/`serverURL`). Confirm this is the intended guidance for relationship population in preview.

## Key source files
- `packages/admin/src/components/live-preview/LivePreviewPane.tsx`
- `packages/admin/src/pages/collections/edit-page.tsx`, `packages/admin/src/lib/preview-url.ts`
- `packages/react/src/hooks/useLivePreview.ts`, `useDyPath.ts`, `components/Blocks.tsx`
- `packages/vue/src/composables/useLivePreview.ts`, `useDyPath.ts`, `components/Blocks.ts`, `DyPathScope.ts`
- `packages/nuxt/src/module.ts`, `packages/next/src/index.ts`
- `packages/core/src/types/schema-config.ts:295-333`
- `apps/example-saas-nuxt/app/pages/[...slug].vue`
- Adjacent: `apps/docs/content/new-docs/features/admin/preview.mdx`
