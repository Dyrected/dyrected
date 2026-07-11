# Review Packet — `features/admin` docs batch

**Scope:** All nine `*.mdx` files in `apps/docs/content/new-docs/features/admin/` were empty stubs (frontmatter only) and were written from scratch. They are **review-ready, not final**. This packet is the human verification gate.

**Method:** Structurally informed by the closest live Payload admin docs page (structure only, no wording reuse), grounded in Dyrected's real behavior verified against `packages/*` source and the old `apps/docs/content/docs/admin/*` docs. Three source-gathering/verification passes were run before drafting; every code-behavior claim below traces to a file.

**Voice:** Followed `apps/docs/DOCS_PHILOSOPHY.md` and `AGENTS.md` docs-voice rules — mental model first, config shape, then option-by-option; no old `/docs/...` links (new-docs only).

---

## Headline: four pages document divergences or gaps, not happy paths

The biggest review risk in this batch is that **four topics do not match Payload's feature set**, and the drafts deliberately say so instead of inventing behavior. These need SME confirmation most:

| Page | Status vs. Payload | What the draft claims |
|---|---|---|
| `document-locking` | **Feature absent in Dyrected** | No locking; last-write-wins; only guard is the browser unsaved-changes prompt. Recommends versions/workflows/access-control instead. |
| `react-hooks` | **Different, smaller hook set** | Only `useDyrected` / `useLivePreview` / `useDyPath` from `@dyrected/react` (frontend). `@dyrected/admin` exposes **no** public hooks; admin customization uses **props**. |
| `metadata` | **Declared but not wired** | `admin.meta.titleSuffix` and `admin.branding.favicon` exist in types but don't affect the tab title/favicon. Draft says so and defers. |
| `custom-admin-panel-location` | **`basename` is a no-op** | Location = where you put the page file (file-based routing); `AdminUI` uses `HashRouter` and never reads `basename`. |

---

## Doc-vs-code conflicts (drafts follow code; existing docs disagree)

Per the workflow's "prefer package code for behavior, note the conflict" rule, these drafts contradict currently-published old docs. **Please confirm the code reading before these ship**, since they reverse existing guidance:

1. **`basename` has no effect — RESOLVED (removed).** `AdminUIProps.basename` was declared with JSDoc claiming "Used by BrowserRouter" but `AdminUI` never read it (router is `HashRouter`, `index.tsx:208`). Traced the full flow: every wrapper (`@dyrected/next` → `@dyrected/react` `DyrectedAdmin` → `<AdminUI {...props}/>`, Vue, Nuxt) and `renderAdminUI` forwarded it, but nothing consumed it. It was also scaffolded into every new project by the CLI. **Per the user's decision, `basename` was removed** from:
   - `packages/admin/src/index.tsx` (`AdminUIProps`) + fixed the inaccurate `BrowserRouter` section comment.
   - `packages/vue/src/components/DyrectedAdmin.vue` (prop + `renderAdminUI` pass-through).
   - `packages/nuxt/src/runtime/components/DyrectedAdmin.vue` (prop + forwarded `:basename`).
   - `packages/cli/src/utils/writers.ts` (Vue + Nuxt scaffold templates).
   - Verified: no `basename` remains in `packages/*/src`; `@dyrected/admin` and `@dyrected/cli` typecheck clean.
   - **Breaking-change note for release:** removing the public `AdminUIProps.basename` is a breaking type change. Any user project still passing `basename` will fail typecheck (harmless at runtime; it was already ignored). Call this out in the changelog / version bump. Previously-scaffolded projects should delete the `basename` line — the `custom-admin-panel-location` page now tells readers exactly that.
   - **Old `/docs/...` pages** (`docs/admin/overview.mdx`, `configuration.mdx`, `docs/integrations/*`) still show `<DyrectedAdmin basename="/admin" />`. Out of scope for this batch, but they should be scrubbed if those pages are kept.

