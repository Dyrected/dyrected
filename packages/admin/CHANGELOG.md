# @dyrected/admin

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

- ea1d99d: Upload MIME/size validation and add-media-from-URL.

  **Core (`@dyrected/core`)**
  - New `upload-validation` utility: `isMimeAllowed` (supports `*`, `type/*`, and exact `type/subtype` patterns, case-insensitive) and payload validation that returns a typed error with the correct HTTP status (`415 Unsupported Media Type` or `413 Payload Too Large`).
  - The media controller enforces a collection's `upload` config (`allowedMimeTypes`, `maxFileSize`) on upload and accepts external media references.

  **Admin (`@dyrected/admin`)**
  - Add media from a URL: `external-media` builder + `useAddMediaFromUrl` hook detect YouTube/Vimeo videos, direct image URLs, and generic files, and store them as reference-only media records (no file bytes). The media grid and preview components key off the resulting `mimeType` (`video/youtube`, `video/vimeo`, `image/external`, …) to render each asset correctly.
  - Media picker, media card, media library dialog, and media page updated to support external media and surface upload validation errors.

  **SDK (`@dyrected/sdk`)**
  - Support for external media references and upload validation feedback.

- Updated dependencies [ea1d99d]
- Updated dependencies [ea1d99d]
- Updated dependencies [ea1d99d]
  - @dyrected/core@2.5.52
  - @dyrected/knowledge@0.2.9
  - @dyrected/sdk@2.5.52

## 2.5.51

### Patch Changes

- @dyrected/core@2.5.51
- @dyrected/sdk@2.5.51

## 2.5.50

### Patch Changes

- 08b7839: Resolve preview domain dynamically using schemas siteUrl, prefix/strip url field domains using siteUrl origin, and update block builder library dialog with scrollable 3-column desktop layout.
- Updated dependencies [08b7839]
  - @dyrected/core@2.5.50
  - @dyrected/sdk@2.5.50

## 2.5.49

### Patch Changes

- b23b116: Add upgrade command, non-interactive init options, and unified combobox URL field redesign.
- Updated dependencies [03acdb6]
  - @dyrected/knowledge@0.2.7
  - @dyrected/core@2.5.49
  - @dyrected/sdk@2.5.49

## 2.5.48

### Patch Changes

- 38bfacb: Fix CSV importer: drag & drop, file validation, empty file rejection, invalid row handling, network failure retry, and full-page layout
  - Drag and drop now works on the upload zone (was advertised but never wired up) (CI-005)
  - Non-CSV files dropped or selected show a clear "Unsupported file type" error and stay on the upload screen (CI-005)
  - Empty CSV files (zero data rows) are rejected with an explicit message instead of advancing to a blank mapping step (CI-006)
  - At the preview step, if all rows are invalid the Start Import button is disabled and a blocking error is shown; if some rows are invalid an acknowledgement checkbox must be checked before import can proceed, preventing silent partial data creation (CI-029)
  - Rows that fail due to network or API errors during import are tracked separately from validation failures; a "Retry N Failed Rows" button appears on the complete screen so users can retry without re-uploading or re-mapping (CI-030)
  - CSV import now renders as a full-page layout instead of a constrained modal, giving the validation table sufficient room to display all columns and rows

- 7cdfb01: Improve cloud admin auth collection resolution and delegated membership handling
  - Prefer the `__admins` collection for admin auth when present, then fall back to the configured `adminAuth.collectionSlug`, then the first auth collection
  - Return the resolved admin auth collection slug in public admin auth config so the admin UI and server agree on the active auth collection
  - Pass a normalized hook request context to delegated provider membership handlers so cloud-backed user management hooks can safely read query params and request headers
  - Preserve multipart upload behavior in the SDK by letting fetch set the multipart boundary automatically

- Updated dependencies [676ba83]
- Updated dependencies [7cdfb01]
  - @dyrected/knowledge@0.2.5
  - @dyrected/core@2.5.48
  - @dyrected/sdk@2.5.48

## 2.5.47

### Patch Changes

