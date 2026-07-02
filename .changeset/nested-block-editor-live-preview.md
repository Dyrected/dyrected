---
"@dyrected/admin": patch
"@dyrected/vue": patch
"@dyrected/react": patch
"@dyrected/nuxt": patch
---

Nested block editor, live-preview click-to-edit, and a redesigned edit page.

**Admin**

- Redesigned the collection edit page: live preview on the left, form on the right, with a vertical action rail (Save, New, Preview, Workflow, View, Reset, Info) replacing the horizontal header icon cluster.
- Nested block/array/object editing via drill-in navigation with breadcrumbs, backed by a new `NestedEditorContext` with stable-id path tracking (survives reorder/delete) and a shared `resolveContainerPath` utility.
- Live-preview click-to-edit: clicking an annotated element in the preview iframe drills into the owning block and focuses the exact field. The global error summary now also drills in before scrolling.
- Drill-in (nested form) is only used when live-preview mode is on; otherwise blocks render inline as a flat form. `array`/`object` drill-in is opt-in via `admin.drillIn`.
- The nav sidebar auto-collapses while live preview is open and restores afterwards.
- Document metadata moved into an Info popover on the rail; the workflow panel is an independent rail toggle; fields without an `admin.tab` are grouped into a tab named after the collection's singular label; the block library modal is now reliably scrollable.
- Added a scalar `usePreference` hook.

**Site packages (`@dyrected/vue`, `@dyrected/react`, `@dyrected/nuxt`)**

- New `Blocks` component plus `useDyPath` / `provideDyPath` (`DyPathProvider` in React, `DyPathScope` in Vue) for low-effort `data-dy-path` annotation — authors pass only a field name and the ancestor supplies the base path.
- `useLivePreview` now supports edit mode: on `dyrected-enter-edit-mode` it highlights and captures clicks on `[data-dy-path]` elements (via document-level event delegation) and reports them to the admin.
- Nuxt module auto-imports `useDyPath`/`provideDyPath` and registers the `DyrectedBlocks` component.