2. **`meta.titleSuffix` / `branding.favicon` were not wired — RESOLVED (implemented).** Types existed but nothing set `document.title` / favicon, and `admin-shell.tsx` read a non-existent `branding.titleSuffix`. Per the maintainer's request, this is now implemented:
   - New `packages/admin/src/components/document-meta.tsx` (`<DocumentMeta />`), mounted inside the router in `AdminRoutes` (`index.tsx`). It sets `document.title` to `"<page label> <meta.titleSuffix>"` (default suffix `- Dyrected`), updating on every route change; page label resolves from collection/global labels in `schemas` (Dashboard / Posts / New Post / Edit Post / global label). It also applies `branding.favicon` to the page favicon.
   - Embedded-safety: `DocumentMeta` restores the original `document.title` and favicon when the admin unmounts, so an embedded admin doesn't leave its title/icon on the surrounding app.
   - `admin-shell.tsx` sidebar suffix now reads the canonical `meta.titleSuffix` (was the dead `branding.titleSuffix`).
   - The `metadata.mdx` page was re-published (un-`__`) and rewritten to document the now-working behavior.

---

## Per-file notes

### `overview.mdx` — configuration/conceptual hub
- **Payload equivalent:** `payloadcms.com/docs/admin/overview` (reference-heavy). Dyrected's version is intentionally more conceptual + acts as the hub linking the eight sibling pages, because Dyrected's admin is schema-derived rather than config-file-driven.
- **Sources:** old `docs/admin/overview.mdx`, `configuration.mdx`; `packages/admin/src/index.tsx` (AdminUI/renderAdminUI/HashRouter).
- **Verify:** the built-in screen descriptions (dashboard "needs attention", list search on `useAsTitle`, media page) are lifted from the old overview doc — confirm they still match the shipping UI.

### `preview.mdx` — conceptual → config
- **Payload equivalent:** `payloadcms.com/docs/admin/preview`.
- **Sources:** `packages/core/src/types/schema-config.ts:320-333` (`previewUrl`, `previewMode`), `packages/admin/src/lib/preview-url.ts`, list-page/edit-page usage; old `configuration.mdx:172-213`.
- **High-confidence.** Key claim to confirm: **one `previewUrl` drives both** the list "View" link and the edit-page live pane (verified in `list-page.tsx:536-563` and `edit-page.tsx:371-379`). Jexl-vs-function + Cloud Sync caveat taken verbatim from existing docs' intent.

### `customizing-css.mdx` — conceptual → reference
- **Payload equivalent:** `payloadcms.com/docs/admin/customizing-css` (Payload uses SCSS; Dyrected uses CSS custom properties — structure borrowed, not mechanism).
- **Sources:** `packages/core/src/types/admin.ts:37-56` (branding), `packages/admin/src/components/layout/branding-provider.tsx` (HSL injection on `.dy-admin-ui`), old `configuration.mdx:727-909`.
- **High-confidence.** Note: **no SCSS, no `custom.css` path** — stated explicitly to pre-empt Payload expectations. Import path `@dyrected/admin/styles` from `packages/admin/package.json`.

### `preferences.mdx` — reference-led + worked example
- **Payload equivalent:** `payloadcms.com/docs/admin/preferences`.
- **Sources:** old `docs/admin/view-preferences.mdx` (this new page is the canonical replacement), `packages/admin/src/hooks/use-preferences.ts`, REST routes in `packages/core/src/router.ts`.
- **Deviation from Payload worth confirming:** Payload's page ends with `usePreferences` "in your own components." Dyrected's `usePreferences` is **internal to `@dyrected/admin`, not a public export**, so the draft uses the **SDK** (`getPreference`/`setPreference`/`deletePreference`) as the public programmatic path instead. Confirm the SDK methods + REST shapes still match `view-preferences.mdx`.
- **Verify:** the fallback wording "first few non-hidden fields" — old doc says "first three." Left generic on purpose; confirm the exact number if you want it stated.