- Normalize cloud-issued admin session token roles for client-side access checks.
  - @dyrected/core@2.5.47
  - @dyrected/sdk@2.5.47

## 2.5.46

### Patch Changes

- 11c8ba0: Add low-impact dark mode support to the admin UI with system, light, and dark theme preferences.
  - @dyrected/core@2.5.46
  - @dyrected/sdk@2.5.46

## 2.5.45

### Patch Changes

- Updated dependencies [e94ec78]
  - @dyrected/core@2.5.45
  - @dyrected/sdk@2.5.45

## 2.5.44

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.5.44
  - @dyrected/sdk@2.5.44

## 2.5.43

### Patch Changes

- feat: add support for external authentication provider exchange and update Node.js requirement to 22+
- Updated dependencies
  - @dyrected/core@2.5.43
  - @dyrected/sdk@2.5.43

## 2.5.42

### Patch Changes

- Updated dependencies [afa1ae0]
  - @dyrected/core@2.5.42
  - @dyrected/sdk@2.5.42

## 2.5.41

### Patch Changes

- 8f9d96d: feat(admin): fix admin panel type safety, lint warnings, and external auth flow integration

  Refactored the admin panel and core SDK interfaces to eliminate compiler errors and ESLint warnings (such as `any` usage, index signature mismatches, and regex escapes). This ensures full compatibility with the updated schema and SDK type definitions, allowing all 20 monorepo packages to build successfully.

  Detailed Changes:
  1. `@dyrected/admin` TypeScript & ESLint Fixes
     - components/media/media-library-dialog.tsx:
       - Replaced `any` in `MediaLibraryDialogProps` (`selectedValues`, `onSelect`, `onConfirm`) with proper typed interfaces (`string | Record<string, unknown>`).
       - Imported `Media` type from `@dyrected/sdk` and typed `selectedItem` state as `(Media & { id?: string }) | null` to resolve missing property compilation errors.
       - Cleaned up regex useless-escape warnings (`no-useless-escape`) in YouTube link detection pattern by removing backslashes on `&` and `?`.
       - Added type assertion to `client.collection(collection).upload(...)` returns and mapped list item elements in loop to define `mimeType?: string`.
       - Restored the original select-to-confirm highlight click logic in single-select mode.
     - pages/collections/edit-page.tsx:
       - Cast `client!.collection(slug!).findOne(id!)` return values to `Promise<Record<string, any> | null>` to resolve property accesses on `unknown`.
       - Replaced `schema.label` fallback checks with the new `schema.labels?.singular` / `schema.labels?.plural` structures.
       - Replaced generic `any` usage in collection schema iteration callbacks with `{ name?: string }` maps.
     - components/forms/field-renderer.tsx:
       - Cast `schema.admin` to resolve union-field layout property checking.
       - Renamed imported type `UrlField` to `UrlFieldSchema` to resolve naming collisions with `UrlFieldComponent`.
     - components/forms/fields/radio-field.tsx:
       - Correctly typed `RadioFieldProps` and cast the `RadioGroup` value to a string.
     - components/forms/fields/media-picker.tsx:
       - Added clean casting of file upload responses to `CachedMedia` type to satisfy the state updater.
  2. Auth, Core, and Router Integration
     - specs/external-admin-auth-door.md & specs/admin-auth.test.ts:
       - Outlined, specified, and integrated the OIDC/Cloud provider handoff, callback, and JIT provisioning authorization contract.
     - packages/core/src/types/admin-auth.ts & packages/core/src/types/documents.ts:
       - Defined schema shapes, request parameters, and controllers for JWT-scoped identity handoff.
     - packages/admin/src/providers/dyrected-context.ts:
       - Extracted provider states into a centralized context to decouple core workspace bindings.
  3. Documentation & Schema Sync
     - Updated MDX docs (`apps/docs/content/docs/*`) to reflect database, storage, and field-rendering layouts.
     - Synchronized knowledge base inventories (`packages/knowledge/generated/*`) and LLM mappings to index new API parameters.

