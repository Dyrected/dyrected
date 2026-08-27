# Changelog

All notable changes to the Dyrected platform are documented in this file.

## v2.10.0

- - **Aggregate Engine Expansion (`countDistinct`, `distinct`, `groupBy`)**:
  - Added support for `countDistinct` (`{ countDistinct: "fieldName" }`) to count unique non-null values in a single database query.
  - Added support for `distinct` (`{ distinct: "fieldName" }`) to extract unique non-null values without loading full documents.
  - Added grouped aggregation support via `groupBy` parameter (`?groupBy=<field>` or `{ groupBy: "field", aggregates: { ... } }`) returning per-group metric breakdowns with automatic `"__unassigned__"` sentinel handling for missing/null values.
  - Implemented cross-adapter parity for all aggregation operations across PostgreSQL, SQLite, MySQL, and MongoDB.
  - Updated live OpenAPI specification (`/api/openapi.json`) and Swagger documentation with complete aggregate schemas and response types.

  - **Grouped Views & Admin UI Performance Optimization**:
    - Replaced client-side document group extraction with native single-query database aggregations in grouped Table, Kanban, and Spreadsheet views, eliminating $N+1$ query waterfalls and reducing database roundtrips.
    - Deduplicated schema queries across `AdminShell`, `OperationalViewRoute`, and dashboard pages by utilizing cached context schemas.
    - Added `defaultView` collection configuration support with automated route redirection and clean sidebar submenu rendering.

- - **Filter Join Operator**: Support `AND` / `OR` toggle in toolbar and URL parameters (`joinOperator=and|or`) for inter-column filter combinations in operational views.
  - **Action Dialog Document Context**: Pass target document/row context (`doc`, `docs`, `record`, `row`, `data`, `formData`) into action form dialogs, `FieldRenderer`, and custom field components.
  - **View Features & Action Ordering**: Properly serialize and respect `view.features` (`edit`, `delete`, `duplicate`) and custom `actionOrder` in operational view action menus and table columns. (`@dyrected/admin`, `@dyrected/core`)

---

## v2.9.0

- Promote operational table to canonical list view:

  - **Default view synthesis in `getSchemas`**: `resolveSchemas` (`DyrectedProvider`) now synthesizes a `list` view (`layout: table`, columns from `admin.defaultColumns` or first 5 display fields) for collections without explicit `views`, so every collection has a table workspace and `CollectionRoute` can render without redirect.
  - **Standardized preference keys**: Column, view-mode, and toolbar keys now use `layout:collections:${slug}:list` for the default view and `layout:collections:${slug}:view:${viewSlug}[:variant|:mode|:toolbar]` for named views (variant suffix for `cards`/`kanban`). Reads fall back to legacy keys (`view-pref:`, `view-mode:`, `view-columns:`, `view-toolbar:`) and migrate on next save.
  - **CollectionRoute (Option B)**: `/collections/:slug` now renders `OperationalViewPage` directly with the first (synthesized) view instead of `CollectionListPage` (`list-view-v1`). `list-view-v1.tsx` is deprecated (kept for reference). Media collections still render `MediaPage`.
  - **URL compat shim**: Legacy `?where=<json>` (FilterBuilder) and `?search=<term>` params are merged into the view's `filter` (`mergeFilters` / `contains` on first searchable field) so old shared links keep working.
  - **Slot aliasing**: `admin.components.beforeList` → `beforeViewHeader`, `beforeListTable` → `beforeViewContent`, `afterListTable`/`afterList` → `afterViewContent` are now rendered via `AdminComponentSlot` with a stubbed `CollectionListSlotProps` so existing `collectionList` slot consumers continue to mount inside operational views. `collectionView` slots remain primary.

  `list-view-v1.tsx` is marked `@deprecated` and will be removed in a future minor. (`@dyrected/admin`)

- Operational Views: `defineView` / `defineAction` configuration helpers, view-aware admin sidebar and routing, table, kanban, calendar, cards (with multi-image carousels and edge-to-edge covers), and spreadsheet layouts, summary metric stat cards backed by the aggregation engine, an actions runner that resolves declarative mutations (`now()`, `input.*`, `doc.*`) or self-hosted handlers through the lifecycle-hook pipeline, and 4 new recipes in `@dyrected/knowledge`. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

- - **Where Operator Aliases (`greater_than`, `less_than`, etc.)**: Added support for verbose operator names in `parseSqlWhere` and `parseMongoWhere` (`greater_than`, `less_than`, `greater_than_equal`, `greater_than_or_equal`, `less_than_equal`, `less_than_or_equal`, `like`), resolving HTTP 500 errors on Detail View adjacent record navigation queries (Previous / Next document buttons).
  - **Core Jexl Pre-bundling**: Pre-bundled `jexl` into `@dyrected/core` to prevent Vite and browser runtime CJS default export errors across consumer applications.
  - **Public/Default Preferences Read**: Allowed `GET /api/preferences/:key` to use `optionalAuth`, enabling unauthenticated clients (e.g. login screen, theme initialization) to retrieve global preferences and default fallback values without throwing 401 Unauthorized errors. Mutations (`PUT`, `DELETE`) remain protected.
  - **Media Library Clipboard Paste & Progress Indication**: Added global clipboard paste support (`⌘V` / `Ctrl+V`) to `MediaLibraryDialog` with auto-switch to the Upload tab, live upload progress display, toast feedback notifications, and discoverability shortcut badges. (`@dyrected/admin`, `@dyrected/core`)

---

## v2.8.3

- - **Lazy Database Connections**: Removed eager initialization in constructors for `@dyrected/db-postgres`, `@dyrected/db-mysql`, and `@dyrected/db-mongodb`. Network sockets, connection pools, and database creation queries are now deferred until the first actual query or explicit lifecycle call, preventing hanging sockets and timers when loading `dyrected.config.ts` during static builds (`nuxt build`, `next build`, type-generation, or CI pipelines).
  - **Graceful Disconnect & Teardown**: Added `disconnect(): Promise<void>` to `DatabaseAdapter` interface across all database adapters (`@dyrected/db-postgres`, `@dyrected/db-mysql`, `@dyrected/db-mongodb`, `@dyrected/db-sqlite`) and exported `closeAllPostgresClients()` from `@dyrected/db-postgres`.
  - **Nuxt Lifecycle Teardown**: Added a `close` hook in `@dyrected/nuxt` to automatically call `disconnect()` on active database adapters and flush cached client connection pools when Nuxt finishes building or shuts down.

---

## v2.8.2