### `custom-admin-panel-location.mdx` — scenario/config
- **Payload equivalent:** `payloadcms.com/docs/admin/admin-panel-location`.
- See conflict #1 above. **Open question:** does `@dyrected/next`'s `DyrectedAdmin` honor `basename` even though `AdminUI` ignores it? If yes, the Callout warning is too strong and should be softened.

### `document-locking.mdx` — honest gap page
- **Payload equivalent:** `payloadcms.com/docs/admin/locked-documents` — structure not mirrored because the feature is absent.
- **Sources:** exhaustive negative search across `packages/core`, `packages/admin`, `packages/react` (no `lockWhenEditing`/`lockDuration`/`takeover`/optimistic-lock/version-conflict handling). Unsaved-changes browser prompt is the only guard (`edit-page.tsx`).
- **Decision needed from human:**
  - (a) Keep this as an honest "no locking today" page, **or**
  - (b) remove `document-locking` from `meta.json` until a feature exists, **or**
  - (c) treat as a feature request.
  - **Verify:** the "last-write-wins, no merge, no save-time conflict prompt" claim — confirm there is no ETag/version-check on write in the collection update path.

### `accessibility.mdx` — posture/policy page
- **Payload equivalent:** `payloadcms.com/docs/admin/accessibility` (a short posture statement; Payload claims WCAG 2.2 AA in progress).
- **Sources:** incidental a11y only — Radix primitives + `focus-visible` + ARIA on comboboxes/errors/icon-buttons (`packages/admin/src/components/**`). No a11y config, no focus-trap hook, no audit.
- **Decision needed from human:** Dyrected currently makes **no formal conformance claim**. The draft explicitly does NOT assert a WCAG level (unlike Payload). Confirm this is the desired public posture, or supply the real commitment if one exists. This is the single most important SME sign-off on this page.

### `metadata.mdx` — gap page
- See conflict #2 above. **Decision needed:** ship the honest "not wired yet" page, or hold the page until the feature is implemented. The draft currently tells readers **not** to rely on the options.

---

## Recommended JSDoc / generator / implementation changes

1. **`meta.titleSuffix` JSDoc — DONE (now accurate).** The suffix is wired to the browser `<title>` via `document-meta.tsx`, so the type comment is now truthful. Regenerate `@dyrected/knowledge` so the reference reflects the working behavior.
2. **`branding.favicon` JSDoc — DONE (now accurate).** Favicon is applied by `document-meta.tsx`. Same regenerate note.
3. **`AdminUIProps.basename` — DONE (removed).** Removed from `packages/admin/src/index.tsx`, the Vue + Nuxt wrappers, and the CLI writers; section comment corrected to HashRouter. See conflict #1 for the breaking-change release note.
4. **`branding.titleSuffix` vs `meta.titleSuffix` — DONE (reconciled).** `admin-shell.tsx` now reads `meta.titleSuffix`; the stale `branding.titleSuffix` read and the local `AdminBranding`/inline interfaces were removed in favor of core's `AdminConfig`.
5. **New `branding.accentColor` — regenerate knowledge reference.** A second brand colour (`accentColor` → `--intelligence`) was added to `AdminConfig.branding` with JSDoc; `@dyrected/knowledge/generated` should be regenerated to include it.

---

## Open factual questions — all resolved in round 2

All five were verified in code or decided by the maintainer; none remain open.