- Updated dependencies [8f9d96d]
  - @dyrected/core@2.5.41
  - @dyrected/sdk@2.5.41

## 2.5.40

### Patch Changes

- Updated dependencies [d5aa016]
  - @dyrected/core@2.5.40
  - @dyrected/sdk@2.5.40

## 2.5.39

### Patch Changes

- b5c8fea: fix: improve CSV importer data handling and simplify UI components by removing unused pagination and refactoring select options.
  - @dyrected/core@2.5.39
  - @dyrected/sdk@2.5.39

## 2.5.38

### Patch Changes

- 60e0617: feat: implement CSV import component with column mapping, validation, and batch processing support
  - @dyrected/core@2.5.38
  - @dyrected/sdk@2.5.38

## 2.5.37

### Patch Changes

- 0b13e96: feat: add customizable field widths to collection edit layouts and unify list page view settings
  - Added customizable field widths (25%, 33%, 50%, 66%, 75%, 100%) to edit forms, enabling side-by-side field positioning.
  - Expanded the layout preferences API and SDK client to handle generic LayoutItem objects (`Array<{ name: string; width?: string }>`).
  - Consolidated the list view mode selector and column configure popovers into a unified "View Settings" panel.
  - Enabled column visibility toggles (checklists) directly inside the new unified view settings popover, syncing visible columns with the data table.

- Updated dependencies [0b13e96]
  - @dyrected/core@2.5.37
  - @dyrected/sdk@2.5.37

## 2.5.36

### Patch Changes

- eb77809: Native Spreadsheet Editing (Airtable-style)
  User can bulk edit with spreadsheet
  - @dyrected/core@2.5.36
  - @dyrected/sdk@2.5.36

## 2.5.35

### Patch Changes

- docs: add JSDoc comments to public API, form utilities, and core helper functions
  - @dyrected/core@2.5.35
  - @dyrected/sdk@2.5.35

## 2.5.34

### Patch Changes

- 46b11d6: fix: add optional chaining to resolvedSchemas to prevent runtime error when accessing admin components
  - @dyrected/core@2.5.34
  - @dyrected/sdk@2.5.34

## 2.5.33

### Patch Changes

- @dyrected/core@2.5.33
- @dyrected/sdk@2.5.33

## 2.5.32

### Patch Changes

- Updated dependencies [9fcf1e2]
  - @dyrected/core@2.5.32
  - @dyrected/sdk@2.5.32

## 2.5.31

### Patch Changes

- fa1ad68: feat: add workflow reference generation scripts, improve admin documentation, and implement dashboard testing utilities
- Updated dependencies [fa1ad68]
  - @dyrected/core@2.5.31
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
  - @dyrected/core@2.5.30
  - @dyrected/sdk@2.5.30

## 2.5.29

### Patch Changes

- Render type-safe collection and global Lucide icons in the sidebar with contextual fallbacks.
- cbc6dad: Lower Admin UI scoped reset specificity with `:where(...)` so component utility classes can override reset styles normally.
  - @dyrected/core@2.5.29
  - @dyrected/sdk@2.5.29

## 2.5.28

### Patch Changes

- fd36dfd: **Add universal sort parsing, admin CSS isolation, initial token support, and updated branding theme**
  - Added universal sort parsing in `@dyrected/core`:
    - New `parseSort` utility
    - New regression test for `sort=-updatedAt`
    - Exported parser from core
  - Integrated normalized sort handling across all DB adapters:
    - MongoDB
    - SQLite
    - Postgres
    - MySQL
  - Added admin/Dyrected Cloud initial token support:
    - Internal `initialToken` auth bypass path for Cloud-hosted dashboard bootstrapping
  - Added `defaultTechStack` support:
    - Setup prompt/provider context now supports default tech stack configuration
  - Added admin CSS isolation work:
    - Custom PostCSS plugin for scoping Tailwind styles
    - Prefixed/scoped admin animations
    - Disabled global Tailwind preflight
    - Scoped resets under `.dy-admin-ui`
    - Scoped prose and CSS variables away from `:root`
  - Updated branding/theme system:
    - Theme-aware logo support
    - Light/dark logo variants
    - Signal Lime / Violet semantic tokens
    - Typography and semantic CSS variable cleanup
  - Updated docs UI:
    - Docs layout/component structure refactors
    - Global docs styling update
    - Lighter lime background styling