- Enhance Detail Views with inline editing, custom component resolution, and dynamic presentation options:

  - **Custom Component Resolution**: Resolve custom Detail View components directly from runtime `DyrectedContext` and `<DyrectedAdmin :components="..." />` in Vue/Nuxt and React/Next.js.
  - **Inline Field Editing**: Support `editable: true` on `displayField()` with interactive inputs, immediate SDK mutations, and save/cancel micro-interactions.
  - **Dynamic Badge Presentation**: Support `badgeColors` with named palettes, hex codes, Tailwind classes, and wildcards on `displayField` and `displaySection`.
  - **Media Previews**: Render uploads and media relationships seamlessly in Detail Views using `DyrectedMedia` with aspect ratio, alignment, and object-fit constraints.
  - **Adjacent Record Stepper**: Add header and footer stepper controls to navigate smoothly between previous and next records in the active collection.
  - **JEXL Visibility Context**: Pass full document properties to visibility evaluation context for robust conditional rendering. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/nuxt`, `@dyrected/vue`)

---

## v2.8.1

- - **Detail View Inline Editing (`editable: true`)**: Added interactive inline editing directly within the Detail View screen. Editors can toggle simple fields (such as internal notes, tags, status choices, quantities, and dates) into editable form inputs with single-click save and cancel controls, updating records immediately via the client SDK without navigating away from the detail screen.
  - **Dynamic Badge & Tag Color Palettes (`badgeColors`)**: Introduced the `badgeColors` resolution engine in Admin Detail Views. Supports 20+ named color palettes (`emerald`, `amber`, `rose`, `sky`, `indigo`, `purple`, `violet`, `zinc`, etc.), custom hex codes with automated background tints, raw Tailwind classes, and wildcard (`*`) fallback mappings.
  - **Section Badges and Palette Styling**: Added `badge` and `badgeColor` configuration options to `displaySection()`, allowing section headers to display contextual status or count badges.
  - **Human-Readable Option Resolution**: Enhanced select and radio field presentation in Detail Views to resolve raw value identifiers to their human-readable schema option labels.
  - **Rich Media & Thumbnail Previews**: Upload fields and media relationship documents in Detail Views now render responsive image cards, video players, and file download links instead of raw relationship identifiers.
  - **Star Rating & Color Swatch Displays**: Added visual star rating scales and interactive color swatch previews with hex copy utilities to Detail Views.
  - **Auth Bootstrap & External Token Resolution**: Fixed an issue where incoming redirect tokens (`dyrectedExternalToken`) caused the admin loading splash to hang indefinitely when external auth was not explicitly configured in the schema. Added cookie session support (`__dyrected_token` / `dyrected_token`) and optimistic JWT payload decoding so authenticated dashboards mount instantly without redundant roundtrips.
  - **Detail View Adjacent Record Navigation**: Added subtle Previous and Next record traversal in the Detail View. Includes a top-header stepper (`<` / `>`), a responsive bottom footer bar with previous/next document titles and directional arrows, and keyboard shortcuts (`J` for next, `K` for previous).
  - **Direct Media URL Resolution & Unified `DyrectedMedia`**: Standardized media URL handling across `@dyrected/admin` so that media objects with a populated `url` property use the target URL directly rather than reconstructing fallback paths. Centralized avatar, image, HTML5 video, YouTube/Vimeo embed, audio, and file download renderers into a universal `<DyrectedMedia />` component.
  - **Upload & Image Field Relationship Population (`depth >= 1`)**: Fixed `PopulationService` in `@dyrected/core` to populate `upload` and `image` field types (defaulting to the target upload collection or `media`) when queries specify `depth >= 1`. Added automatic bare-ID media resolution fallback to `<DyrectedMedia />` in `@dyrected/admin` so that media assets display immediately even if received as unpopulated IDs.
  - **Interactive Relationship Badge Links (`DetailRelationshipLink`)**: Relationship and author fields in Detail Views now render interactive linked badges featuring avatar images or initial icons, document titles, and direct navigation links to the target record. If received as an unpopulated ID string, the component automatically resolves the record title and avatar asynchronously.
  - **Tag and Array Badge Rendering**: Array fields, multiSelect lists, and JSON string arrays (such as `Tags: ["insights", "operations"]`) now automatically parse and render individual badge pills with support for `badgeColors` palettes, avoiding raw JSON string outputs.
  - **Comprehensive Detail Reference & Type Definitions**: Added complete JSDoc annotations and automated contract generation in `@dyrected/knowledge` for all 9 Detail View helper functions (`displayField`, `displaySection`, `displayTabs`, `displayTab`, `displayGrid`, `displayRepeat`, `displayComputed`, `displayText`, `displayDivider`, `displayCustom`) and their configuration options. (`@dyrected/admin`, `@dyrected/core`)

---

## v2.8.0

  - **Detail View System**:
    - Added read-only Detail View pages and configurable layout renderers for collections (`/collections/:slug/:id`) and globals (`/globals/:slug`).
    - Added layout configuration helpers in `@dyrected/core`: `defineDetailView`, `defineSection`, `defineFieldCard`, `defineRepeatCard`, `defineTab`, `defineTabs`, `defineComputedCard`, `defineDivider`, `defineInfoText`, and `defineFieldGrid`.
    - Added support for dynamic conditional visibility on detail cards, sections, and tabs using boolean values or JEXL expressions evaluated against `{ doc, user }`.
    - Added type-aware formatters and display variants including currency, percentages, progress bars, star ratings, tags, avatars, color swatches, and relations.
    - Added custom component slot support for detail views in both React and Vue runtimes.

  - **Collection Aggregations System**:
    - Added `POST /api/collections/:slug/aggregate` endpoint to `@dyrected/core` and integrated it into the OpenAPI specification generator.
    - Added collection `aggregate()` method to `@dyrected/sdk`.
    - Implemented database aggregation queries across all adapters: `@dyrected/db-postgres`, `@dyrected/db-mysql` (with `IF()` conditional aggregation), `@dyrected/db-mongodb`, and `@dyrected/db-sqlite`.
    - Added comprehensive security checks and access control gates for collection aggregations.

  - **Knowledge & Documentation Runtime**:
    - Added runtime-aware documentation manifest generator in `@dyrected/knowledge`.
    - Synchronized OpenAPI endpoints, recipes, and LLM reference indexes.

---

## v2.7.1

- - Scoped split-pane edit page width calculation exclusively to desktop screen breakpoints, preventing form compression on mobile viewports
  - Replaced zero-based index array warnings with human-readable collection and field slug names in CLI `sync:schema` outputs
  - Added direct documentation links to CLI schema sync warning messages and core config validation outputs
  - Added comprehensive built-in Jexl helper utility functions (`slugify`, `lower`, `upper`, `trim`, `capitalize`, `truncate`, `readingTime`, `wordCount`, `replace`, `startsWith`, `endsWith`, `now`, `today`, `formatDate`, `addDays`, `diffDays`, `isPast`, `isFuture`, `includes`, `join`, `first`, `last`, `compact`, `unique`, `length`, `round`, `clamp`, `default`, `coalesce`, `isEmpty`, `get`) across `@dyrected/core`, `@dyrected/admin`, and CLI declarative validation (`@dyrected/admin`, `dyrected`, `@dyrected/core`)

- - Isolated server observability and logger runtime dependencies under `@dyrected/core/server` to prevent Node core modules (`fs`, `worker_threads`, `stream`) and Pino from leaking into frontend client bundles.
  - Added browser fallback module configurations for Next.js (`withDyrected`) and Nuxt module Vite build hooks to ensure clean client component compilation across Turbopack and Vite. (`@dyrected/core`, `@dyrected/next`, `@dyrected/nuxt`)

---

## v2.7.0

- Add controlled admin theme support so host apps can drive the admin theme and receive theme changes back through the public admin API. This also fixes the admin theme provider initialization so it does not access refs during render. (`@dyrected/admin`)

- - Added dark mode SVG logo asset and theme-aware fallback rendering in `admin-shell`
  - Migrated Nuxt example component config access to `useRuntimeConfig`
  - Transitioned default live preview mode to `postMessage` across prompt templates, skills, documentation, and recipes
  - Updated Dyrected configuration, environment integration, and content modeling rules for rich text and tabbed admin layouts
  - Modularized and consolidated prompt generation logic, AI rules, and shared rule templates (`@dyrected/admin`, `dyrected`)

- @dyrected/core@2.7.0

- @dyrected/react@2.7.0 (`@dyrected/next`)

- @dyrected/sdk@2.7.0 (`@dyrected/next`)

---

## v2.6.4

- Improve admin safety and auth onboarding across admin, core, and SDK.

  - add a professional invite dialog in admin with copyable invite URLs and role selection for new invites
  - support invite acceptance directly from admin invite links
  - pre-create pending invited users in auth collections so they appear in admin lists before acceptance
  - let invite and reset emails use clickable URLs with stronger email-client-safe HTML and visible link fallbacks
  - expand dashboard "Needs attention" checks with backend health and invite-related signals
  - replace browser delete alerts with admin dialogs, including typed confirmation before deleting auth users (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

- Add Cloud-safe declarative hooks, broader declarative-expression validation, and clearer config diagnostics across core, admin, Nuxt, SDK, and CLI.

  - add declarative string hook support for collection/global `beforeRead`, `afterRead`, and `beforeChange`, field `beforeChange`, and field `admin.hooks.onChange`
  - preserve supported declarative hook strings during `sync:schema`, strip function hooks from Cloud payloads intentionally, and warn with exact schema paths
  - validate declarative access rules, string access policies, declarative hooks, `admin.condition`, and `admin.previewUrl` early with exact config paths and cleaner diagnostics
  - expose config diagnostics from `/api/schemas` so admin surfaces can consume them, and improve admin dashboard attention signals around config issues
  - improve Nuxt startup and reload reporting for invalid declarative config with formatted diagnostics instead of noisy raw errors
  - document the Cloud-safe access and hooks model more clearly, including synced string policies, `createdByCurrentUser` vs `isOwner`, declarative hook contexts, and short notes about early validation for access, hooks, preview, and `admin.condition`

---

## v2.6.3

- Polish the admin editing experience with better loading and layout behavior.

  - replace branded and text-only loading states with skeleton loaders across bootstrap, collections, globals, dashboard, and media views
  - add professional not-found states for missing collections, globals, routes, and missing edit entries after loading resolves
  - keep the desktop sidebar pinned to the viewport while the main content scrolls independently
  - remove the nested media-page scroll container so the page uses a single parent scroll area
  - debounce admin list and media search while keeping existing results mounted so only the results region refreshes during server-side search
  - add a draggable desktop split view for resizing the live preview and form editor on collection edit pages
  - make rich text editor prose respect dark mode typography tokens
  - use configured global `admin.icon` values in the global edit header
  - @dyrected/core@2.6.3
  - @dyrected/sdk@2.6.3 (`@dyrected/admin`)

- @dyrected/core@2.6.3

- @dyrected/sdk@2.6.3 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.6.3 (`@dyrected/next`)

---

## v2.6.2

- Add controlled theme props to `DyrectedAdmin` across the admin and framework wrappers:

  - `theme` sets the preferred admin theme to `system`, `light`, or `dark`.
  - `systemTheme` supplies the currently resolved system theme for React and Next hosts.
  - `onThemeChange` lets embedded admin theme controls update host-managed theme state in React and Next.
  - Nuxt and Vue wrappers expose the same controlled theme surface through `theme`, `system-theme`, and `on-theme-change`.

  This makes it possible for host apps to keep one shared dark and light mode preference while the embedded admin stays in sync.

- Dogfood the public admin controller APIs inside the built-in UI:

  - Move `MediaLibraryDialog` onto `useMediaLibrary` for internal library loading, paging, and selection state.
  - Use the public field/form APIs inside the built-in form renderer so nested field state flows through `useField` and `useDyrectedForm`.
  - Replace manual nested path string building in array, block, form, and nested-editor internals with the exported path helpers.
  - Align internal nested field targeting with full field paths, improving consistency with the public custom-field contract. (`@dyrected/admin`)

- Implemented the framework-level public API first, which was the right prerequisite for docs.
  Added a framework-level public API across the admin, React, and Vue packages.

  - `@dyrected/admin` now ships a side-effect-free public entrypoint for controllers, helpers, and React admin primitives, without pulling in the admin app entry or its CSS.
  - `@dyrected/react` now exposes the intended top-level admin and media hooks, and re-exports the form, field, and theme React APIs from the admin public surface.
  - `@dyrected/vue` now exposes first-class composables for admin schemas, media flows, forms, fields, and theming, and includes a Vue module shim so plain TypeScript validation works. (`@dyrected/admin`, `@dyrected/react`, `@dyrected/vue`)

- Add a reusable public form and field API foundation to `@dyrected/admin`:

  - Introduce framework-agnostic form and field controllers:
    - `createDyrectedFormController`
    - `createDyrectedFieldController`
  - Add React adapters for the shared controller layer:
    - `DyrectedFormProvider`
    - `DyrectedFieldPathProvider`
    - `useDyrectedForm`
    - `useField`
  - Publish custom field component prop/context types so host apps can build `admin.component` field overrides against a stable contract.
  - Export form utility helpers (`buildSchemaShape`, `buildDefaultValues`, `getFlatErrors`, `formatPath`, `resolveContainerPath`) for advanced custom form surfaces.
  - Keep the existing admin form engine on `react-hook-form` internally while syncing its state into the shared controller layer so public consumers and built-in forms use the same source of truth. (`@dyrected/admin`)

- Add a reusable public media API foundation to `@dyrected/admin`:

  - Introduce framework-agnostic media controllers for uploads, URL imports, and media library state:
    - `createMediaUploadController`
    - `createMediaURLController`
    - `createMediaLibraryController`
  - Refactor the React media hooks to become adapters over the shared controller layer:
    - `useMediaUpload`
    - `useMediaURL`
    - `useMediaLibrary`
  - Keep `useAddMediaFromUrl` as a backward-compatible alias while shifting the preferred public naming to `useMediaURL`.
  - Export the new media controllers, React hooks, and supporting media utilities from `@dyrected/admin` so host apps can build custom media interfaces without reimplementing ingestion logic.
  - Preserve the existing admin media experience by keeping `MediaLibraryDialog`, `MediaPicker`, and `MediaPage` on the same controller-backed upload and URL import pipeline. (`@dyrected/admin`)

- Extend the public admin API with theme controller support and field-path ergonomics:

  - Introduce `createAdminThemeController` as a framework-agnostic theme state foundation for React, Vue, and other host apps.
  - Export the public React theme adapter surface:
    - `AdminThemeProvider`
    - `AdminThemedRoot`
    - `useAdminTheme`
  - Export pure theme helpers:
    - `resolveAdminTheme`
    - `adminThemeClassName`
    - `getSystemAdminTheme`
  - Add higher-level nested field path helpers for custom field authors:
    - `normalizeFieldPath`
    - `getFieldPathSegments`
    - `joinFieldPath`
    - `getParentFieldPath`
  - Extend `useField` with object/array convenience helpers so nested custom fields can work with child and item paths without hand-building dot-path strings.
  - Document the controller-first public API pattern in `packages/admin/docs/public-controller-pattern.md`. (`@dyrected/admin`)

- Refine workflow action behavior in the admin collection editor:

  - Prefer `Save draft` as the primary workflow button when an entry is currently in a published workflow state.
  - Keep unpublish-style workflow transitions out of the primary button and available from the workflow dropdown instead.
  - Preserve normal forward workflow transitions as the primary action for non-published entries.
  - Remove the workflow comment dialog's effect-based local state reset to satisfy React Hooks lint rules without changing the required-comment flow. (`@dyrected/admin`)

- Overhaul media library upload experience with a unified media ingestion pipeline and non-technical storage notices:
  - Add multi-file drag-and-drop dropzone with live byte-level upload progress queue in `MediaLibraryDialog`.
  - Unify file ingestion across `MediaLibraryDialog`, `MediaPicker`, and `MediaPage` using `useMediaUpload`.
  - Add client-side Canvas API image compression (`compressImage`) capping long edges to 2048px before network transfer.
  - Add safe upload collection resolution (`resolveActiveMediaCollection`) falling back to `"media"` for non-upload collections.
  - Optimize URL media import pipeline with 0-byte bandwidth transfer for YouTube/Vimeo embeds and direct remote video CDN links, with client-side fetch and CORS fallbacks for direct images.
  - Add semantic source classification and visual badges (`getMediaSourceInfo`) for internal vs external media items across grid, list, and detail views.
  - Add non-technical, user-friendly `StorageNotConfiguredNotice` banner on `MediaPage` and `MediaLibraryDialog` when media storage is not configured.
  - Add "Media storage is not set up" alert item to the Dashboard "Needs attention" section when an upload collection exists without a configured storage provider.
  - Catch `Storage not configured` errors gracefully across upload forms and format them into clear instructions asking the user to contact their developer. (`@dyrected/admin`)

- Rewrite the public API docs around end-user goals instead of internal architecture.

  - Rework the overview for hooks and composables so it starts from the jobs developers are trying to get done, such as media uploads, media picking, document editing, custom fields, and theme-aware shells.
  - Add focused documentation pages for media, form and field, and theme APIs in `apps/docs`, with practical guidance for custom components, dashboards, and host apps rather than framing them only as admin internals.
  - Keep the lower-level controller layer documented only as supporting context, while steering most readers toward the public React hooks in `@dyrected/react` and Vue composables in `@dyrected/vue`.
  - @dyrected/core@2.6.2
  - @dyrected/sdk@2.6.2 (`@dyrected/admin`)

- @dyrected/core@2.6.2

- @dyrected/sdk@2.6.2 (`dyrected`)

- Rewrite the public API docs around end-user goals instead of internal architecture.

  - Rework the overview for hooks and composables so it starts from the jobs developers are trying to get done, such as media uploads, media picking, document editing, custom fields, and theme-aware shells.
  - Add focused documentation pages for media, form and field, and theme APIs in `apps/docs`, with practical guidance for custom components, dashboards, and host apps rather than framing them only as admin internals.
  - Keep the lower-level controller layer documented only as supporting context, while steering most readers toward the public React hooks in `@dyrected/react` and Vue composables in `@dyrected/vue`. (`@dyrected/react`, `@dyrected/vue`)

---

## v2.6.1

- Improve workflow editing UX in the Admin for workflow-enabled and `drafts: true` collections. Editors now get faster transition actions in the entry header and list view, clearer live-vs-draft status messaging, desktop labels for header action buttons, and a manual "save draft" fallback alongside workflow transitions.

  Add workflow-aware draft autosave config to collection admin options with `admin.autosave` and `admin.autosaveDelayMs`. Workflow-enabled collections now default to autosaving draft revisions without changing the published snapshot, while projects can still disable autosave per collection when they need explicit manual saves. (`@dyrected/admin`, `@dyrected/core`)

---

## v2.6.0

- Add typed collection search config and backend-powered admin search across core, admin, and SDK.

  Improve admin document titles and list cell rendering for relationship, object, and array values, including nested relation title chains and nested field `admin.useAsTitle`.

  Add join-field admin actions to show or hide `Create new` and `View all`, with `View all` opening the related collection list pre-filtered by the join relationship. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

---

## v2.5.65

- - Keep the edit-form change-password section inside the default tab when a collection has multiple tabs.
  - Populate nested join fields when the requested depth budget allows it, while leaving them unpopulated when depth is exhausted.
  - Reuse a shared Postgres client per connection URL so repeated adapter construction in dev servers does not exhaust database connections. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/db-postgres`)

---

## v2.5.64

- @dyrected/core@2.5.64

- @dyrected/sdk@2.5.64

- Add a dedicated `@dyrected/next/server` export for App Router route files and
  other server-only helpers so Next server code does not pull the client React
  entrypoints from the package root.
  - @dyrected/core@2.5.64
  - @dyrected/react@2.5.64
  - @dyrected/sdk@2.5.64 (`@dyrected/next`)

- @dyrected/admin@2.5.64 (`@dyrected/nuxt`, `@dyrected/react`, `@dyrected/vue`)

- @dyrected/vue@2.5.64 (`@dyrected/nuxt`)

---

## v2.5.63

- Fix workflow and draft handling across the admin UI and core collection APIs.

  - stop showing the admin publishing status column for collections that only define a user `status` field
  - show workflow state labels and colors consistently in admin list and edit views
  - return published workflow documents correctly in public reads, including legacy entries without a materialized published snapshot
  - materialize workflow metadata on update responses so the admin can keep draft and transition state in sync
  - improve the example auth roles setup and docs so custom auth `roles` fields use the expected array-backed shape (`@dyrected/admin`, `@dyrected/core`)

---

## v2.5.62