1. ~~Does `@dyrected/next` `DyrectedAdmin` honor `basename`?~~ **Resolved:** nothing consumed it; `basename` removed from the public API, wrappers, and CLI.
2. ~~Accessibility posture?~~ **Decided:** claim the accessibility inherited from the Radix UI / shadcn primitive layer. `accessibility.mdx` rewritten as a confident, specific claim (keyboard nav, ARIA semantics, focus management via Radix + WAI-ARIA APG). No formal third-party audit is claimed; none is asserted as needed.
3. ~~Ship `document-locking` / `metadata` as gap pages?~~ **Decided:** unpublished by renaming to `__document-locking.mdx` / `__metadata.mdx` and updating `meta.json` entries to the `__` prefix (matching the repo's existing `__i18n` / `__localization` convention). Inbound links from `overview.mdx` and `customizing-css.mdx` were removed; the unwired `favicon` line was dropped from the CSS branding example.
4. ~~List-column fallback — "first three" vs generic?~~ **Verified:** `list-page.tsx:176-184` — first three of `schema.fields` after excluding `password`, `admin.hidden`, and `row`/`join` layout fields. `preferences.mdx` updated to state exactly this.
5. ~~SDK/REST preference methods match?~~ **Verified in code:** `packages/sdk/src/index.ts:257-282` (`getPreference`/`setPreference`/`deletePreference`, `scope?: "personal" | "global"`) and `packages/core/src/router.ts:341-397` (`GET/PUT/DELETE /api/preferences/:key`, `requireAuth`, global scope via `__global_preferences`, `403` for non-admin global). Matches `preferences.mdx`.

## Round-4 additions (knowledge regen + new bulk action)

- **`@dyrected/knowledge` regenerated** (`node scripts/generate.mjs`): `generated/references.json` + `src/generated/references.ts` now include `branding.accentColor` and the corrected `titleSuffix`/`favicon` JSDoc.
- **New bulk action — Export Selected** (`packages/admin/src/pages/collections/list-page.tsx`): the CSV export was refactored into a shared `exportDocsToCsv(docs, suffix)` helper (full-collection output unchanged), and a `handleExportSelected` + "Export Selected" button was added to the selection bulk-actions bar. It exports the selected rows (resolved from the loaded page data, same source as bulk-delete) to `{slug}-export-selected.csv`. Docs updated in `list-view.mdx` and `csv-import-export.mdx`.
- **Verification:** admin package typechecks clean. The Export Selected flow was **not** driven end-to-end in a running admin (needs a live backend) — spot-check in the UI before release: select rows → Export Selected → confirm the file contains exactly those rows with the same columns as a full export.

## Round-2 additions (Vue / Nuxt / Next hooks)

`react-hooks.mdx` was broadened (and retitled "React Hooks & Vue Composables") to cover the multi-framework surface, all verified:

- **React** (`@dyrected/react/src/index.ts`): `useDyrected`, `useLivePreview`, `useDyPath` + `DyrectedProvider`/`DyPathProvider` + `DyrectedImage`/`Media`/`Icon`/`RichText`/`Blocks`.
- **Next**: uses the `@dyrected/react` hooks directly; documented as client-side (`"use client"`), no separate Next hook package.
- **Vue** (`@dyrected/vue/src/index.ts` + composable signatures): `useDyrectedClient`/`useDyrected`(data)/`useDyrectedCollection`/`useDyrectedGlobal`, `useLivePreview`, `useDyPath`, `useDyrectedAuth(collection, options)`.
- **Nuxt** (`packages/nuxt/src/module.ts:84-137`): composables are **auto-imported** (`addImports`) and components **auto-registered** (`addComponent`) — documented as such.
- **Admin customization uses props, not hooks** — restated for both React and Vue.

---

## What was verified by evidence vs. what still needs a human

- **Verified against source:** preview config surface, CSS/branding tokens, preferences cascade + API (round 2), list-column fallback = first three (round 2), absence of document locking, the React hooks + Vue composables + Nuxt auto-imports (round 2), admin-uses-props, `basename` no-op (removed), `titleSuffix`/`favicon` not wired (pages unpublished), accessibility inherited from Radix (round 2).
- **Still needs human/SME:** the two JSDoc/generator fixes below remain optional engineering follow-ups (`meta.titleSuffix`, `branding.favicon`, `branding.titleSuffix` mismatch — items 1, 2, 4 in the section above); and confirmation that UI descriptions carried from the old overview doc still match the shipping admin. No blocking factual questions remain.