- Updated dependencies [fd36dfd]
  - @dyrected/core@2.5.28
  - @dyrected/sdk@2.5.28

## 2.5.27

### Patch Changes

- 8c27ba9: refactor: unify React dependency resolution across packages and optimize Vite/Next configuration for dependency sharing
  - @dyrected/core@2.5.27
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
  - @dyrected/core@2.5.26
  - @dyrected/sdk@2.5.26

## 2.5.25

### Patch Changes

- ed94c3a: feat: implement join field backend population and fix frontend display

  Backend:
  - Populate join fields in API responses (find/findOne) with related docs
  - Add configurable `limit` property to join field type (default 10)
  - Include `collection`, `on`, and `limit` in schema endpoint serialization
  - Skip join population at depth > 0 to prevent infinite recursion

  Frontend:
  - Read backend-populated join data via useWatch instead of separate API calls
  - Fix "Create new" button route from /create to /new
  - Pre-fill relationship fields from URL query params on new entry creation
  - Include join field data in form default values for display

  Other:
  - Add CSV export to collection list page
  - Add functional access control tests
  - Update collection/global controller hooks

- Updated dependencies [ed94c3a]
  - @dyrected/core@2.5.25
  - @dyrected/sdk@2.5.25

## 2.5.24

### Patch Changes

- 71348fb: feat: implement client-side image compression and update admin-shell mobile layout with branding and user identity
  - @dyrected/core@2.5.24
  - @dyrected/sdk@2.5.24

## 2.5.23

### Patch Changes

- feat: add custom field component support, field-level error boundaries, and fix React instance mismatch in Vue bridge
- Updated dependencies
  - @dyrected/core@2.5.23
  - @dyrected/sdk@2.5.23

## 2.5.22

### Patch Changes

- Fix tabs roving focus error, resolve Nuxt module production build config loading, and add user profile display in admin sidebar footer.
  - @dyrected/core@2.5.22
  - @dyrected/sdk@2.5.22

## 2.5.21

### Patch Changes

- refactor: update form-engine to use TabsList and implement dynamic hot-reloading for database configuration in Nuxt module
  - @dyrected/core@2.5.21
  - @dyrected/sdk@2.5.21

## 2.5.20

### Patch Changes

- 298a35b: feat: enable inline document creation within RelationshipPicker and add support for custom search values in SelectField
  - @dyrected/core@2.5.20
  - @dyrected/sdk@2.5.20

## 2.5.19

### Patch Changes

- @dyrected/core@2.5.19
- @dyrected/sdk@2.5.19

## 2.5.18

### Patch Changes

- 09d6e92: Minor improvements
  - move Admin UI to @dyrected/react, add DyrectedMedia components, and introduce withDyrected Next.js config for dependency resolution.
  - consolidate React components in @dyrected/react, re-export from @dyrected/next, and add Next.js config wrapper
  - remove restrictive vertical scroll constraints across block builder, edit page, and media components
  - add password reset flow with token handling and UI views
  - add time picker field and image cropping functionality to media picker
  - enable image cropping, add clipboard file paste to media manager, and add support for date range pickers.

- Updated dependencies [09d6e92]
  - @dyrected/core@2.5.18
  - @dyrected/sdk@2.5.18

## 2.5.17

### Patch Changes

- bd0d9a3: feat: document hook isolation behaviors, add clear button to multi-select, and optimize JEXL condition/access evaluation with memoized compilation.
- Updated dependencies [bd0d9a3]
  - @dyrected/core@2.5.17
  - @dyrected/sdk@2.5.17

## 2.5.16

### Patch Changes