- Use server-backed logout and clear revoked stored admin sessions

  The admin provider still treated logout as a purely client-side action after Dyrected auth moved to revocable server-backed sessions. Logging out from the admin cleared local storage, but it did not call the server logout route, so the current session stayed valid until expiry. The provider also kept dead tokens in local storage when bootstrapping `me()` failed, which caused repeated failed auth requests on reload after a session had already been revoked.

  The admin provider now calls the collection logout route before clearing local state, so admin logout actually revokes the current session. It also clears persisted auth state only on real stale-auth failures during bootstrap (`401` / `404`), so revoked or invalid stored sessions are cleaned up automatically without treating unrelated network errors as a logout. (`@dyrected/admin`)

- Fix token-mode live preview never showing the draft

  In `previewMode: "token"`, the preview pane minted a valid token but discarded it before it reached the iframe, so the frame kept loading published content and never reflected edits. The mint effect depended on the `data` object, so it re-ran on every parent render; its cleanup cancelled the in-flight mint, and the `if (cancelled) return` guard then skipped applying the token. The constant re-runs also cleared the debounce timer, so minting eventually stopped firing on edits.

  The effect now depends on a stable serialized key of the draft instead of the object, so it only re-runs on a real edit — cancellation now means "the draft changed again," and a successful mint is applied to the iframe as intended. (`@dyrected/admin`)

- Type the SDK client and framework hooks against your generated schema automatically

  Previously the framework hooks were loosely typed: React's client came through context as `DyrectedClient<BaseSchema>`, and the Vue composables took an untyped `collection: string` with a hand-annotated `<T = any>` result. You got no slug autocomplete and no document types unless you passed a generic at every call site.

  Now `dyrected generate:types` emits a module augmentation that registers your schema globally:

  ```ts
  // dyrected-types.ts (generated)
  declare module "@dyrected/sdk" {
    interface Register {
      schema: DyrectedSchema;
    }
  }
  ```

  Once that generated file is part of your compilation, the SDK client and every framework hook (React, Vue, and Nuxt via auto-import) are typed against your schema with **no per-call generics**:

  ```ts
  // Vue
  const { docs } = useDyrectedCollection("posts"); // "posts" autocompleted, docs: Post[]

  // React
  const { client } = useDyrected();
  const { docs } = await client.collection("posts").find().exec(); // typed
  ```

  The mechanism is a new `Register` seam in `@dyrected/sdk`; `DyrectedClient` and `createClient` now default their schema type parameter to the registered schema, falling back to `BaseSchema` until the generated types are present. Existing code that passed an explicit schema generic is unchanged.

  Note for Vue: `useDyrected`, `useDyrectedCollection`, and `useDyrectedGlobal` now take a collection/global slug as their first type parameter. To override the inferred document type, pass both — `useDyrectedCollection<"posts", CustomPost>("posts")`.

  **Generated types now land in your app's source directory.** `generate:types` (and `sync:schema`) write `dyrected-types.ts` into `src/` (Vite/Next) or `app/` (Nuxt) instead of the project root. This is required for the schema augmentation to take effect: TypeScript only applies a `declare module` augmentation when the file is inside the program's `include` globs, and a `dyrected-types.ts` at a Nuxt project root is silently ignored. Your `dyrected.config.ts` stays at the project root. Pass `--output` to override the location.

  **Generator correctness fixes:**

  - Auth collections no longer emit a duplicate `roles` property. When your collection declares its own `roles` field (e.g. a `select`/`radio` with options), that definition wins — you get the enum union `"admin" | "editor" | "viewer"` instead of a conflicting second `roles?: string[]` declaration (which was a TypeScript error).
  - `multiSelect` fields now generate an array of the option literals — `("admin" | "editor")[]` — instead of a loose `string[]`, so multi-valued fields like `roles` stay typed as their allowed values.
  - The SDK's schema-generic constraint was loosened to a `SchemaShape` bound so a generated `DyrectedSchema` (built from named `interface`s, which lack an implicit index signature) satisfies it. Previously the augmentation silently fell back to `BaseSchema`.

  The Nuxt composables (`useDyrectedDoc`, `useDyrectedCollection`, `useDyrectedGlobal`) now return a properly typed `AsyncData<...>` instead of `any` — their `data` is typed as your document/global shape — and are constrained to your schema's slugs. (`dyrected`, `@dyrected/react`, `@dyrected/sdk`, `@dyrected/vue`)

- Add built-in API rate limiting, proxy-aware client IP resolution, and revocable auth sessions

  Dyrected auth and request protection were missing three production layers that Payload already treats as part of the core server contract: app-level request throttling, correct client-IP handling behind proxies, and a way to revoke JWT sessions immediately instead of waiting for expiry.

  `createDyrectedApp` now mounts an in-process API rate limiter with Payload-style defaults for `/api` routes, including configurable `max`, `window`, `paths`, `skip`, and `trustProxy` options. Client IP resolution now understands common provider headers and trusted `X-Forwarded-For` chains so production deployments behind a reverse proxy count the right caller instead of the proxy hop.

  Auth collections also move from purely stateless login tokens to JWTs backed by hidden `__auth_sessions` records. New tokens carry a session id, auth middleware validates that the backing session is still active, logout can revoke the current session immediately, `?allSessions=true` can revoke every session for the account, and password reset / password change now invalidate active sessions as a security boundary. Refreshing a token keeps the same underlying session instead of creating a second one silently.

  The docs and OpenAPI surface were updated to match the new behavior, especially around built-in rate limiting, trusted proxy setup, logout semantics, and session revocation. (`@dyrected/core`)

- Point package-distributed documentation references at the canonical `/docs` tree

  The docs site no longer maintains a separate `/new-docs` content tree and route. The new authored docs set now lives directly under the canonical `/docs` path, and the knowledge generator, published references, and package JSDoc links were updated to match.

  For `@dyrected/core`, this updates JSDoc `@see` links so generated API references and editor tooling point at the current docs URLs instead of the removed `/new-docs` paths.

  For `@dyrected/knowledge`, this refreshes generated references, prompt artifacts, LLM indexes, and skill outputs so published knowledge bundles link to the canonical docs paths and no longer depend on removed legacy recipe/reference pages. (`@dyrected/core`)

- Add `definePublishingWorkflow` to map your own role names onto the publishing workflow

  `publishingWorkflow()` hardcoded the role names `editor`, `publisher`, and `admin`, so a project whose roles are named differently (e.g. `writer`, `managing-editor`) got no capabilities and couldn't move documents through the flow.

  `definePublishingWorkflow({ editors, publishers })` builds the same `draft → in review → published` workflow but maps _your_ role values onto its two capability tiers — `editors` may edit and submit, `publishers` may also publish and unpublish. `publishingWorkflow()` is now a shorthand for `definePublishingWorkflow()` with the conventional defaults, so existing usage is unchanged.

  ```ts
  workflow: definePublishingWorkflow({
    editors: ["writer"],
    publishers: ["managing-editor", "admin"],
  });
  ``` (`@dyrected/core`)

- Fix `drafts: true` documents disappearing from the Admin list

  The publishing workflow synthesized from `drafts: true` (`simplePublishingWorkflow`) defined no role→capability mappings, so `canViewWorkflowDraft` returned `false` for everyone — including admins and editors. Every draft document was then filtered out of collection reads, leaving the Admin list empty.

  `canViewWorkflowDraft` now treats a workflow with no `roles` (the `drafts: true` case) as ungated: any **authenticated** user can view drafts, so they show up in the Admin regardless of what a project names its roles. Unauthenticated/public readers still only ever see published content, so drafts never leak to the live site. Workflows that define explicit `roles` keep their existing capability-based gating. (`@dyrected/core`)

- Add Payload-style logger config and first-class observability to Dyrected core

  Dyrected now supports a root `logger` config shaped like Payload's Pino-based logger surface, plus a new top-level `observability` config for request logging, redaction, sampling, tracing, metrics, and Dyrected-managed transports.

  Request logging is now structured instead of ad hoc string output. Successful requests are sampled, `4xx` requests log at `warn`, `5xx` requests log at `error`, and request ids, site/workspace ids, and trace correlation fields are included when available.

  Body logging is opt-in and bounded. Dyrected only attempts to capture JSON request bodies, redacts common secret fields and headers before logging, truncates oversized payloads, and falls back to metadata-only logging when a body cannot be parsed safely after capture.

  Core services and request paths now use structured logger helpers instead of direct `console.*` calls. This includes auth, audit-failure reporting, email delivery failures, router warnings, workflow hook isolation, and request error handling.

  OpenTelemetry tracing and metrics are now available behind explicit config. Dyrected can create request spans, emit request and failure metrics, export telemetry through OTLP, and expose a Prometheus scrape route only when configured. Audit logging remains a separate feature and is not merged with runtime observability. (`@dyrected/core`)

---

## v2.5.61

- Admin: brand accent color, wired page metadata, and list export

  - Add `admin.branding.accentColor` — a second brand color for links, navigation accents, and focus rings (mapped to the `--intelligence` token) alongside `primaryColor`. Branding colors now also apply correctly in dark mode.
  - Wire `admin.meta.titleSuffix` into the browser tab title (it now reflects the current page and updates on navigation) and `admin.branding.favicon` into the page favicon. Both restore the host page's title/icon when the embedded admin unmounts.
  - Add an **Export Selected** bulk action on collection lists (export just the selected rows to CSV), and quote/escape CSV export values per RFC 4180 so values containing commas, quotes, or newlines no longer break columns.

  **Breaking (shipped as patch):** removed the no-op `basename` prop from `AdminUIProps` and the `@dyrected/vue` / `@dyrected/nuxt` wrappers, and stopped the CLI from scaffolding it. The admin routes internally with a hash router, so the panel's location is determined by the route of the page you render it in. If your app passes `basename`, remove it — it had no effect.

- Fix audit log and drafts/workflow panels not appearing in the Admin

  Three related fixes so `audit: true` and `drafts: true` surface their Admin UI as intended:

  - **Audit log button never showed.** The `/api/schemas` response hand-serialized each collection and omitted the `audit` and `drafts` flags, so the Admin's `schema.audit` was always `undefined` and the audit-history button never rendered regardless of config. Both flags are now included in the serialized schema.
  - **Workflow/version panel hidden for existing documents.** Setting `drafts: true` synthesizes a publishing workflow via `normalizeConfig`, but the panel only appears when a document carries `__workflow` metadata — which documents created before the workflow existed (e.g. seeded content) don't have. `materializeWorkflowDocument` now treats such legacy documents as already-published live content: it surfaces them with the workflow's published state (keeping them visible to the public) so the workflow panel appears. New documents are unaffected.
  - **Live/Draft badge missing on workflow collections.** The header publishing badge only rendered for collections without a workflow, and read the raw `status` field. It now derives from the workflow state when a workflow is present (a state flagged `published` shows "Live", otherwise "Draft"), so collections using `drafts: true` — including ones with no `status` field — show the correct badge. (`@dyrected/admin`, `@dyrected/core`)

- Server-side (token) live preview now works end to end

  `previewMode: "token"` was previously a config value with backend endpoints but no admin integration. It's now wired up for server-rendered and statically generated frontends that can't receive `postMessage`.

  - `@dyrected/admin`: in `token` mode the live-preview pane mints a short-lived token from the current draft (debounced) and loads the frontend iframe at `previewUrl?dyPreview=<token>`, reloading on change. Click-to-edit and live-as-you-type remain `postMessage`-only.
  - `@dyrected/sdk`: new `createPreviewToken({ collectionSlug, documentId?, data })` to mint a token, plus `getPreviewToken(search)` and `PREVIEW_TOKEN_PARAM` helpers for reading the `dyPreview` token from a request's query string. `@dyrected/react` and `@dyrected/vue` re-export the helpers; `@dyrected/nuxt` auto-imports `getPreviewToken`.
  - `@dyrected/core`: the server now logs a startup warning when `DYRECTED_JWT_SECRET` is unset, since token-mode preview signs with it.

  Token mode is refresh-based (a mint + iframe reload per change) and embeds the draft in the signed token — see the Live Preview → Server-side docs for the security notes (set `DYRECTED_JWT_SECRET`) and the large-document URL-length caveat.

- Vue bridge shares the host app context, CLI sync respects DYRECTED_URL

  - `@dyrected/vue`: custom Vue components in the admin (custom field inputs and dashboard/list slots) now share the host app's context instead of each mounting an isolated Vue app. They can use the host app's plugins, `provide`/`inject`, Pinia, and i18n, and many custom components no longer spin up one full Vue app per instance.
  - `dyrected` (CLI): `sync:schema` now honors `DYRECTED_URL` (and the `NEXT_PUBLIC_` / `NUXT_PUBLIC_` / `VITE_` variants) from your environment. Previously the `--url` option's hardcoded default masked the env fallback, so it always synced to Dyrected Cloud regardless of your configured URL.
  - `@dyrected/admin`: fix the admin browser-title helper resolving a collection's label — it read a non-existent `collection.label` (collections use `labels.singular` / `labels.plural`), which broke the package build. Also corrected the misleading `AdminComponents` JSDoc (`fields` is keyed by the field's `admin.component` string, not field type; `collectionList` injects list slots rather than replacing the list view). (`@dyrected/admin`, `dyrected`, `@dyrected/vue`)

---

## v2.5.60

