# Fields Follow-up — Frontend Rendering Components

Status: `ready-for-sme-review`

Trigger: reader question — should each field page document the framework render components (e.g. the Lucide icon component), or should that live elsewhere? Decision: document once in a canonical page; field pages carry short pointers.

## Bug fixed (introduced in sub-batch 2)
`rich-text.mdx` claimed richText is rendered "with the framework's `RichText` component." **No such component exists** in any package (verified: `packages/{react,vue,next,nuxt}/src` export no `RichText`; the `RichText` in the page-builder guide is a user-authored block). Rewrote the sentence to describe rendering the Tiptap/ProseMirror JSON yourself. No invented API remains.

## New page: `managing-data/displaying-content.mdx`
Canonical, cross-framework reference for the render components. Placed under **managing-data** (sibling to `sdk-api`/`rest-api` — fetch your content, then display it), deliberately **not** under `features/rich-text` (rich-text JSON conversion — a different topic), `features/custom-components` (admin customization), or `features/live-preview` (preview hooks — linked, not duplicated).

Covers, grounded in verified exports:
| Component | Purpose | Source |
| --- | --- | --- |
| `DyrectedImage` | renders an upload value as `<img>` (Next: `next/image`) | react/vue/next; Nuxt: not auto-registered (use `<DyrectedMedia>`) |
| `DyrectedMedia` | type-aware image/video/embed/download by `mimeType` | react/vue/next; Nuxt auto-import |
| `DyrectedIcon` | resolves an `icon` field's Lucide name; `fallback` prop | react/vue/nuxt; **Next: import from `@dyrected/react`** |
| `Blocks` (`<DyrectedBlocks>`) | maps `blockType`→component; `path` default `"body"` | react/vue/next; Nuxt alias |

Source of truth: `packages/react/src/index.ts` + component files (`DyrectedIcon.tsx`, `Blocks.tsx`, `DyrectedImage.tsx`, `DyrectedMedia.tsx`), `packages/next/src/index.ts` (re-export layering; no `DyrectedIcon`), `packages/vue/src/index.ts`, `packages/nuxt/src/module.ts` (auto-import registrations: DyrectedMedia/DyrectedAdmin/DyrectedBlocks/DyrectedIcon only).

## Field-page pointers added (distinctive fields only)
- `icon.mdx` → `DyrectedIcon`
- `blocks.mdx` → `Blocks`
- `upload.mdx` → `DyrectedImage`/`DyrectedMedia`

Each is a one-line link to the new page — no per-field duplication of the 4-framework API. `text`/`number`/etc. get nothing (obvious output). `rich-text`/`url` get nothing (no component).

## Verification
- `generate:check` clean; `knowledge test` 35/35.
- Every `/new-docs` link in the new page resolves to a REAL page (no stubs).
- Component names, props, and per-framework import paths verified against package source (not the earlier agent summary alone) — including the `DyrectedImage`-not-auto-imported-in-Nuxt correction and the Next `DyrectedIcon` caveat.

## Update — gaps fixed in the packages (all builds/tests green)

The earlier gaps were implemented, not just documented:

1. **RichText is HTML, not JSON — corrected everywhere.** The admin editor stores `editor.getHTML()` (a string). Earlier docs (both mine and the old `reference/fields.mdx`) wrongly said Tiptap/ProseMirror JSON. Fixed the field page + description; also changed the core type `RichTextField` value from `Record<string, unknown>` → `string` (`schema-core.ts`) so a typed `richText` field is usable with the new component. Regenerated; `define-field.test.ts` updated.
2. **New `DyrectedRichText` component** in `@dyrected/react` (`components/DyrectedRichText.tsx`) and `@dyrected/vue` (`components/DyrectedRichText.vue`); re-exported by `@dyrected/next`; auto-imported in Nuxt (`addComponent` → `@dyrected/vue` export). Renders the HTML string (`dangerouslySetInnerHTML` / `v-html`), with an in-code trust/sanitize note.
3. **`DyrectedIcon` now re-exported by `@dyrected/next`** (`export { DyrectedIcon, DyrectedRichText } from "@dyrected/react"` + types). Next users no longer import it from `@dyrected/react`.
4. **`DyrectedImage` now registered in Nuxt** (`addComponent`), and **Nuxt renders images via `<NuxtImg>`** — both the Nuxt `DyrectedImage.vue` and the image branch of `DyrectedMedia.vue` were rewritten to use `<NuxtImg>`. Added `@nuxt/image` as a dependency and `installModule("@nuxt/image")` in the module setup (setup is now `async`), so `<NuxtImg>` is always available.

Verification: `@dyrected/{react,vue,next,nuxt,sdk,core}` all build; new exports confirmed in built `dist`; `@dyrected/vue` + `@dyrected/core` tests pass; `generate:check` clean; `knowledge test` 35/35. Docs updated: `displaying-content/overview.mdx` (rich-text section, table + Nuxt/NuxtImg note, removed the obsolete Next-icon caveat) and `rich-text.mdx` (HTML + `DyrectedRichText` pointer). Field-page pointers updated to the reorganized `.../displaying-content/overview` URL.

## Remaining notes
- **Placement:** the page now lives at `managing-data/displaying-content/overview.mdx` (folder form, user-reorganized). Confirm this is the intended home.
- **`@nuxt/image` is now a hard dependency of `@dyrected/nuxt`** and is auto-installed into consumers. Remote CMS image domains may need allowlisting in the app's `image` config for full optimization; `<NuxtImg>` still renders otherwise. Confirm this is acceptable.
- **`RichTextField` value type change** (`Record<string, unknown>` → `string`) is a behavior-accurate correction but could affect any consumer that assumed an object; flagged like the `UrlField` change.