- 414b005: - feat: add generic typing to defineCollection and defineGlobal, introduce HookRequestContext, and enhance DynamicOptions interfaces.
  - feat: implement automatic document shape inference for collection and global definitions via field array analysis
  - feat: enhance rich text editor link management, add time support to date picker, and update radio field props
  - feat: add table support to rich text editor, introduce datetime field type, and improve form engine type safety.

- Updated dependencies [414b005]
  - @dyrected/core@2.5.16
  - @dyrected/sdk@2.5.16

## 2.5.15

### Patch Changes

- 356a7a5: feat: implement recursive lifecycle hooks system with collection/field level execution and admin sandbox support
  refactor: implement flexible grid-based form layout with radio field support and make selecet and multiselect filed searchable
- Updated dependencies [356a7a5]
  - @dyrected/core@2.5.15
  - @dyrected/sdk@2.5.15

## 2.5.14

### Patch Changes

- 959b5c5: Fix branding logo rendering by replacing the buggy comma operator with `getMediaUrl`. Resolve Nuxt module template and config-load path issues, and bundle the `qs` dependency inside the SDK to eliminate browser compatibility errors.
- Updated dependencies [959b5c5]
  - @dyrected/sdk@2.5.14
  - @dyrected/core@2.5.14

## 2.5.13

### Patch Changes

- 2961a9d: - Implement secure password field support (hashing, validation, and UI input form handling) and a password update endpoint.
  - Implement configuration cache invalidation for hot-reloading.
  - Add collection schema support for labels, simplify server handler config resolution, and add a Nuxt dynamic pages setup guide.
- Updated dependencies [2961a9d]
  - @dyrected/core@2.5.13
  - @dyrected/sdk@2.5.13

## 2.5.12

### Patch Changes

- admin
  • Introduced character‑count UI for fields with maxLength.
  • Refactored field components to improve placeholder handling and default values.

  nuxt
  • Fixed SSR data‑fetching and dynamic‑route rendering bugs.
  • Added hot‑reloading support for configuration files.

- Updated dependencies
  - @dyrected/core@2.5.12
  - @dyrected/sdk@2.5.12

## 2.5.11

### Patch Changes

- ff1a756: fix: implement interactive form validation summary and enhance field handling logic for relationships and arrays
  - @dyrected/core@2.5.11
  - @dyrected/sdk@2.5.11

## 2.5.10

### Patch Changes

- 4a6881b: **`@dyrected/admin` — Patch**
  - **Media library**: Replaced the narrow Sheet sidebar with a spacious Dialog (60/40 split-view) for a WordPress-style media editing experience.
  - **Infinite scroll**: Replaced pagination with infinite scroll on the media library page.
  - **Media preview**: Added a dynamic media preview block (image/audio/video/file) at the top of the `EditEntryPage` for upload collections.
  - **Alt & Caption fields**: Default `alt` and `caption` fields are now automatically injected in the "Edit Full Details" form for media collections, even when the user hasn't defined them explicitly — with duplicate prevention.
  - **Sticky save bar**: Added a frosted-glass sticky "Save Changes" bar at the bottom of both the collection edit page and global editor page, so users don't need to scroll back to the top to save.
  - **Read-only filename**: Filename field in the media dialog is now read-only to prevent storage key corruption.
  - **"Edit Full Details" button**: Added navigation from the media dialog to the full schema-driven entry editor for managing complex custom fields.
  - **Array delete button**: Made the delete button on sortable array items visibly red by default instead of nearly invisible.
  - **Block builder preview**: Truncated the collapsed block preview text to 50 characters so block cards don't grow with long content.
  - **URL validation**: Updated the `url` field Zod schema to support both simple strings and structured URL objects (external/internal link data) to resolve validation errors when saving URLs.

  **`@dyrected/core` — Patch**
  - **Default Query Depth**: Increased default API population depth for `findOne` and `global` endpoints to `10` to guarantee deep/full resolution of relationships and media by default.
  - **URL Field Population**: Enhanced the `PopulationService` to dynamically resolve internal `url` fields. It now populates the target document, recursively applies defaults, and rewrites the relative URL to use the target's slug (or falls back to ID).
  - **Nested Document Defaults**: The `PopulationService` now automatically applies default values to related documents during relationship population.
  - **Recursion Depth Bug Fix**: Fixed an issue in `findOne` and `global` controllers where population starting depth was initialized incorrectly, which blocked relationship populating when depth limit was low.