- Improve dynamic select options, frontend rendering components, and field ergonomics.

  - **Server-side search for dynamic `select`/`multiSelect` options.** The Admin now forwards the editor's typed query to the options resolver as `req.query.search` (debounced) and renders whatever the resolver returns, instead of loading the entire list into the browser and filtering client-side. Push the filter into your query (`where: { name: { contains: search } }`, capped `limit`) so large and growing lists stay fast. Previously-typed results are kept visible while the next page loads.
  - **Cached option resolvers.** `options` objects that set `cacheTTL` (seconds) are now actually cached on the server, keyed by field, query parameters, and requesting user, and reused until the TTL elapses. The value was previously accepted but ignored.
  - **`DyrectedRichText` component** added to `@dyrected/react` and `@dyrected/vue`, re-exported from `@dyrected/next`, and auto-imported in `@dyrected/nuxt`. It renders the HTML string a `richText` field stores.
  - **`DyrectedIcon` is now re-exported from `@dyrected/next`** — Next.js apps no longer need to import it from `@dyrected/react`.
  - **Nuxt renders images with `<NuxtImg>`.** `DyrectedImage` is now registered as an auto-imported component, and both it and the image branch of `DyrectedMedia` use `@nuxt/image`, which the module installs automatically.
  - **`RichTextField` now types its value as `string`** (an HTML string) rather than `Record<string, unknown>`, matching what the editor stores.
  - **`UrlField` value type widened** to `string | UrlLinkValue` to reflect the structured link object it returns.
  - **Number fields accept advisory `min`/`max`**, surfaced to editors and client tooling (not enforced as server-side validation), mirroring `maxLength`.
  - **`defineTab` helper** groups a set of fields under a shared Admin tab label.
  - **Auth collections re-assert `email`/`password` integrity.** A developer-defined `email` field can no longer silently drop the injected `unique`/`required` constraints.
  - **Relationship read depth defaults to `1`** across the REST controllers, matching the SDK.
  - Field type reference contracts now carry per-type descriptions, and the `checkbox`/`group`/`upload`/`radio-group` field docs pages were renamed to `boolean`/`object`/`image`/`radio` to match their helper names.

- Fix DatePicker click bug, revert react-day-picker to v8, and fix focus warnings.

  - **Fixed DatePicker closing prematurely.** Intercept `pointerdown` events instead of `mousedown` on the wrapper, preventing the picker from instantly closing on click due to React event phase mismatches.
  - **Downgraded `react-day-picker` to v8.** Version 9 introduced breaking DOM/CSS structure that conflicted with our existing styling. Downgrading to the highly stable v8 restores standard navigation button interactions and styling.
  - **Fixed `aria-hidden` focus retention warning.** Replaced `aria-hidden` with the modern `inert` attribute on the closed calendar wrapper, forcing the browser to safely drop keyboard focus and satisfy screen reader constraints when the picker closes. (`@dyrected/admin`)

---

## v2.5.59

- Fix server-side field access evaluation so field rules receive the current document `id` during API reads and updates, matching admin behavior and preventing `!id`-style rules from silently allowing protected field changes.

  Improve the public access-control type surface by allowing `AccessFunctionArgs`, `AccessFunction`, `AccessRule`, `AccessPolicyResolver`, `DyrectedConfig`, and `defineConfig` to carry a custom authenticated-user type for deployments that extend the default user claims.

  Align the access-control overview docs with runtime behavior by documenting that field access is enforced by both the API and the admin panel.

  I improved dyrected upgrade in packages/cli/src/commands/upgrade.t
  It now:

  - resolves the actual published version for each @dyrected/* package with `npm view <pkg> version`
  - installs explicit versions instead of relying on @latest
  - upgrades dependencies and devDependencies separately
  - uses exact-version installs (--save-exact / --exact)
  - verifies both package.json and node_modules after install
  - fails loudly if the installed result is still stale (`dyrected`, `@dyrected/core`)

---

## v2.5.58

- Add a production-ready access control model that supports booleans, Jexl strings, direct self-hosted functions, and named policies across collections, globals, and field access.

  Introduce top-level `accessPolicies` resolution in core, enforce collection/global/field access on the server, and preserve object-based Jexl filter results for row-level access constraints.

  Make Cloud schema sync safe by stripping function-based access rules from synced payloads, preserving only booleans, Jexl strings, and named policies, with clear warnings for unsupported rules.

  Harden the admin hooks sandbox message listener so it only accepts messages from the expected iframe source. (`@dyrected/admin`, `dyrected`, `@dyrected/core`)

---

## v2.5.57

- Centralize preview URL resolution into a shared admin utility and standardize project initialization with updated defaults and enhanced schema configuration. (`@dyrected/admin`, `dyrected`)

- Add type-safe field builder helpers and related updates.

  - Add `defineField`, `defineBlock`, and a dedicated `define<Type>Field` helper for every field type (`defineTextField`, `defineRichTextField`, `defineRelationshipField`, …) to `@dyrected/core`. Each is an identity helper that injects the field `type` and preserves full document-shape inference through `defineCollection`/`defineGlobal`.
  - Add configurable `features` and `headingLevels` to rich-text fields. The Admin rich-text editor now enables only the configured toolbar controls and editor capabilities (disabling a feature also removes its keyboard shortcut and paste handling).
  - Migrate documentation examples, the `dyrected init` scaffold, and the `@dyrected/knowledge` recipes and prompt templates to use the new `define*Field` helpers.
  - Rename the `JWT_SECRET` environment variable to `DYRECTED_JWT_SECRET` — update your `.env` accordingly.
  - Filter unpublished documents out of public read responses. (`@dyrected/admin`, `dyrected`, `@dyrected/core`, `@dyrected/nuxt`)

---

## v2.5.56

- Render single-field arrays as a flat, reorderable list instead of accordion cards, with the label shown once and per-row actions (duplicate, move, delete) in an overflow menu. Add a `hideLabel` admin option to suppress a field's label where it would be redundant. Hide the admin's own mobile header when embedded so the host dashboard renders a single top bar, driven via a `dyrected:toggle-menu` window event. Fix the mobile nav drawer closing immediately after opening (the close-on-navigation effect depended on the open state and re-triggered itself); it now closes only when the route changes. Refresh the dashboard update-check cache on a TTL so the banner reflects newly published versions instead of freezing on the first value seen. (`@dyrected/admin`, `@dyrected/core`)

---

## v2.5.55

- Improve table cell rendering with default string truncation, protect primary title columns from shrinking, enlarge row actions layout, and resolve local origin preview overrides for development.
  - @dyrected/core@2.5.55
  - @dyrected/sdk@2.5.55 (`@dyrected/admin`)

- @dyrected/core@2.5.55

- @dyrected/sdk@2.5.55 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.55 (`@dyrected/next`)

---

## v2.5.54

- feat: visual and functional enhancements to the Admin UI

  - **Filenames**: Added a `getDisplayFilename` utility that strips directory path prefixes (e.g. `dyrected_cloud/...`) to show clean filenames in list views, media cards, and detail dialog inputs.
  - **Collection Icons**: Resolved custom collection icons (`schema.admin?.icon`) on list page headers, falling back dynamically to `Users` or `Database`.
  - **Data Table Layout**: Upgraded the `DataTable` visual presentation (borders, rounded corners, row heights, and backgrounds) to align with the media library's clean design aesthetics.
  - **Field Labels**: Updated `DataTable` search placeholders and View Settings column checklists to render human-readable field labels instead of raw database keys.
  - **Build Cleanups**: Suppressed Rollup `MODULE_LEVEL_DIRECTIVE` and sourcemap warnings for clean Vite/Nuxt client builds.
  - @dyrected/core@2.5.54
  - @dyrected/sdk@2.5.54 (`@dyrected/admin`)

- @dyrected/core@2.5.54

- @dyrected/sdk@2.5.54 (`dyrected`)

- feat: visual and functional enhancements to the Admin UI

  - **Filenames**: Added a `getDisplayFilename` utility that strips directory path prefixes (e.g. `dyrected_cloud/...`) to show clean filenames in list views, media cards, and detail dialog inputs.
  - **Collection Icons**: Resolved custom collection icons (`schema.admin?.icon`) on list page headers, falling back dynamically to `Users` or `Database`.
  - **Data Table Layout**: Upgraded the `DataTable` visual presentation (borders, rounded corners, row heights, and backgrounds) to align with the media library's clean design aesthetics.
  - **Field Labels**: Updated `DataTable` search placeholders and View Settings column checklists to render human-readable field labels instead of raw database keys.
  - **Build Cleanups**: Suppressed Rollup `MODULE_LEVEL_DIRECTIVE` and sourcemap warnings for clean Vite/Nuxt client builds. (`@dyrected/nuxt`)

- feat: add `DyrectedIcon` component for rendering `icon` field values

  The `icon` field type stores a Lucide icon _name_ (e.g. `"ChartNoAxesCombined"`), not SVG markup. The new `DyrectedIcon` component resolves that name to the matching Lucide icon so `icon` field values can be rendered directly:

  - `@dyrected/react` — `<DyrectedIcon name={feature.icon} className="w-6 h-6" />` (backed by `lucide-react`)
  - `@dyrected/vue` — `<DyrectedIcon :name="feature.icon" class="w-6 h-6" />` (backed by `lucide-vue-next`)
  - `@dyrected/nuxt` — auto-imported as `<DyrectedIcon>` (no import required)

  All standard Lucide props (`size`, `color`, `strokeWidth`, `class`/`className`, …) are forwarded, plus an optional `fallback` icon name. Integration docs now document the component and include a full per-framework component reference. (`@dyrected/nuxt`, `@dyrected/react`, `@dyrected/vue`)

---

## v2.5.53

- Expose the field-type contracts as public types. `Block`, `BlockVariant`, `TypedField`, `FieldBase`, the per-field admin option types (`BaseFieldAdmin`, `TextFieldAdmin`, `TextareaFieldAdmin`, `EmailFieldAdmin`, `UrlFieldAdmin`, `IconFieldAdmin`, `SelectFieldAdmin`, `RadioFieldAdmin`, `BooleanFieldAdmin`, `MultiSelectFieldAdmin`, `CharacterLimitFieldAdmin`, `WordLimitFieldAdmin`), and the field hook shapes (`FieldHooks`, `FieldAdminHooks`) are now exported from `@dyrected/core`. This lets consumers and generated documentation reference the full field type surface directly. Purely additive — no runtime or existing-type changes. (`@dyrected/core`)

- @dyrected/sdk@2.5.53 (`@dyrected/react`, `@dyrected/vue`)

- @dyrected/admin@2.5.53 (`@dyrected/react`, `@dyrected/vue`)

---

## v2.5.52

- Block icons & variants, a cleaner admin loading state, dark-mode text fix, and OpenAPI/Swagger fixes.

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
  - Swagger UI now resolves its OpenAPI spec **relative to the docs page**, so `/api/docs` works when the app is mounted under a prefix (e.g. a Nuxt `apiBase: "/dyrected"`) instead of 404-ing on an absolute `/api/openapi.json`. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/react`, `@dyrected/vue`)

- Nested block editor, live-preview click-to-edit, and a redesigned edit page.

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

- Upload MIME/size validation and add-media-from-URL.

  **Core (`@dyrected/core`)**
  - New `upload-validation` utility: `isMimeAllowed` (supports `*`, `type/*`, and exact `type/subtype` patterns, case-insensitive) and payload validation that returns a typed error with the correct HTTP status (`415 Unsupported Media Type` or `413 Payload Too Large`).
  - The media controller enforces a collection's `upload` config (`allowedMimeTypes`, `maxFileSize`) on upload and accepts external media references.

  **Admin (`@dyrected/admin`)**
  - Add media from a URL: `external-media` builder + `useAddMediaFromUrl` hook detect YouTube/Vimeo videos, direct image URLs, and generic files, and store them as reference-only media records (no file bytes). The media grid and preview components key off the resulting `mimeType` (`video/youtube`, `video/vimeo`, `image/external`, …) to render each asset correctly.
  - Media picker, media card, media library dialog, and media page updated to support external media and surface upload validation errors.

  **SDK (`@dyrected/sdk`)**
  - Support for external media references and upload validation feedback. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

---

## v2.5.51

- @dyrected/core@2.5.51

- @dyrected/sdk@2.5.51

- Traverse parent directories to detect lockfiles in monorepos/nested workspaces during package manager detection.
  - @dyrected/core@2.5.51
  - @dyrected/sdk@2.5.51 (`dyrected`)

- @dyrected/react@2.5.51 (`@dyrected/next`)

- @dyrected/admin@2.5.51 (`@dyrected/nuxt`, `@dyrected/react`, `@dyrected/vue`)

- @dyrected/vue@2.5.51 (`@dyrected/nuxt`)

---

## v2.5.50

- Resolve preview domain dynamically using schemas siteUrl, prefix/strip url field domains using siteUrl origin, and update block builder library dialog with scrollable 3-column desktop layout. (`@dyrected/admin`, `@dyrected/core`)

---

## v2.5.49

- Add upgrade command, non-interactive init options, and unified combobox URL field redesign. (`@dyrected/admin`, `dyrected`)

- @dyrected/core@2.5.49

- @dyrected/react@2.5.49 (`@dyrected/next`)

- @dyrected/sdk@2.5.49 (`@dyrected/next`)

---

## v2.5.48

- Fix CSV importer: drag & drop, file validation, empty file rejection, invalid row handling, network failure retry, and full-page layout
  - Drag and drop now works on the upload zone (was advertised but never wired up) (CI-005)
  - Non-CSV files dropped or selected show a clear "Unsupported file type" error and stay on the upload screen (CI-005)
  - Empty CSV files (zero data rows) are rejected with an explicit message instead of advancing to a blank mapping step (CI-006)
  - At the preview step, if all rows are invalid the Start Import button is disabled and a blocking error is shown; if some rows are invalid an acknowledgement checkbox must be checked before import can proceed, preventing silent partial data creation (CI-029)
  - Rows that fail due to network or API errors during import are tracked separately from validation failures; a "Retry N Failed Rows" button appears on the complete screen so users can retry without re-uploading or re-mapping (CI-030)
  - CSV import now renders as a full-page layout instead of a constrained modal, giving the validation table sufficient room to display all columns and rows (`@dyrected/admin`)

- Improve cloud admin auth collection resolution and delegated membership handling
  - Prefer the `__admins` collection for admin auth when present, then fall back to the configured `adminAuth.collectionSlug`, then the first auth collection
  - Return the resolved admin auth collection slug in public admin auth config so the admin UI and server agree on the active auth collection
  - Pass a normalized hook request context to delegated provider membership handlers so cloud-backed user management hooks can safely read query params and request headers
  - Preserve multipart upload behavior in the SDK by letting fetch set the multipart boundary automatically (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

---

## v2.5.47

- Normalize cloud-issued admin session token roles for client-side access checks.
  - @dyrected/core@2.5.47
  - @dyrected/sdk@2.5.47 (`@dyrected/admin`)

- @dyrected/core@2.5.47

- @dyrected/sdk@2.5.47 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.47 (`@dyrected/next`)

---

## v2.5.46

- Add low-impact dark mode support to the admin UI with system, light, and dark theme preferences.
  - @dyrected/core@2.5.46
  - @dyrected/sdk@2.5.46 (`@dyrected/admin`)

- @dyrected/core@2.5.46

- @dyrected/sdk@2.5.46 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.46 (`@dyrected/next`)

---

## v2.5.45

- feat: add enterprise guide and implement table auto-initialization with improved admin authentication checks (`@dyrected/core`, `@dyrected/db-postgres`)

- @dyrected/sdk@2.5.45 (`@dyrected/react`, `@dyrected/vue`)

- @dyrected/admin@2.5.45 (`@dyrected/react`, `@dyrected/vue`)

---

## v2.5.44

- Add provider membership hooks type definitions and collection controller delegation logic to redirect authentication collection CRUD requests. (`@dyrected/core`)

- @dyrected/sdk@2.5.44 (`@dyrected/react`, `@dyrected/vue`)

- @dyrected/admin@2.5.44 (`@dyrected/react`, `@dyrected/vue`)

---

## v2.5.43

- feat: add support for external authentication provider exchange and update Node.js requirement to 22+ (`@dyrected/admin`, `@dyrected/core`)

---

## v2.5.42

- feat: enable dynamic site admin authentication by supporting schema-derived config in the auth controller

  refactor: modularize type definitions by extracting schemas, access, adapters, and configuration interfaces into separate files (`@dyrected/core`)

- @dyrected/sdk@2.5.42 (`@dyrected/react`, `@dyrected/vue`)

- @dyrected/admin@2.5.42 (`@dyrected/react`, `@dyrected/vue`)

---

## v2.5.41

- feat(admin): fix admin panel type safety, lint warnings, and external auth flow integration

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
     - Synchronized knowledge base inventories (`packages/knowledge/generated/*`) and LLM mappings to index new API parameters. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

---

## v2.5.40

- fix docs and global seeding (`@dyrected/core`, `@dyrected/sdk`)

---

## v2.5.39

- fix: improve CSV importer data handling and simplify UI components by removing unused pagination and refactoring select options.
  - @dyrected/core@2.5.39
  - @dyrected/sdk@2.5.39 (`@dyrected/admin`)

- @dyrected/core@2.5.39

- @dyrected/sdk@2.5.39 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.39 (`@dyrected/next`)

---

## v2.5.38

- feat: implement CSV import component with column mapping, validation, and batch processing support
  - @dyrected/core@2.5.38
  - @dyrected/sdk@2.5.38 (`@dyrected/admin`)

- @dyrected/core@2.5.38

- @dyrected/sdk@2.5.38 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.38 (`@dyrected/next`)

---

## v2.5.37

- feat: add customizable field widths to collection edit layouts and unify list page view settings
  - Added customizable field widths (25%, 33%, 50%, 66%, 75%, 100%) to edit forms, enabling side-by-side field positioning.
  - Expanded the layout preferences API and SDK client to handle generic LayoutItem objects (`Array<{ name: string; width?: string }>`).
  - Consolidated the list view mode selector and column configure popovers into a unified "View Settings" panel.
  - Enabled column visibility toggles (checklists) directly inside the new unified view settings popover, syncing visible columns with the data table. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

---

## v2.5.36

- Native Spreadsheet Editing (Airtable-style)
  User can bulk edit with spreadsheet
  - @dyrected/core@2.5.36
  - @dyrected/sdk@2.5.36 (`@dyrected/admin`)

- @dyrected/core@2.5.36

- @dyrected/sdk@2.5.36 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.36 (`@dyrected/next`)

---

## v2.5.35

- docs: add JSDoc comments to public API, form utilities, and core helper functions
  - @dyrected/core@2.5.35
  - @dyrected/sdk@2.5.35 (`@dyrected/admin`)

- @dyrected/core@2.5.35

- @dyrected/sdk@2.5.35 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.35 (`@dyrected/next`)

---

## v2.5.34

- fix: add optional chaining to resolvedSchemas to prevent runtime error when accessing admin components
  - @dyrected/core@2.5.34
  - @dyrected/sdk@2.5.34 (`@dyrected/admin`)

- @dyrected/core@2.5.34

- @dyrected/sdk@2.5.34 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.34 (`@dyrected/next`)

---

## v2.5.33

- @dyrected/core@2.5.33

- @dyrected/sdk@2.5.33 (`@dyrected/admin`, `@dyrected/nuxt`, `@dyrected/react`, `@dyrected/vue`)

- Await lazy Dyrected app initialization in Next.js route handlers, mount API routes
  under `/dyrected` by default, support custom route prefixes, and generate valid
  App Router scaffolding from the CLI.
  - @dyrected/core@2.5.33
  - @dyrected/sdk@2.5.33 (`dyrected`)

- Await lazy Dyrected app initialization in Next.js route handlers, mount API routes
  under `/dyrected` by default, support custom route prefixes, and generate valid
  App Router scaffolding from the CLI.
  - @dyrected/core@2.5.33
  - @dyrected/react@2.5.33
  - @dyrected/sdk@2.5.33 (`@dyrected/next`)

- @dyrected/admin@2.5.33 (`@dyrected/nuxt`, `@dyrected/react`, `@dyrected/vue`)

- @dyrected/vue@2.5.33 (`@dyrected/nuxt`)

---

## v2.5.32

- @dyrected/knowledge — minor

  Add @dyrected/knowledge package: compiled recipe library with behavioral tests, intent-indexed search, and a content generator that produces hybrid documentation pages (authored prose + generated TypeScript contracts in marked regions). Includes auto-slug, cross-field validation, dependent dropdown, owner-scoped access, role-based access, editorial workflow, page builder, upload collection, relationship/join, safe field rename, and conditional admin field recipes.

  @dyrected/core — patch

  Expand public type exports (CollectionConfig, GlobalConfig, Field, UploadConfig, workflow types) and extend the OpenAPI generator to include all auth, workflow, schema, and dynamic-option routes.

  @dyrected/sdk — patch

  Remove internal setup-prompt utility (superseded by CLI). Expand public API surface with fluent collection/global builders, authentication helpers, and complete TypeScript generics.

  dyrected — minor

  Add generate-ai-rules command. Extend init with framework/adapter detection. Add type generator and config templates.

  @dyrected/db-postgres, @dyrected/db-mongodb — patch

  Align adapter implementations with updated DatabaseAdapter contract (transactions, typed return shapes, ReadonlyDatabaseAdapter).

  @dyrected/docs — patch

  Rewrite reference, adapter, recipe, and guide pages as hybrid documents: authored mental models and examples preserved, TypeScript contracts generated into marked regions. Fix MDX region markers from HTML comments to JSX comments ({/\* \*/}) so fumadocs can compile them. Add check-contract.mjs validation: required heading manifests, authored word-count floor, and marker integrity checks.

  skills/dyrected — patch

  Restore full SKILL.md with schema migration procedure, access-control principles, intent-to-pattern table, and generated field/recipe inventories.

