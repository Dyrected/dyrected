# @dyrected/vue

## 2.5.52

### Patch Changes

- ea1d99d: Block icons & variants, a cleaner admin loading state, dark-mode text fix, and OpenAPI/Swagger fixes.

  **Block schema (`@dyrected/core`)**
  - `Block` now supports `icon` (a Lucide `AdminIconName`) and `description` (a one-line summary), shown on block cards and in the block library.
  - New `Block.variants` (`BlockVariant[]`) — presentation variants over a shared field set. The chosen variant is stored on each block row under the reserved `variant` key and passed to the render component as a `variant` prop. Switching variant preserves the author's content.

  **Admin (`@dyrected/admin`)**
  - Redesigned block cards to match the visual editor: drag handle, icon tile, title, and a description/variant subtitle, with an accent selected state; duplicate/delete reveal on hover.
  - Added an in-block **variant switcher** (drill-in and inline modes) that writes the `variant` key and updates the live preview immediately; new blocks default to the first variant, and older rows backfill a variant on load.
  - Click-to-edit / error-summary navigation now switches to the tab that owns the target block, so drilling into a field on a non-active tab actually mounts its sub-form (previously showed only the breadcrumb).
  - **Dark-mode fix:** the admin root now applies a base `color`/`background` from the theme tokens, so raw inputs, ghost/outline buttons, and plain text are legible in dark mode instead of falling back to black.
  - **Cleaner bootstrap:** a single branded `AdminSplash` replaces the mismatched "Loading Dashboard…" / "Authenticating…" screens across initial mount and auth resolution (embedded and standalone), so cold load reads as one continuous step.
  - The setup screen now links to the backend's interactive **API reference (Swagger)** at `/api/docs`.
  - **URL-driven nested navigation:** the active form tab (`?tab=`) and the block drill-in trail (`?block=`) now live in the URL. Drilling into a block pushes a history entry, so the browser/mobile back button steps back out of a block to its list; tab switches replace (no history spam); deep links and refreshes restore the drilled-in view. (Embedded `HashRouter` mode; the standalone iframe's `MemoryRouter` keeps the in-app breadcrumb.)
  - **Redesigned tabs:** compact underline tabs pinned at the top, horizontally scrollable on mobile, replacing the pill tab bar and the mobile accordion — one consistent pattern across breakpoints.
  - Mobile: the edit page can toggle between the form and the live preview (single-pane) via an action-rail switch.

  **Render packages (`@dyrected/react`, `@dyrected/vue`)**
  - `BlocksItem` now types the optional `variant` field; it already flows to block components via prop spreading.

  **Backend (`@dyrected/core`)**
  - Swagger UI now resolves its OpenAPI spec **relative to the docs page**, so `/api/docs` works when the app is mounted under a prefix (e.g. a Nuxt `apiBase: "/dyrected"`) instead of 404-ing on an absolute `/api/openapi.json`.

- 227449f: Nested block editor, live-preview click-to-edit, and a redesigned edit page.

  **Admin**
  - Redesigned the collection edit page: live preview on the left, form on the right, with a vertical action rail (Save, New, Preview, Workflow, View, Reset, Info) replacing the horizontal header icon cluster.
  - Nested block/array/object editing via drill-in navigation with breadcrumbs, backed by a new `NestedEditorContext` with stable-id path tracking (survives reorder/delete) and a shared `resolveContainerPath` utility.
  - Live-preview click-to-edit: clicking an annotated element in the preview iframe drills into the owning block and focuses the exact field. The global error summary now also drills in before scrolling.
  - Drill-in (nested form) is only used when live-preview mode is on; otherwise blocks render inline as a flat form. `array`/`object` drill-in is opt-in via `admin.drillIn`.
  - The nav sidebar auto-collapses while live preview is open and restores afterwards.
  - Document metadata moved into an Info popover on the rail; the workflow panel is an independent rail toggle; fields without an `admin.tab` are grouped into a tab named after the collection's singular label; the block library modal is now reliably scrollable.
  - Added a scalar `usePreference` hook.

  **Site packages (`@dyrected/vue`, `@dyrected/react`, `@dyrected/nuxt`, `@dyrected/next`)**
  - New `Blocks` component plus `useDyPath` / `provideDyPath` (`DyPathProvider` in React, `DyPathScope` in Vue) for low-effort `data-dy-path` annotation — authors pass only a field name and the ancestor supplies the base path.
  - `useLivePreview` now supports edit mode: on `dyrected-enter-edit-mode` it highlights and captures clicks on `[data-dy-path]` elements (via document-level event delegation) and reports them to the admin.
  - Nuxt module auto-imports `useDyPath`/`provideDyPath` and registers the `DyrectedBlocks` component.
  - `@dyrected/next` re-exports `Blocks`, `DyPathProvider`, and `useDyPath` so Next.js apps import everything from one package.

- Updated dependencies [ea1d99d]
- Updated dependencies [227449f]
- Updated dependencies [ea1d99d]
  - @dyrected/admin@2.5.52
  - @dyrected/sdk@2.5.52

## 2.5.51

### Patch Changes

- @dyrected/admin@2.5.51
- @dyrected/sdk@2.5.51

## 2.5.50

### Patch Changes

- Updated dependencies [08b7839]
  - @dyrected/admin@2.5.50
  - @dyrected/sdk@2.5.50

## 2.5.49

### Patch Changes

- Updated dependencies [b23b116]
  - @dyrected/admin@2.5.49
  - @dyrected/sdk@2.5.49

## 2.5.48

### Patch Changes

- Updated dependencies [38bfacb]
- Updated dependencies [7cdfb01]
  - @dyrected/admin@2.5.48
  - @dyrected/sdk@2.5.48

## 2.5.47

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.47
  - @dyrected/sdk@2.5.47

## 2.5.46

### Patch Changes

- Updated dependencies [11c8ba0]
  - @dyrected/admin@2.5.46
  - @dyrected/sdk@2.5.46

## 2.5.45

### Patch Changes

- @dyrected/sdk@2.5.45
- @dyrected/admin@2.5.45

## 2.5.44

### Patch Changes

- @dyrected/sdk@2.5.44
- @dyrected/admin@2.5.44

## 2.5.43

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.43
  - @dyrected/sdk@2.5.43

## 2.5.42

### Patch Changes

- @dyrected/sdk@2.5.42
- @dyrected/admin@2.5.42

## 2.5.41

### Patch Changes

- Updated dependencies [8f9d96d]
  - @dyrected/admin@2.5.41
  - @dyrected/sdk@2.5.41

## 2.5.40

### Patch Changes

- Updated dependencies [d5aa016]
  - @dyrected/sdk@2.5.40
  - @dyrected/admin@2.5.40

## 2.5.39

### Patch Changes

- Updated dependencies [b5c8fea]
  - @dyrected/admin@2.5.39
  - @dyrected/sdk@2.5.39

## 2.5.38

### Patch Changes

- Updated dependencies [60e0617]
  - @dyrected/admin@2.5.38
  - @dyrected/sdk@2.5.38

## 2.5.37

### Patch Changes

- Updated dependencies [0b13e96]
  - @dyrected/admin@2.5.37
  - @dyrected/sdk@2.5.37

## 2.5.36

### Patch Changes

- Updated dependencies [eb77809]
  - @dyrected/admin@2.5.36
  - @dyrected/sdk@2.5.36

## 2.5.35

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.35
  - @dyrected/sdk@2.5.35

## 2.5.34

### Patch Changes

- Updated dependencies [46b11d6]
  - @dyrected/admin@2.5.34
  - @dyrected/sdk@2.5.34

## 2.5.33

### Patch Changes

- @dyrected/admin@2.5.33
- @dyrected/sdk@2.5.33

## 2.5.32

### Patch Changes

- Updated dependencies [9fcf1e2]
  - @dyrected/sdk@2.5.32
  - @dyrected/admin@2.5.32

## 2.5.31

### Patch Changes

- fa1ad68: feat: add workflow reference generation scripts, improve admin documentation, and implement dashboard testing utilities
- Updated dependencies [fa1ad68]
  - @dyrected/admin@2.5.31
  - @dyrected/sdk@2.5.31

## 2.5.30

### Patch Changes

- 1a2e552: ### ✨ Features & Refactors
  - **Admin UI Customization**: Implemented the Admin UI component slot injection system along with Vue bridging support, allowing developers to inject custom components natively into the dashboard and lists.
  - **Onboarding & Setup**: Replaced prompt generation with an external guided setup flow, and added a new email template service.
  - **UI Refresh**: Updated admin CSS variables and layout container styling for improved aesthetics.

  ### 📚 Documentation
  - **Structural Changes**: Migrated feature documentation into dedicated guides.
  - **Cloud Rebrand**: Updated app dashboard documentation and references to point to the new `cloud.dyrected.com` domain.
  - **General Polish**: Expanded and updated documentation across multiple files (including fixing the YAML parser bugs in the new markdown format).

- Updated dependencies [1a2e552]
  - @dyrected/admin@2.5.30
  - @dyrected/sdk@2.5.30

## 2.5.29

### Patch Changes

- Updated dependencies [cbc6dad]
  - @dyrected/admin@2.5.29
  - @dyrected/sdk@2.5.29

## 2.5.28

### Patch Changes

- Updated dependencies [fd36dfd]
  - @dyrected/admin@2.5.28
  - @dyrected/sdk@2.5.28

## 2.5.27

### Patch Changes

- 8c27ba9: refactor: unify React dependency resolution across packages and optimize Vite/Next configuration for dependency sharing
- Updated dependencies [8c27ba9]
  - @dyrected/admin@2.5.27
  - @dyrected/sdk@2.5.27

## 2.5.26

### Patch Changes

- 7db84cc: **UI/UX Improvement for Admin**
  1. Boolean field layout support
     Added a new `CheckboxField` and made boolean fields default to checkbox, with `admin.layout: "switch"` available when a switch UI is preferred.
  2. Array/object field renderer refactor
     Moved array and object rendering out of `form-field-renderer.tsx` into dedicated field renderer files. Array fields now use draggable expandable cards with duplicate/move/delete actions.
  3. Safer React state/effect patterns
     Improved preferences/list-column state updates to avoid unnecessary renders and reduce maximum update depth risk. Also updated `AGENTS.md` with React effect/state safety guidance.
  4. Persistent user preferences
     Added server-backed preferences through the core router and SDK, while keeping local storage sync. Data table column visibility can now persist per user/server instead of only locally.
  5. Media picker/library consistency and table columns
     Refined media picker and media library layouts for consistency, adjusted media cards/grids/dialogs, and updated collection list table defaults/config behavior.
  6. Responsive table/tooling polish
     Modernized the data table layout, improved mobile responsiveness across table toolbar, filters, pagination, page header, and list page. Also added toolbar action support.
  7. Filter builder apply workflow
     Changed filters to use a draft/apply model so the popup does not close unexpectedly while editing. Also updated build/dependency config.
  8. Collection filtering system
     Added configurable filterable fields, a UI filter builder, URL/query integration, SDK/query-builder changes, and backend `where` sanitization for safer server-side filtering.
  9. Boolean filter fix, document context, and docs/specs
     Fixed boolean where-clause casting, passed `documentId` through the form engine, and added/expanded a large set of docs and specs around hooks, depth, filters, media, custom actions, and future work.
  10. Overhaul admin dashboard
      overhaul admin dashboard with recent activity feed, schema validation alerts, and enhanced UI components

- Updated dependencies [7db84cc]
  - @dyrected/admin@2.5.26
  - @dyrected/sdk@2.5.26

## 2.5.25

### Patch Changes

- Updated dependencies [ed94c3a]
  - @dyrected/admin@2.5.25
  - @dyrected/sdk@2.5.25

## 2.5.24

### Patch Changes

- Updated dependencies [71348fb]
  - @dyrected/admin@2.5.24
  - @dyrected/sdk@2.5.24

## 2.5.23

### Patch Changes

- feat: add custom field component support, field-level error boundaries, and fix React instance mismatch in Vue bridge
- Updated dependencies
  - @dyrected/admin@2.5.23
  - @dyrected/sdk@2.5.23

## 2.5.22

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.22
  - @dyrected/sdk@2.5.22

## 2.5.21

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.21
  - @dyrected/sdk@2.5.21

## 2.5.20

### Patch Changes

- Updated dependencies [298a35b]
  - @dyrected/admin@2.5.20
  - @dyrected/sdk@2.5.20

## 2.5.19

### Patch Changes

- @dyrected/admin@2.5.19
- @dyrected/sdk@2.5.19

## 2.5.18

### Patch Changes

- Updated dependencies [09d6e92]
  - @dyrected/admin@2.5.18
  - @dyrected/sdk@2.5.18

## 2.5.17

### Patch Changes

- Updated dependencies [bd0d9a3]
  - @dyrected/admin@2.5.17
  - @dyrected/sdk@2.5.17

## 2.5.16

### Patch Changes

- Updated dependencies [414b005]
  - @dyrected/admin@2.5.16
  - @dyrected/sdk@2.5.16

## 2.5.15

### Patch Changes

- Updated dependencies [356a7a5]
  - @dyrected/admin@2.5.15
  - @dyrected/sdk@2.5.15

## 2.5.14

### Patch Changes

- Updated dependencies [959b5c5]
  - @dyrected/admin@2.5.14
  - @dyrected/sdk@2.5.14

## 2.5.13

### Patch Changes

- Updated dependencies [2961a9d]
  - @dyrected/admin@2.5.13
  - @dyrected/sdk@2.5.13

## 2.5.12

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.12
  - @dyrected/sdk@2.5.12

## 2.5.11

### Patch Changes

- Updated dependencies [ff1a756]
  - @dyrected/admin@2.5.11
  - @dyrected/sdk@2.5.11

## 2.5.10

### Patch Changes

- Updated dependencies [4a6881b]
  - @dyrected/admin@2.5.10
  - @dyrected/sdk@2.5.10

## 2.5.9

### Patch Changes

- Updated dependencies [a8fa0b7]
  - @dyrected/admin@2.5.9
  - @dyrected/sdk@2.5.9

## 2.5.8

### Patch Changes

- refactor: type MediaPicker preview function with Media interface
- Updated dependencies
  - @dyrected/admin@2.5.8
  - @dyrected/sdk@2.5.8

## 2.5.7

### Patch Changes

- 890c56a: - **URL Field Evolution**: Implemented a modern dual-mode URL Field component featuring a direct toggle between external links and a dynamic internal page/document selector (complete with direct database slug binding and custom label fields).
  - **Global Settings Configuration**: Added native Global Configuration support, with robust schema validation, configuration normalization, hydration mechanisms, and full type safety across standard field components.
  - **Form Engine & Block Builder Revamp**:
    - Re-architected the Block Builder with interactive, collapsible block layout items, custom drag-and-drop sort handlers, and automatic field-value summary crawling for collapsed block previews.
    - Replaced the simple dropdown block selector with a visual center-aligned **Block Library Dialog Modal** featuring soft-indicator layer graphics.
    - Standardized external save triggers (header Save button & `⌘S` shortcut) using native HTML5 `form` attributes to bind seamlessly with the Hook Form submit engine.
    - Enlarged block titles and integrated center-aligned dashed "Add Block" buttons directly under the block lists for optimized edit flow.
- Updated dependencies [890c56a]
  - @dyrected/admin@2.5.7
  - @dyrected/sdk@2.5.7

## 2.5.6

### Patch Changes

- 2f2999e: # Dyrected CMS 10 Bugs Completed Resolution

  We have successfully diagnosed, documented, implemented, built, and verified the fixes for all **10 critical bugs** listed in our known bugs checklist. The entire monorepo builds flawlessly and the test suite passes 100%.

  Here is a summary of the accomplishments and resolution details.

  ***

  ## 🛠️ Summary of Resolved Bugs

  ### 1. **Bug 1 (MySQL EADDRNOTAVAIL Socket Error)**
  - **Fix:** Handled and caught connection failures in `packages/db-mysql/src/index.ts`. If `EADDRNOTAVAIL` is detected on macOS loopback environments, we print a highly informative log advising the user to replace `localhost` with `127.0.0.1` in their `.env` file.
  - **Reference File:** [packages/db-mysql/src/index.ts](file:///Users/busola/Work/dyrected/packages/db-mysql/src/index.ts#L105-L117)

  ### 2. **Bug 2 (MySQL Database Auto-Creation)**
  - **Fix:** Enhanced the adapter to check if the database exists prior to initializing the connection pool. It temporarily establishes a connection to the server without selecting a database, runs `CREATE DATABASE IF NOT EXISTS \`dbname\``, and gracefully closes the handshake.
  - **Reference File:** [packages/db-mysql/src/index.ts](file:///Users/busola/Work/dyrected/packages/db-mysql/src/index.ts#L79-L93)

  ### 3. **Bug 3 (PostgreSQL Parameter Mismatch)**
  - **Fix:** Refactored the `find()` queries inside the pg adapter to construct plain SQL query strings, passing them directly to `this.sql.unsafe(queryStr, params)`. This prevents nested tagged template literals from stripping parameterized `$N` value bindings.
  - **Reference File:** [packages/db-postgres/src/index.ts](file:///Users/busola/Work/dyrected/packages/db-postgres/src/index.ts#L65-L119)

  ### 4. **Bug 4 (Nuxt TS Configuration Import)**
  - **Fix:** Integrated dynamic loading of `"jiti"` (bundled natively with Nuxt/Nitro) inside `packages/nuxt/src/runtime/server/plugins/db.ts` to cleanly transpile and import `dyrected.config.ts` without raw ES Module "Unknown file extension" exceptions.
  - **Reference File:** [packages/nuxt/src/runtime/server/plugins/db.ts](file:///Users/busola/Work/dyrected/packages/nuxt/src/runtime/server/plugins/db.ts#L11-L40)

  ### 5. **Bug 5 (Nitro Runtime Import Resolution)**
  - **Fix:** Standardized module imports in the Nuxt context by replacing the problematic `"nitro/runtime"` import with `"nitropack/runtime"`.
  - **Reference File:** [packages/nuxt/src/runtime/server/plugins/db.ts](file:///Users/busola/Work/dyrected/packages/nuxt/src/runtime/server/plugins/db.ts#L2-L4)

  ### 6. **Bug 6 (Collapsible & Sortable Arrays)**
  - **Fix:** Redesigned array field lists into collapsible Cards utilizing draggable handle hooks, supporting both drag-and-drop reordering (`@dnd-kit/sortable`) and dynamic child attribute watch previews (displays key text values as a header preview).
  - **Reference File:** [packages/admin/src/components/forms/form-field-renderer.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/form-field-renderer.tsx#L182-L330)

  ### 7. **Bug 7 (Path Duplication)**
  - **Fix:** Prevented redundant folder prefixes (e.g. `/dyrected/dyrected/`) from being appended to logo media URLs.
  - **Reference File:** [packages/admin/src/lib/utils.ts](file:///Users/busola/Work/dyrected/packages/admin/src/lib/utils.ts#L14-L24)

  ### 8. **Bug 8 (Media Previews)**
  - **Fix:** Added a direct URL/path string fallback rendering in the admin dashboard `MediaPicker` to instantly load images when an empty relationship payload is returned.
  - **Reference File:** [packages/admin/src/components/forms/fields/media-picker.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/fields/media-picker.tsx#L45-L68)

  ### 9. **Bug 9 (Media Infinite Scroll)**
  - **Fix:** Upgraded the media library lists and selector modal dialog to use React Query's `useInfiniteQuery`, implementing an `IntersectionObserver` scroll listener to paginate assets.
  - **Reference Files:**
    - [packages/admin/src/pages/media/media-page.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/pages/media/media-page.tsx)
    - [packages/admin/src/components/media/media-library-dialog.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/components/media/media-library-dialog.tsx)

  ### 10. **Bug 10 (Slugs vs Labels / Dynamic Add Buttons)**
  - **Fix:** Swapped out hardcoded string actions with singularized schema collection labels (e.g. "Add Post", "Add Testimonial") and ensured singularized headers show everywhere.
  - **Reference Files:**
    - [packages/admin/src/components/forms/form-field-renderer.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/form-field-renderer.tsx)
    - [packages/admin/src/pages/collections/list-page.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/pages/collections/list-page.tsx)
    - [packages/admin/src/pages/media/media-page.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/pages/media/media-page.tsx)
    - [packages/admin/src/components/media/media-library-dialog.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/components/media/media-library-dialog.tsx)

  ***

  ## 🧪 Verification & Build Results

  ### Workspace Builds

  We executed a complete Turbo build for the entire monorepo containing 18 packages:

  ```bash
  pnpm build
  ```

  - **Result:** **`turbo build` passed with exit code 0!** All packages compiled perfectly, generating type definitions (`d.ts` / `d.cts`) and production-ready modules.

  ### Unit & Integration Test Suite

  We executed the Vitest package tests:

  ```bash
  pnpm test
  ```

  - **Result:** **32/32 tests passed successfully!**

- Updated dependencies [2f2999e]
  - @dyrected/admin@2.5.6
  - @dyrected/sdk@2.5.6

## 2.5.5

### Patch Changes

- Updated the CLI DX
- Updated dependencies
  - @dyrected/admin@2.5.3
  - @dyrected/sdk@2.4.6

## 2.5.4

### Patch Changes

- improve Nuxt server request URL handling
- Updated dependencies
  - @dyrected/admin@2.5.2
  - @dyrected/sdk@2.4.5

## 2.5.3

### Patch Changes

- fix react dependency issues
- Updated dependencies
  - @dyrected/sdk@2.4.4

## 2.5.2

### Patch Changes

- Updated dependencies
  - @dyrected/sdk@2.4.3

## 2.5.1

### Patch Changes

- Updated dependencies [cdc953e]
  - @dyrected/admin@2.5.1

## 2.5.0

### Minor Changes

- This release introduces a suite of new features and architectural improvements:
  - **Admin UI Enhancements**:
    - Clickable primary column in collection lists for faster navigation.
    - New **Tabs Layout** and **Row Layout** for better form organization.
    - Integrated **Icon Field** with a specialized picker.
    - Support for **Join Fields** to represent many-to-one relationships directly in forms.
    - **Inline Page Editing** mode via the Live Preview pane.
  - **Architecture**:
    - Extraction of Vue-specific logic into the new `@dyrected/vue` package.
    - Synchronized field types and configuration across the SDK and Admin.
  - **Integrations**:
    - Improved Nuxt and Next.js support with updated composables and components.
  - **Bug Fixes**:
    - Resolved build failures related to shadowing type declarations in `@dyrected/core`.
    - Fixed `@dyrected/vue` package exports for modern bundler compatibility.

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.0
  - @dyrected/sdk@2.4.2