- Updated dependencies [4a6881b]
  - @dyrected/core@2.5.10
  - @dyrected/sdk@2.5.10

## 2.5.9

### Patch Changes

- a8fa0b7: refactor: normalize logical operators to uppercase in parser and media-picker query
- Updated dependencies [a8fa0b7]
  - @dyrected/core@2.5.9
  - @dyrected/sdk@2.5.9

## 2.5.8

### Patch Changes

- refactor: type MediaPicker preview function with Media interface
- Updated dependencies
  - @dyrected/core@2.5.8
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
  - @dyrected/core@2.5.7
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
  - @dyrected/core@2.5.6
  - @dyrected/sdk@2.5.6

## 2.5.5

### Patch Changes

- Normalize version to 2.5.5 to align all `@dyrected/*` packages in a fixed release group. All packages now move together on every future release.
- Updated dependencies
  - @dyrected/core@2.5.5
  - @dyrected/sdk@2.5.5

## 2.5.3

### Patch Changes

- Updated the CLI DX
- Updated dependencies
  - @dyrected/core@2.5.2
  - @dyrected/sdk@2.4.6

## 2.5.2

### Patch Changes

- improve Nuxt server request URL handling
- Updated dependencies
  - @dyrected/core@2.5.1
  - @dyrected/sdk@2.4.5

## 2.5.1

### Patch Changes

- cdc953e: Fixed mising CSS and added dy- prefix to all classes in components

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
  - @dyrected/core@2.5.0
  - @dyrected/sdk@2.4.2

## 2.4.2

### Patch Changes

- 5dd7403: fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK
- Updated dependencies [5dd7403]
  - @dyrected/core@2.4.1
  - @dyrected/sdk@2.4.1

## 2.4.1

### Patch Changes

- fix: include dist directory in npm package

## 2.4.0

### Minor Changes

- Infrastructure standardization, MySQL adapter improvements, and SDK robustness testing.

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.4.0
  - @dyrected/sdk@2.4.0

## 2.3.0

### Minor Changes

- Standardize database infrastructure and implement field promotion.
  - **Field Promotion**: Added 'promoted' option to Collection fields to extract JSON data into native SQL columns for indexing and performance.
  - **Lazy Migrations**: Added 'renameTo' support for seamless field renames without breaking existing data.
  - **Auto-Seeding**: Standardized 'initialData' seeding logic across all adapters.
  - **MySQL Adapter**: New robust MySQL adapter implementation.
  - **Strict Filtering**: Improved query translation parity across all SQL-based adapters.

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.3.0
  - @dyrected/sdk@2.3.0

## 2.0.1

### Patch Changes

- 220818c: ### @dyrected/core
  - **New Discovery Workflow**: Refined the AI setup prompt with a multi-step "Phase 0" discovery process to improve initial project scoping.
  - **Nomenclature Standardization**: Updated all system prompts to use "Nuxt.js" nomenclature and improved schema definition examples.

  ### @dyrected/db-postgres & @dyrected/db-sqlite
  - **Architecture Documentation**: Added source-level documentation explaining the use of raw SQL drivers (postgres.js/better-sqlite3) alongside Drizzle to support dynamic runtime schemas.

  ### @dyrected/admin
  - **Internal Maintenance**: Synchronized internal documentation and field renderer context to support the latest core setup workflows.

- Updated dependencies [220818c]
  - @dyrected/core@2.1.0

## 2.0.0

### Major Changes