---

## v2.5.31

- feat: add workflow reference generation scripts, improve admin documentation, and implement dashboard testing utilities

---

## v2.5.30

- ### ✨ Features & Refactors
  - **Admin UI Customization**: Implemented the Admin UI component slot injection system along with Vue bridging support, allowing developers to inject custom components natively into the dashboard and lists.
  - **Onboarding & Setup**: Replaced prompt generation with an external guided setup flow, and added a new email template service.
  - **UI Refresh**: Updated admin CSS variables and layout container styling for improved aesthetics.

  ### 📚 Documentation
  - **Structural Changes**: Migrated feature documentation into dedicated guides.
  - **Cloud Rebrand**: Updated app dashboard documentation and references to point to the new `cloud.dyrected.com` domain.
  - **General Polish**: Expanded and updated documentation across multiple files (including fixing the YAML parser bugs in the new markdown format).

---

## v2.5.29

- Render type-safe collection and global Lucide icons in the sidebar with contextual fallbacks. (`@dyrected/admin`)

- Lower Admin UI scoped reset specificity with `:where(...)` so component utility classes can override reset styles normally.
  - @dyrected/core@2.5.29
  - @dyrected/sdk@2.5.29 (`@dyrected/admin`)

- @dyrected/core@2.5.29

- @dyrected/sdk@2.5.29 (`dyrected`, `@dyrected/next`)

- Add type-safe Lucide `admin.icon` configuration for collection and global sidebar navigation. (`@dyrected/core`)

- @dyrected/react@2.5.29 (`@dyrected/next`)

---

## v2.5.28

- **Add universal sort parsing, admin CSS isolation, initial token support, and updated branding theme**
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

---

## v2.5.27

- refactor: unify React dependency resolution across packages and optimize Vite/Next configuration for dependency sharing
  - @dyrected/core@2.5.27
  - @dyrected/sdk@2.5.27 (`@dyrected/admin`)

- @dyrected/core@2.5.27

- @dyrected/sdk@2.5.27 (`dyrected`)

- refactor: unify React dependency resolution across packages and optimize Vite/Next configuration for dependency sharing (`@dyrected/next`, `@dyrected/nuxt`, `@dyrected/react`, `@dyrected/vue`)

---

## v2.5.26

- **UI/UX Improvement for Admin**
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

---

## v2.5.25

- feat: implement join field backend population and fix frontend display

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
  - Update collection/global controller hooks (`@dyrected/admin`, `@dyrected/core`)

---

## v2.5.24

- feat: implement client-side image compression and update admin-shell mobile layout with branding and user identity
  - @dyrected/core@2.5.24
  - @dyrected/sdk@2.5.24 (`@dyrected/admin`)

- @dyrected/core@2.5.24

- @dyrected/sdk@2.5.24 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.24 (`@dyrected/next`)

---

## v2.5.23

- feat: add custom field component support, field-level error boundaries, and fix React instance mismatch in Vue bridge

---

## v2.5.22

- Fix tabs roving focus error, resolve Nuxt module production build config loading, and add user profile display in admin sidebar footer.
  - @dyrected/core@2.5.22
  - @dyrected/sdk@2.5.22 (`@dyrected/admin`)

- @dyrected/core@2.5.22

- @dyrected/sdk@2.5.22 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.22 (`@dyrected/next`)

- Fix tabs roving focus error, resolve Nuxt module production build config loading, and add user profile display in admin sidebar footer. (`@dyrected/nuxt`)

---

## v2.5.21

- refactor: update form-engine to use TabsList and implement dynamic hot-reloading for database configuration in Nuxt module
  - @dyrected/core@2.5.21
  - @dyrected/sdk@2.5.21 (`@dyrected/admin`)

- @dyrected/core@2.5.21

- @dyrected/sdk@2.5.21 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.21 (`@dyrected/next`)

- refactor: update form-engine to use TabsList and implement dynamic hot-reloading for database configuration in Nuxt module (`@dyrected/nuxt`)

---

## v2.5.20

- feat: enable inline document creation within RelationshipPicker and add support for custom search values in SelectField
  - @dyrected/core@2.5.20
  - @dyrected/sdk@2.5.20 (`@dyrected/admin`)

- @dyrected/core@2.5.20

- @dyrected/sdk@2.5.20 (`dyrected`, `@dyrected/next`)

- @dyrected/react@2.5.20 (`@dyrected/next`)

---

## v2.5.19

- @dyrected/core@2.5.19

- @dyrected/sdk@2.5.19

- feat: implement lazy database initialization with auto-creation support and update config loading template strategy
  - @dyrected/core@2.5.19 (`@dyrected/db-postgres`)

- @dyrected/react@2.5.19 (`@dyrected/next`)

- feat: implement lazy database initialization with auto-creation support and update config loading template strategy
  - @dyrected/admin@2.5.19
  - @dyrected/core@2.5.19
  - @dyrected/sdk@2.5.19
  - @dyrected/vue@2.5.19 (`@dyrected/nuxt`)

- @dyrected/admin@2.5.19 (`@dyrected/react`, `@dyrected/vue`)

---

## v2.5.18

- Minor improvements
  - move Admin UI to @dyrected/react, add DyrectedMedia components, and introduce withDyrected Next.js config for dependency resolution.
  - consolidate React components in @dyrected/react, re-export from @dyrected/next, and add Next.js config wrapper
  - remove restrictive vertical scroll constraints across block builder, edit page, and media components
  - add password reset flow with token handling and UI views
  - add time picker field and image cropping functionality to media picker
  - enable image cropping, add clipboard file paste to media manager, and add support for date range pickers. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

---

## v2.5.17

- feat: document hook isolation behaviors, add clear button to multi-select, and optimize JEXL condition/access evaluation with memoized compilation. (`@dyrected/admin`, `@dyrected/core`)

- @dyrected/sdk@2.5.17 (`@dyrected/react`)

---

## v2.5.16

- - feat: add generic typing to defineCollection and defineGlobal, introduce HookRequestContext, and enhance DynamicOptions interfaces.
  - feat: implement automatic document shape inference for collection and global definitions via field array analysis
  - feat: enhance rich text editor link management, add time support to date picker, and update radio field props
  - feat: add table support to rich text editor, introduce datetime field type, and improve form engine type safety. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

---

## v2.5.15

- feat: implement recursive lifecycle hooks system with collection/field level execution and admin sandbox support
  refactor: implement flexible grid-based form layout with radio field support and make selecet and multiselect filed searchable (`@dyrected/admin`, `@dyrected/core`)

- @dyrected/sdk@2.5.15 (`@dyrected/react`)

---

## v2.5.14

- Fix branding logo rendering by replacing the buggy comma operator with `getMediaUrl`. Resolve Nuxt module template and config-load path issues, and bundle the `qs` dependency inside the SDK to eliminate browser compatibility errors. (`@dyrected/admin`, `@dyrected/nuxt`, `@dyrected/sdk`)

- @dyrected/core@2.5.14

---

## v2.5.13

- - Implement secure password field support (hashing, validation, and UI input form handling) and a password update endpoint.
  - Implement configuration cache invalidation for hot-reloading.
  - Add collection schema support for labels, simplify server handler config resolution, and add a Nuxt dynamic pages setup guide. (`@dyrected/admin`, `dyrected`, `@dyrected/core`, `@dyrected/nuxt`)

- @dyrected/sdk@2.5.13 (`@dyrected/react`)

---

## v2.5.12