- Updated all storage adapters to support `Uint8Array` buffers and file prefixing.
  - **Storage API Update**: The `buffer` parameter in `StorageAdapter.upload` and `resolve` now expects a `Uint8Array` instead of a Node.js `Buffer`. This ensures better compatibility across different JavaScript environments.
  - **File Prefixing**: Added support for an optional `prefix` parameter in `StorageAdapter.upload` to allow organizing files into subfolders or prefixes (supported by Cloudinary, S3, B2, and Local storage).
  - **Alignment**: Standardized `CloudinaryStorageAdapter`, `LocalStorageAdapter`, `S3StorageAdapter`, and `B2StorageAdapter` to strictly follow the `@dyrected/core` interface.

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.0.0
  - @dyrected/sdk@2.0.0

## 1.0.9

### Patch Changes

- d8e1f29: bump package versions and update export conditions for admin package
- Updated dependencies [d8e1f29]
  - @dyrected/core@1.0.9
  - @dyrected/sdk@1.0.9

## 1.0.6

### Patch Changes

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt.
- Updated dependencies
  - @dyrected/core@1.0.7
  - @dyrected/sdk@1.0.5

## 1.0.5

### Patch Changes

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture.
- Updated dependencies
  - @dyrected/core@1.0.6
  - @dyrected/sdk@1.0.4

## 1.0.4

### Patch Changes

- Standardized environment variable handling across Next.js and Nuxt (prioritizing `NEXT_PUBLIC_` and `NUXT_PUBLIC_` prefixes).
  Improved CLI initialization flow by saving AI setup prompts to `dyrected-ai-prompt.md` and refining the framework-specific setup instructions.
  Fixed type emission and dependency exports for `@dyrected/admin` to ensure stable builds in consuming applications.
  Added a drop-in `DyrectedAdmin` component for Next.js.
  Updated documentation with clearer self-hosted and cloud integration steps.
- Updated dependencies
  - @dyrected/core@1.0.4

## 1.0.3

### Patch Changes

- Standardized environment variable handling across Next.js and Nuxt integrations.
  - CLI now generates .env templates with framework-specific prefixes (NEXT*PUBLIC* / NUXT*PUBLIC*).
  - Next.js and Nuxt clients automatically resolve these prefixed variables for client-side use.
  - Added a dedicated `@dyrected/next/admin` component for easy dashboard embedding in Next.js.
  - Fixed TypeScript type generation for the Admin UI package.
- Updated dependencies
  - @dyrected/core@1.0.3
  - @dyrected/sdk@1.0.3

## 1.0.1

### Patch Changes

- bfc3468: Initial public release of the Dyrected CMS ecosystem.
- Updated dependencies [bfc3468]
  - @dyrected/core@1.0.1
  - @dyrected/sdk@1.0.1

## 1.0.0

### Major Changes

- 00f9439: Initial major release of the Dyrected CMS ecosystem. This release establishes the core monorepo architecture, featuring a flexible CMS engine, a premium React-based Admin UI with warm light aesthetics, and native Next.js/Nuxt integrations. Key highlights include Jexl-based RBAC, a specialized media library with S3/Cloudinary support, live preview, automated audit trails, and a separated auth model for enhanced security.

  ### Breaking Changes

  **WHAT:**
  - Renamed `createApp` to `createDyrectedApp` across all core and framework packages.
  - Removed the hardcoded `/api` prefix from internal routing logic; API paths now default to the handler root or are controlled via `apiPrefix` config.
  - Administrative users are now isolated in a reserved `__admins` collection by default.
  - Standardized database adapter return types to ensure consistent ID handling across SQL and NoSQL providers.

  **WHY:**
  - The rename prevents naming collisions with native framework initializers (like Vue's `createApp`).
  - Decoupling the `/api` prefix provides better compatibility with Next.js/Nuxt server routes and custom proxy configurations.
  - The `__admins` separation ensures system-level security isolation from application-level user data.

  **HOW:**
  - Update your server entry points to use the new `createDyrectedApp` factory function.
  - If you have custom integrations targeting internal endpoints, ensure your base URL paths are updated to reflect the removal of the mandatory `/api` prefix.
  - If upgrading an existing installation, migrate your administrative users from the `users` collection to the new `__admins` collection.

### Patch Changes

- Updated dependencies [00f9439]
  - @dyrected/core@1.0.0
  - @dyrected/sdk@1.0.0