- admin
  • Introduced character‑count UI for fields with maxLength.
  • Refactored field components to improve placeholder handling and default values.

  nuxt
  • Fixed SSR data‑fetching and dynamic‑route rendering bugs.
  • Added hot‑reloading support for configuration files. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/nuxt`)

- @dyrected/sdk@2.5.12 (`@dyrected/react`)

---

## v2.5.11

- fix: implement interactive form validation summary and enhance field handling logic for relationships and arrays
  - @dyrected/core@2.5.11
  - @dyrected/sdk@2.5.11 (`@dyrected/admin`)

- @dyrected/core@2.5.11

- @dyrected/sdk@2.5.11 (`dyrected`, `@dyrected/react`)

---

## v2.5.10

- **`@dyrected/admin` — Patch**
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
  - **Recursion Depth Bug Fix**: Fixed an issue in `findOne` and `global` controllers where population starting depth was initialized incorrectly, which blocked relationship populating when depth limit was low. (`@dyrected/admin`, `@dyrected/core`)

- @dyrected/sdk@2.5.10 (`@dyrected/react`)

---

## v2.5.9

- refactor: normalize logical operators to uppercase in parser and media-picker query (`@dyrected/admin`, `@dyrected/core`)

- @dyrected/sdk@2.5.9 (`@dyrected/react`)

---

## v2.5.8

- refactor: type MediaPicker preview function with Media interface

---

## v2.5.7

- - **URL Field Evolution**: Implemented a modern dual-mode URL Field component featuring a direct toggle between external links and a dynamic internal page/document selector (complete with direct database slug binding and custom label fields).
  - **Global Settings Configuration**: Added native Global Configuration support, with robust schema validation, configuration normalization, hydration mechanisms, and full type safety across standard field components.
  - **Form Engine & Block Builder Revamp**:
    - Re-architected the Block Builder with interactive, collapsible block layout items, custom drag-and-drop sort handlers, and automatic field-value summary crawling for collapsed block previews.
    - Replaced the simple dropdown block selector with a visual center-aligned **Block Library Dialog Modal** featuring soft-indicator layer graphics.
    - Standardized external save triggers (header Save button & `⌘S` shortcut) using native HTML5 `form` attributes to bind seamlessly with the Hook Form submit engine.
    - Enlarged block titles and integrated center-aligned dashed "Add Block" buttons directly under the block lists for optimized edit flow.

---

## v2.5.6

- # Dyrected CMS 10 Bugs Completed Resolution

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

---

## v2.5.5

- Normalize version to 2.5.5 to align all `@dyrected/*` packages in a fixed release group. All packages now move together on every future release.

- Refactor source into `commands/` and `utils/` modules for maintainability. (`dyrected`)

- Add MySQL adapter as a database option in `init`. (`dyrected`)

- Auto-detect framework from `package.json` and pre-select it in the prompt. (`dyrected`)

- Detect Bun lockfile in package manager detection. (`dyrected`)

- **Next.js**: detect `src/` directory and App Router vs Pages Router; write files to the correct location. (`dyrected`)

- **Next.js**: generate `instrumentation.ts` to log admin and API URLs on server start. (`dyrected`)

- **Nuxt**: detect `app/` srcDir and write admin page to the correct location. (`dyrected`)

- **Nuxt**: auto-patch `nuxt.config.ts` to register `@dyrected/nuxt` with `adminPath`. (`dyrected`)

- Auto-generate TypeScript types after a successful `sync:schema` (`--skip-types` to opt out). (`dyrected`)

- Add `--help` examples to all commands. (`dyrected`)

- Add `__admins` collection to generated config by default so every new project has dashboard auth. (`dyrected`)

- Normalize version to 2.5.5 to align with the rest of the monorepo. (`dyrected`, `@dyrected/nuxt`)

- Normalize package version to 2.5.5 to align with the rest of the `@dyrected/*` monorepo.
  Versions 3.x–5.x were published in error due to incorrect major version bumps in the
  changeset workflow. Those versions have been deprecated on npm. All packages now share a
  fixed version group and will move together on every future release. (`@dyrected/db-mysql`)

- Add `adminPath` module option to specify where the admin page is mounted. (`@dyrected/nuxt`)

- Log admin and API URLs to the console when the Nitro dev server starts (via `listen` hook). (`@dyrected/nuxt`)

- Updated the CLI DX (`@dyrected/vue`)

---

## v2.5.4

- improve Nuxt server request URL handling (`@dyrected/vue`)

---

## v2.5.3

- Updated the CLI DX (`@dyrected/admin`)

- fix react dependency issues (`@dyrected/vue`)

---

## v2.5.2

- improve Nuxt server request URL handling (`@dyrected/admin`)

- Updated the CLI DX (`@dyrected/core`)

---

## v2.5.1

- Fixed mising CSS and added dy- prefix to all classes in components (`@dyrected/admin`)

- improve Nuxt server request URL handling (`@dyrected/core`)

---

## v2.5.0

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
    - Fixed `@dyrected/vue` package exports for modern bundler compatibility. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/vue`)

---

## v2.5.2 (published as 5.0.2 in error)

- Updated the CLI DX (`@dyrected/db-mysql`)

---

## v2.5.1 (published as 5.0.1 in error)

- Improve Nuxt server request URL handling (`@dyrected/db-mysql`)

---

## v2.5.0 (published as 5.0.0 in error)

- Admin UI enhancements: clickable primary column, Tabs Layout, Row Layout, Icon Field, Join Fields, Inline Page Editing. (`@dyrected/db-mysql`)

- Architecture: extraction of Vue-specific logic into `@dyrected/vue`, synchronized field types across SDK and Admin. (`@dyrected/db-mysql`)

- Integrations: improved Nuxt and Next.js support. (`@dyrected/db-mysql`)

- Bug fixes: resolved build failures related to shadowing type declarations in `@dyrected/core`, fixed `@dyrected/vue` package exports. (`@dyrected/db-mysql`)

---

## v2.4.6

- Updated the CLI DX (`@dyrected/sdk`)

---

## v2.4.5

- improve Nuxt server request URL handling (`@dyrected/sdk`)

---

## v2.4.4

- fix react dependency issues (`@dyrected/sdk`)

---

## v2.4.3

- change the way we import qs (`@dyrected/sdk`)

---

## v2.4.2

- fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK (`@dyrected/admin`)

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
    - Fixed `@dyrected/vue` package exports for modern bundler compatibility. (`@dyrected/sdk`)

---

## v2.4.1

- fix: include dist directory in npm package (`@dyrected/admin`)

- fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK (`@dyrected/core`, `@dyrected/sdk`)

---

## v2.4.0

- Infrastructure standardization, MySQL adapter improvements, and SDK robustness testing. (`@dyrected/admin`, `@dyrected/core`, `@dyrected/sdk`)

---

## v2.4.1 (published as 4.0.2 in error)

- fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK (`@dyrected/db-mysql`)

---

## v2.4.0 (published as 4.0.1 in error)

- fix: include dist directory in npm package (`@dyrected/db-mysql`)

---

## v2.4.0 (published as 4.0.0 in error)

- Infrastructure standardization, MySQL adapter improvements, and SDK robustness testing. (`@dyrected/db-mysql`)

---

## v2.3.9

- Updated the CLI DX (`@dyrected/next`, `@dyrected/nuxt`)

---

## v2.3.8

- improve Nuxt server request URL handling (`@dyrected/next`, `@dyrected/nuxt`)

---

## v2.3.7

- fix react dependency issues (`@dyrected/next`, `@dyrected/nuxt`)

- Updated the CLI DX (`@dyrected/react`)

---

## v2.3.6

- improve Nuxt server request URL handling (`@dyrected/react`)

---

## v2.3.5

- Updated the CLI DX

- Fixed mising CSS and added dy- prefix to all classes in components (`@dyrected/nuxt`)

- fix react dependency issues (`@dyrected/react`)

---

## v2.3.4

- improve Nuxt server request URL handling

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
    - Fixed `@dyrected/vue` package exports for modern bundler compatibility. (`@dyrected/next`, `@dyrected/nuxt`)

---

## v2.3.3

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

- fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK (`@dyrected/next`, `@dyrected/nuxt`)

---

## v2.3.2

- fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK

---

## v2.3.1

- fix: include dist directory in npm package (`dyrected`)

---

## v2.3.0

- Standardize database infrastructure and implement field promotion.
  - **Field Promotion**: Added 'promoted' option to Collection fields to extract JSON data into native SQL columns for indexing and performance.
  - **Lazy Migrations**: Added 'renameTo' support for seamless field renames without breaking existing data.
  - **Auto-Seeding**: Standardized 'initialData' seeding logic across all adapters.
  - **MySQL Adapter**: New robust MySQL adapter implementation.
  - **Strict Filtering**: Improved query translation parity across all SQL-based adapters.

---

## v2.3.0 (published as 3.0.0 in error)

- Standardize database infrastructure and implement field promotion.
  - **Field Promotion**: Added `promoted` option to collection fields to extract JSON data into native SQL columns for indexing and performance.
  - **Lazy Migrations**: Added `renameTo` support for seamless field renames without breaking existing data.
  - **Auto-Seeding**: Standardized `initialData` seeding logic across all adapters.
  - **MySQL Adapter**: New robust MySQL adapter implementation.
  - **Strict Filtering**: Improved query translation parity across all SQL-based adapters. (`@dyrected/db-mysql`)

---

## v2.1.0

- ### @dyrected/core
  - **New Discovery Workflow**: Refined the AI setup prompt with a multi-step "Phase 0" discovery process to improve initial project scoping.
  - **Nomenclature Standardization**: Updated all system prompts to use "Nuxt.js" nomenclature and improved schema definition examples.

  ### @dyrected/db-postgres & @dyrected/db-sqlite
  - **Architecture Documentation**: Added source-level documentation explaining the use of raw SQL drivers (postgres.js/better-sqlite3) alongside Drizzle to support dynamic runtime schemas.

  ### @dyrected/admin
  - **Internal Maintenance**: Synchronized internal documentation and field renderer context to support the latest core setup workflows. (`@dyrected/core`)

---

## v2.0.1

- ### @dyrected/core
  - **New Discovery Workflow**: Refined the AI setup prompt with a multi-step "Phase 0" discovery process to improve initial project scoping.
  - **Nomenclature Standardization**: Updated all system prompts to use "Nuxt.js" nomenclature and improved schema definition examples.

  ### @dyrected/db-postgres & @dyrected/db-sqlite
  - **Architecture Documentation**: Added source-level documentation explaining the use of raw SQL drivers (postgres.js/better-sqlite3) alongside Drizzle to support dynamic runtime schemas.

  ### @dyrected/admin
  - **Internal Maintenance**: Synchronized internal documentation and field renderer context to support the latest core setup workflows. (`@dyrected/admin`, `@dyrected/db-postgres`, `@dyrected/db-sqlite`)

---

## v2.0.0

- Updated all storage adapters to support `Uint8Array` buffers and file prefixing.
  - **Storage API Update**: The `buffer` parameter in `StorageAdapter.upload` and `resolve` now expects a `Uint8Array` instead of a Node.js `Buffer`. This ensures better compatibility across different JavaScript environments.
  - **File Prefixing**: Added support for an optional `prefix` parameter in `StorageAdapter.upload` to allow organizing files into subfolders or prefixes (supported by Cloudinary, S3, B2, and Local storage).
  - **Alignment**: Standardized `CloudinaryStorageAdapter`, `LocalStorageAdapter`, `S3StorageAdapter`, and `B2StorageAdapter` to strictly follow the `@dyrected/core` interface.

---

## v1.0.10

- bump package versions and update export conditions for admin package (`@dyrected/nuxt`)

---

## v1.0.9

- bump package versions and update export conditions for admin package

---

## v1.0.8

- bump package versions and update export conditions for admin package (`dyrected`)

- ### Summary of Changes
  - **AI Setup Prompt**: Updated `packages/core/src/utils/setup-prompt.ts` to generate configuration code using class-based instantiation. This ensures that AI assistants helping with project setup will provide the preferred 1.0.x syntax. (`@dyrected/core`)

- fix: use defineEventHandler and upgrade h3 to resolve deprecation warnings in Nuxt module (`@dyrected/nuxt`)

---

## v1.0.7

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt.

---

## v1.0.6

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt. (`@dyrected/admin`)

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture.

- bump package versions and update export conditions for admin package (`@dyrected/react`)

---

## v1.0.5

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture. (`@dyrected/admin`)

- Standardize framework integrations for Next.js and Nuxt. Fix CLI generation for Nuxt admin pages to use zero-import architecture and framework-aware env var prefixes. (`dyrected`, `@dyrected/core`)

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt. (`@dyrected/react`, `@dyrected/sdk`)

---

## v1.0.4

- Standardized environment variable handling across Next.js and Nuxt (prioritizing `NEXT_PUBLIC_` and `NUXT_PUBLIC_` prefixes).
  Improved CLI initialization flow by saving AI setup prompts to `dyrected-ai-prompt.md` and refining the framework-specific setup instructions.
  Fixed type emission and dependency exports for `@dyrected/admin` to ensure stable builds in consuming applications.
  Added a drop-in `DyrectedAdmin` component for Next.js.
  Updated documentation with clearer self-hosted and cloud integration steps.

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture. (`@dyrected/react`, `@dyrected/sdk`)

---

## v1.0.3

- Standardized environment variable handling across Next.js and Nuxt integrations.
  - CLI now generates .env templates with framework-specific prefixes (NEXT*PUBLIC* / NUXT*PUBLIC*).
  - Next.js and Nuxt clients automatically resolve these prefixed variables for client-side use.
  - Added a dedicated `@dyrected/next/admin` component for easy dashboard embedding in Next.js.
  - Fixed TypeScript type generation for the Admin UI package.

---

## v1.0.1

- Initial public release of the Dyrected CMS ecosystem.

---

## v1.0.0

- Initial major release of the Dyrected CMS ecosystem. This release establishes the core monorepo architecture, featuring a flexible CMS engine, a premium React-based Admin UI with warm light aesthetics, and native Next.js/Nuxt integrations. Key highlights include Jexl-based RBAC, a specialized media library with S3/Cloudinary support, live preview, automated audit trails, and a separated auth model for enhanced security.

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

---

## v0.4.0

- Operational Views: `defineView` / `defineAction` configuration helpers, view-aware admin sidebar and routing, table, kanban, calendar, cards (with multi-image carousels and edge-to-edge covers), and spreadsheet layouts, summary metric stat cards backed by the aggregation engine, an actions runner that resolves declarative mutations (`now()`, `input.*`, `doc.*`) or self-hosted handlers through the lifecycle-hook pipeline, and 4 new recipes in `@dyrected/knowledge`. (`@dyrected/knowledge`)

---

## v0.3.1

- - **Detail View Inline Editing (`editable: true`)**: Added interactive inline editing directly within the Detail View screen. Editors can toggle simple fields (such as internal notes, tags, status choices, quantities, and dates) into editable form inputs with single-click save and cancel controls, updating records immediately via the client SDK without navigating away from the detail screen.
  - **Dynamic Badge & Tag Color Palettes (`badgeColors`)**: Introduced the `badgeColors` resolution engine in Admin Detail Views. Supports 20+ named color palettes (`emerald`, `amber`, `rose`, `sky`, `indigo`, `purple`, `violet`, `zinc`, etc.), custom hex codes with automated background tints, raw Tailwind classes, and wildcard (`*`) fallback mappings.
  - **Section Badges and Palette Styling**: Added `badge` and `badgeColor` configuration options to `displaySection()`, allowing section headers to display contextual status or count badges.
  - **Human-Readable Option Resolution**: Enhanced select and radio field presentation in Detail Views to resolve raw value identifiers to their human-readable schema option labels.
  - **Rich Media & Thumbnail Previews**: Upload fields and media relationship documents in Detail Views now render responsive image cards, video players, and file download links instead of raw relationship identifiers.
  - **Star Rating & Color Swatch Displays**: Added visual star rating scales and interactive color swatch previews with hex copy utilities to Detail Views.
  - **Auth Bootstrap & External Token Resolution**: Fixed an issue where incoming redirect tokens (`dyrectedExternalToken`) caused the admin loading splash to hang indefinitely when external auth was not explicitly configured in the schema. Added cookie session support (`__dyrected_token` / `dyrected_token`) and optimistic JWT payload decoding so authenticated dashboards mount instantly without redundant roundtrips.
  - **Detail View Adjacent Record Navigation**: Added subtle Previous and Next record traversal in the Detail View. Includes a top-header stepper (`<` / `>`), a responsive bottom footer bar with previous/next document titles and directional arrows, and keyboard shortcuts (`J` for next, `K` for previous).
  - **Direct Media URL Resolution & Unified `DyrectedMedia`**: Standardized media URL handling across `@dyrected/admin` so that media objects with a populated `url` property use the target URL directly rather than reconstructing fallback paths. Centralized avatar, image, HTML5 video, YouTube/Vimeo embed, audio, and file download renderers into a universal `<DyrectedMedia />` component.
  - **Upload & Image Field Relationship Population (`depth >= 1`)**: Fixed `PopulationService` in `@dyrected/core` to populate `upload` and `image` field types (defaulting to the target upload collection or `media`) when queries specify `depth >= 1`. Added automatic bare-ID media resolution fallback to `<DyrectedMedia />` in `@dyrected/admin` so that media assets display immediately even if received as unpopulated IDs.
  - **Interactive Relationship Badge Links (`DetailRelationshipLink`)**: Relationship and author fields in Detail Views now render interactive linked badges featuring avatar images or initial icons, document titles, and direct navigation links to the target record. If received as an unpopulated ID string, the component automatically resolves the record title and avatar asynchronously.
  - **Tag and Array Badge Rendering**: Array fields, multiSelect lists, and JSON string arrays (such as `Tags: ["insights", "operations"]`) now automatically parse and render individual badge pills with support for `badgeColors` palettes, avoiding raw JSON string outputs.
  - **Comprehensive Detail Reference & Type Definitions**: Added complete JSDoc annotations and automated contract generation in `@dyrected/knowledge` for all 9 Detail View helper functions (`displayField`, `displaySection`, `displayTabs`, `displayTab`, `displayGrid`, `displayRepeat`, `displayComputed`, `displayText`, `displayDivider`, `displayCustom`) and their configuration options. (`@dyrected/knowledge`)

---

## v0.3.0

  - **Detail View System**:
    - Added read-only Detail View pages and configurable layout renderers for collections (`/collections/:slug/:id`) and globals (`/globals/:slug`).
    - Added layout configuration helpers in `@dyrected/core`: `defineDetailView`, `defineSection`, `defineFieldCard`, `defineRepeatCard`, `defineTab`, `defineTabs`, `defineComputedCard`, `defineDivider`, `defineInfoText`, and `defineFieldGrid`.
    - Added support for dynamic conditional visibility on detail cards, sections, and tabs using boolean values or JEXL expressions evaluated against `{ doc, user }`.
    - Added type-aware formatters and display variants including currency, percentages, progress bars, star ratings, tags, avatars, color swatches, and relations.
    - Added custom component slot support for detail views in both React and Vue runtimes.

  - **Collection Aggregations System**:
    - Added `POST /api/collections/:slug/aggregate` endpoint to `@dyrected/core` and integrated it into the OpenAPI specification generator.
    - Added collection `aggregate()` method to `@dyrected/sdk`.
    - Implemented database aggregation queries across all adapters: `@dyrected/db-postgres`, `@dyrected/db-mysql` (with `IF()` conditional aggregation), `@dyrected/db-mongodb`, and `@dyrected/db-sqlite`.
    - Added comprehensive security checks and access control gates for collection aggregations.

  - **Knowledge & Documentation Runtime**:
    - Added runtime-aware documentation manifest generator in `@dyrected/knowledge`.
    - Synchronized OpenAPI endpoints, recipes, and LLM reference indexes. (`@dyrected/knowledge`)

---

## v0.2.16

- - Added dark mode SVG logo asset and theme-aware fallback rendering in `admin-shell`
  - Migrated Nuxt example component config access to `useRuntimeConfig`
  - Transitioned default live preview mode to `postMessage` across prompt templates, skills, documentation, and recipes
  - Updated Dyrected configuration, environment integration, and content modeling rules for rich text and tabbed admin layouts
  - Modularized and consolidated prompt generation logic, AI rules, and shared rule templates
  - @dyrected/core@2.7.0 (`@dyrected/knowledge`)

---

## v0.2.15

- Improve generated recipe metadata and route recipe links to the new common-patterns docs section. (`@dyrected/knowledge`)

---

## v0.2.14

- Point package-distributed documentation references at the canonical `/docs` tree

  The docs site no longer maintains a separate `/new-docs` content tree and route. The new authored docs set now lives directly under the canonical `/docs` path, and the knowledge generator, published references, and package JSDoc links were updated to match.

  For `@dyrected/core`, this updates JSDoc `@see` links so generated API references and editor tooling point at the current docs URLs instead of the removed `/new-docs` paths.

  For `@dyrected/knowledge`, this refreshes generated references, prompt artifacts, LLM indexes, and skill outputs so published knowledge bundles link to the canonical docs paths and no longer depend on removed legacy recipe/reference pages. (`@dyrected/knowledge`)

- Add `definePublishingWorkflow` to map your own role names onto the publishing workflow

  `publishingWorkflow()` hardcoded the role names `editor`, `publisher`, and `admin`, so a project whose roles are named differently (e.g. `writer`, `managing-editor`) got no capabilities and couldn't move documents through the flow.

  `definePublishingWorkflow({ editors, publishers })` builds the same `draft → in review → published` workflow but maps _your_ role values onto its two capability tiers — `editors` may edit and submit, `publishers` may also publish and unpublish. `publishingWorkflow()` is now a shorthand for `definePublishingWorkflow()` with the conventional defaults, so existing usage is unchanged.

  ```ts
  workflow: definePublishingWorkflow({
    editors: ["writer"],
    publishers: ["managing-editor", "admin"],
  });
  ``` (`@dyrected/knowledge`)

---

## v0.2.13

- Admin: brand accent color, wired page metadata, and list export

  - Add `admin.branding.accentColor` — a second brand color for links, navigation accents, and focus rings (mapped to the `--intelligence` token) alongside `primaryColor`. Branding colors now also apply correctly in dark mode.
  - Wire `admin.meta.titleSuffix` into the browser tab title (it now reflects the current page and updates on navigation) and `admin.branding.favicon` into the page favicon. Both restore the host page's title/icon when the embedded admin unmounts.
  - Add an **Export Selected** bulk action on collection lists (export just the selected rows to CSV), and quote/escape CSV export values per RFC 4180 so values containing commas, quotes, or newlines no longer break columns.

  **Breaking (shipped as patch):** removed the no-op `basename` prop from `AdminUIProps` and the `@dyrected/vue` / `@dyrected/nuxt` wrappers, and stopped the CLI from scaffolding it. The admin routes internally with a hash router, so the panel's location is determined by the route of the page you render it in. If your app passes `basename`, remove it — it had no effect. (`@dyrected/knowledge`)

---

## v0.2.12

- Improve dynamic select options, frontend rendering components, and field ergonomics.

  - **Server-side search for dynamic `select`/`multiSelect` options.** The Admin now forwards the editor's typed query to the options resolver as `req.query.search` (debounced) and renders whatever the resolver returns, instead of loading the entire list into the browser and filtering client-side. Push the filter into your query (`where: { name: { contains: search } }`, capped `limit`) so large and growing lists stay fast. Previously-typed results are kept visible while the next page loads.
  - **Cached option resolvers.** `options` objects that set `cacheTTL` (seconds) are now actually cached on the server, keyed by field, query parameters, and requesting user, and reused until the TTL elapses. The value was previously accepted but ignored.
  - **`DyrectedRichText` component** added to `@dyrected/react` and `@dyrected/vue`, re-exported from `@dyrected/next`, and auto-imported in `@dyrected/nuxt`. It renders the HTML string a `richText` field stores.
  - **`DyrectedIcon` is now re-exported from `@dyrected/next`** — Next.js apps no longer need to import it from `@dyrected/react`.
  - **Nuxt renders images with `<NuxtImg>`.** `DyrectedImage` is now registered as an auto-imported component, and both it and the image branch of `DyrectedMedia` use `@nuxt/image`, which the module installs automatically.
  - **`RichTextField` now types its value as `string`** (an HTML string) rather than `Record<string, unknown>`, matching what the editor stores.
  - **`UrlField` value type widened** to `string | UrlLinkValue` to reflect the structured link object it returns.
  - **Number fields accept advisory `min`/`max`**, surfaced to editors and client tooling (not enforced as server-side validation), mirroring `maxLength`.
  - **`defineTab` helper** groups a set of fields under a shared Admin tab label.
  - **Auth collections re-assert `email`/`password` integrity.** A developer-defined `email` field can no longer silently drop the injected `unique`/`required` constraints.
  - **Relationship read depth defaults to `1`** across the REST controllers, matching the SDK.
  - Field type reference contracts now carry per-type descriptions, and the `checkbox`/`group`/`upload`/`radio-group` field docs pages were renamed to `boolean`/`object`/`image`/`radio` to match their helper names. (`@dyrected/knowledge`)

---

## v0.2.11

- Add type-safe field builder helpers and related updates.

  - Add `defineField`, `defineBlock`, and a dedicated `define<Type>Field` helper for every field type (`defineTextField`, `defineRichTextField`, `defineRelationshipField`, …) to `@dyrected/core`. Each is an identity helper that injects the field `type` and preserves full document-shape inference through `defineCollection`/`defineGlobal`.
  - Add configurable `features` and `headingLevels` to rich-text fields. The Admin rich-text editor now enables only the configured toolbar controls and editor capabilities (disabling a feature also removes its keyboard shortcut and paste handling).
  - Migrate documentation examples, the `dyrected init` scaffold, and the `@dyrected/knowledge` recipes and prompt templates to use the new `define*Field` helpers.
  - Rename the `JWT_SECRET` environment variable to `DYRECTED_JWT_SECRET` — update your `.env` accordingly.
  - Filter unpublished documents out of public read responses. (`@dyrected/knowledge`)

---

## v0.2.10

- Document block variants and expand the generated field reference. Adds `Block`/`BlockVariant` guidance (presentation variants, switching behaviour, defaults, admin/preview) and generates the full field-type contract set — `TypedField`, `FieldBase`, every per-type field alias, the admin option types, and the dynamic-options and character/word-limit config types — into the knowledge reference. (`@dyrected/knowledge`)

---

## v0.2.9

- AI knowledge for generating new Dyrected sites, not only migrating existing ones.
  - New content-modeling rules: greenfield site generation, content coherence, deterministic seed relationships, initial-data seeding mechanics (globals seed on any read; collections seed only on an unfiltered list read), the icon field, config authoring (keep block/field arrays inline to preserve literal types; module splitting), and adapter/deployment-target selection (file SQLite and local storage are not serverless-safe).
  - New frontend-integration rules: link/URL field resolution, site chrome via globals with safe fallbacks, and live preview / click-to-edit.
  - New `generate-site.md` template: a staged, plain-language, greenfield counterpart to `generate-cms.md`, wired through the generator and exported as `GENERATE_SITE_PROMPT`.
  - Every new rule section links to the relevant docs page, and each rule instructs the assistant technically while forbidding technical language in replies to the user. (`@dyrected/knowledge`)

---

## v0.2.8

- Add Page Routing Rule for frontend integration guidelines in AI Rules template. (`@dyrected/knowledge`)

---

## v0.2.7

- Update AI templates, generated rules, and re-compile auto-generated markdown documentation files across apps and specs.
  - @dyrected/core@2.5.49 (`@dyrected/knowledge`)

---

## v0.2.6

- Modularize content-modeling and frontend-integration rules into distinct shared source files and update the setup prompts. (`@dyrected/knowledge`)

---

## v0.2.5

- Add llms.txt index URL to generate-cms prompt so the AI fetches the full documentation index before navigating individual pages (`@dyrected/knowledge`)

---

## v0.2.4

- Expose the generated CMS setup prompt as `GENERATE_CMS_PROMPT`. (`@dyrected/knowledge`)

---

## v0.2.3

- feat(admin): fix admin panel type safety, lint warnings, and external auth flow integration

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
     - Synchronized knowledge base inventories (`packages/knowledge/generated/*`) and LLM mappings to index new API parameters. (`@dyrected/knowledge`)

---

## v0.2.2

- fix docs and global seeding (`@dyrected/knowledge`)

---

## v0.2.1

- feat: add customizable field widths to collection edit layouts and unify list page view settings
  - Added customizable field widths (25%, 33%, 50%, 66%, 75%, 100%) to edit forms, enabling side-by-side field positioning.
  - Expanded the layout preferences API and SDK client to handle generic LayoutItem objects (`Array<{ name: string; width?: string }>`).
  - Consolidated the list view mode selector and column configure popovers into a unified "View Settings" panel.
  - Enabled column visibility toggles (checklists) directly inside the new unified view settings popover, syncing visible columns with the data table. (`@dyrected/knowledge`)

---

## v0.2.0

- @dyrected/knowledge — minor

  Add @dyrected/knowledge package: compiled recipe library with behavioral tests, intent-indexed search, and a content generator that produces hybrid documentation pages (authored prose + generated TypeScript contracts in marked regions). Includes auto-slug, cross-field validation, dependent dropdown, owner-scoped access, role-based access, editorial workflow, page builder, upload collection, relationship/join, safe field rename, and conditional admin field recipes.

  @dyrected/core — patch

  Expand public type exports (CollectionConfig, GlobalConfig, Field, UploadConfig, workflow types) and extend the OpenAPI generator to include all auth, workflow, schema, and dynamic-option routes.

  @dyrected/sdk — patch

  Remove internal setup-prompt utility (superseded by CLI). Expand public API surface with fluent collection/global builders, authentication helpers, and complete TypeScript generics.

  dyrected — minor

  Add generate-ai-rules command. Extend init with framework/adapter detection. Add type generator and config templates.

  @dyrected/db-postgres, @dyrected/db-mongodb — patch

  Align adapter implementations with updated DatabaseAdapter contract (transactions, typed return shapes, ReadonlyDatabaseAdapter).

  @dyrected/docs — patch

  Rewrite reference, adapter, recipe, and guide pages as hybrid documents: authored mental models and examples preserved, TypeScript contracts generated into marked regions. Fix MDX region markers from HTML comments to JSX comments ({/\* \*/}) so fumadocs can compile them. Add check-contract.mjs validation: required heading manifests, authored word-count floor, and marker integrity checks.

  skills/dyrected — patch

  Restore full SKILL.md with schema migration procedure, access-control principles, intent-to-pattern table, and generated field/recipe inventories. (`@dyrected/knowledge`)

---

## v0.1.17

- feat: add enterprise guide and implement table auto-initialization with improved admin authentication checks (`@dyrected/docs`)

---

## v0.1.16

- feat(admin): fix admin panel type safety, lint warnings, and external auth flow integration

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
     - Synchronized knowledge base inventories (`packages/knowledge/generated/*`) and LLM mappings to index new API parameters. (`@dyrected/docs`)

---

## v0.1.15

- fix docs and global seeding (`@dyrected/docs`)

---

## v0.1.14

- feat: add customizable field widths to collection edit layouts and unify list page view settings
  - Added customizable field widths (25%, 33%, 50%, 66%, 75%, 100%) to edit forms, enabling side-by-side field positioning.
  - Expanded the layout preferences API and SDK client to handle generic LayoutItem objects (`Array<{ name: string; width?: string }>`).
  - Consolidated the list view mode selector and column configure popovers into a unified "View Settings" panel.
  - Enabled column visibility toggles (checklists) directly inside the new unified view settings popover, syncing visible columns with the data table. (`@dyrected/docs`)

---

## v0.1.13

- @dyrected/knowledge — minor

  Add @dyrected/knowledge package: compiled recipe library with behavioral tests, intent-indexed search, and a content generator that produces hybrid documentation pages (authored prose + generated TypeScript contracts in marked regions). Includes auto-slug, cross-field validation, dependent dropdown, owner-scoped access, role-based access, editorial workflow, page builder, upload collection, relationship/join, safe field rename, and conditional admin field recipes.

  @dyrected/core — patch

  Expand public type exports (CollectionConfig, GlobalConfig, Field, UploadConfig, workflow types) and extend the OpenAPI generator to include all auth, workflow, schema, and dynamic-option routes.

  @dyrected/sdk — patch

  Remove internal setup-prompt utility (superseded by CLI). Expand public API surface with fluent collection/global builders, authentication helpers, and complete TypeScript generics.

  dyrected — minor

  Add generate-ai-rules command. Extend init with framework/adapter detection. Add type generator and config templates.

  @dyrected/db-postgres, @dyrected/db-mongodb — patch

  Align adapter implementations with updated DatabaseAdapter contract (transactions, typed return shapes, ReadonlyDatabaseAdapter).

  @dyrected/docs — patch

  Rewrite reference, adapter, recipe, and guide pages as hybrid documents: authored mental models and examples preserved, TypeScript contracts generated into marked regions. Fix MDX region markers from HTML comments to JSX comments ({/\* \*/}) so fumadocs can compile them. Add check-contract.mjs validation: required heading manifests, authored word-count floor, and marker integrity checks.

  skills/dyrected — patch

  Restore full SKILL.md with schema migration procedure, access-control principles, intent-to-pattern table, and generated field/recipe inventories. (`@dyrected/docs`)

---

## v0.1.12

- feat: add workflow reference generation scripts, improve admin documentation, and implement dashboard testing utilities (`@dyrected/docs`)

---

## v0.1.11

- ### ✨ Features & Refactors
  - **Admin UI Customization**: Implemented the Admin UI component slot injection system along with Vue bridging support, allowing developers to inject custom components natively into the dashboard and lists.
  - **Onboarding & Setup**: Replaced prompt generation with an external guided setup flow, and added a new email template service.
  - **UI Refresh**: Updated admin CSS variables and layout container styling for improved aesthetics.

  ### 📚 Documentation
  - **Structural Changes**: Migrated feature documentation into dedicated guides.
  - **Cloud Rebrand**: Updated app dashboard documentation and references to point to the new `cloud.dyrected.com` domain.
  - **General Polish**: Expanded and updated documentation across multiple files (including fixing the YAML parser bugs in the new markdown format). (`@dyrected/docs`)

---

## v0.1.10

- **Add universal sort parsing, admin CSS isolation, initial token support, and updated branding theme**
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
    - Lighter lime background styling (`@dyrected/docs`)

---

## v0.1.9

- feat: add custom field component support, field-level error boundaries, and fix React instance mismatch in Vue bridge (`@dyrected/docs`)

---

## v0.1.8

- refactor: type MediaPicker preview function with Media interface (`@dyrected/docs`)

---

## v0.1.7

- - **URL Field Evolution**: Implemented a modern dual-mode URL Field component featuring a direct toggle between external links and a dynamic internal page/document selector (complete with direct database slug binding and custom label fields).
  - **Global Settings Configuration**: Added native Global Configuration support, with robust schema validation, configuration normalization, hydration mechanisms, and full type safety across standard field components.
  - **Form Engine & Block Builder Revamp**:
    - Re-architected the Block Builder with interactive, collapsible block layout items, custom drag-and-drop sort handlers, and automatic field-value summary crawling for collapsed block previews.
    - Replaced the simple dropdown block selector with a visual center-aligned **Block Library Dialog Modal** featuring soft-indicator layer graphics.
    - Standardized external save triggers (header Save button & `⌘S` shortcut) using native HTML5 `form` attributes to bind seamlessly with the Hook Form submit engine.
    - Enlarged block titles and integrated center-aligned dashed "Add Block" buttons directly under the block lists for optimized edit flow. (`@dyrected/docs`)

---

## v0.1.6

- # Dyrected CMS 10 Bugs Completed Resolution

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

  - **Result:** **32/32 tests passed successfully!** (`@dyrected/docs`)

---

## v0.1.5

- Updated the CLI DX (`@dyrected/docs`)

- @dyrected/admin@2.5.51 (`example-creator-next`)

- @dyrected/core@2.5.51 (`example-creator-next`)

- @dyrected/next@2.5.51 (`example-creator-next`)

- @dyrected/react@2.5.51 (`example-creator-next`)

- @dyrected/sdk@2.5.51 (`example-creator-next`)

---

## v0.1.4

- improve Nuxt server request URL handling (`@dyrected/docs`)

---

## v0.1.3

- fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK (`@dyrected/docs`)

---

## v0.1.2

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt. (`@dyrected/docs`)

---

## v0.1.1

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture. (`@dyrected/docs`)

---

## v0.1.19 — Operational Views (unreleased)

- **New section `model-content/operational-views`** — `overview`, `define-view`, `ux-guidelines`, `layouts/{table,kanban,calendar,cards,spreadsheet}`, `actions`, `metrics`, `routing-and-preferences`. (`@dyrected/docs`)

- **Phase 2 layouts** — table (tablecn/TanStack), kanban (@dnd-kit `groupBy` + `moveMode`), calendar (ReUI event-calendar `dateField` + `resourceField`), cards (gallery), spreadsheet (inline grid) with mermaid wireframes. (`@dyrected/docs`)

- **Actions + Metrics** — `defineAction` (row/bulk/header, `mutation` vs `handler`, `confirm`/`fields`), `ViewMetric` (`aggregate`/`aggregates` + `transform`/`expression`, `format`/`currency`, `subMetrics`). (`@dyrected/docs`)

- **Routing & preferences** — `CollectionRoute` now renders `OperationalViewPage` (synthesized `list` for collections without `views`), `layout:collections:*` canonical keys with legacy `view-*: ` fallback, `?where`/`?search` shim, slot aliasing `beforeList → beforeViewHeader`. (`@dyrected/docs`)

- **SDK** — new `deliver-content/sdk-api/run-action.mdx` (`client.collection(slug).runAction(viewSlug, actionName, { id/ids/input })` → `POST /api/collections/:collection/views/:viewSlug/actions/:action`). (`@dyrected/docs`)

- **Collection config** — short `## Operational views` intro in `model-content/configuration/collections.mdx` linking to overview. (`@dyrected/docs`)

- **Editor experience** — `list-view`, `spreadsheet-view`, `custom-components/list-view` updated for view aliases and first-class `spreadsheet` layout. (`@dyrected/docs`)

- **Knowledge patch** — `packages/knowledge/scripts/generate.mjs` now extracts `views.ts` + `aggregate.ts` (`ViewConfig`/`ActionConfig`/`ViewLayout`/`defineView`/`defineAction`/`AggregateOperation`). (`@dyrected/docs`)

- Updated `model-content/operational-views/meta.json` nav, `deliver-content/sdk-api/meta.json` (+ `run-action`). (`@dyrected/docs`)

- `pnpm --filter @dyrected/docs build` verified (376 pages, mermaid OK). (`@dyrected/docs`)
