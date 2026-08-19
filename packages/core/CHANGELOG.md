# @dyrected/core

## 2.8.3

### Patch Changes

- - **Lazy Database Connections**: Removed eager initialization in constructors for `@dyrected/db-postgres`, `@dyrected/db-mysql`, and `@dyrected/db-mongodb`. Network sockets, connection pools, and database creation queries are now deferred until the first actual query or explicit lifecycle call, preventing hanging sockets and timers when loading `dyrected.config.ts` during static builds (`nuxt build`, `next build`, type-generation, or CI pipelines).
  - **Graceful Disconnect & Teardown**: Added `disconnect(): Promise<void>` to `DatabaseAdapter` interface across all database adapters (`@dyrected/db-postgres`, `@dyrected/db-mysql`, `@dyrected/db-mongodb`, `@dyrected/db-sqlite`) and exported `closeAllPostgresClients()` from `@dyrected/db-postgres`.
  - **Nuxt Lifecycle Teardown**: Added a `close` hook in `@dyrected/nuxt` to automatically call `disconnect()` on active database adapters and flush cached client connection pools when Nuxt finishes building or shuts down.

## 2.8.2

### Patch Changes

- Enhance Detail Views with inline editing, custom component resolution, and dynamic presentation options:

  - **Custom Component Resolution**: Resolve custom Detail View components directly from runtime `DyrectedContext` and `<DyrectedAdmin :components="..." />` in Vue/Nuxt and React/Next.js.
  - **Inline Field Editing**: Support `editable: true` on `displayField()` with interactive inputs, immediate SDK mutations, and save/cancel micro-interactions.
  - **Dynamic Badge Presentation**: Support `badgeColors` with named palettes, hex codes, Tailwind classes, and wildcards on `displayField` and `displaySection`.
  - **Media Previews**: Render uploads and media relationships seamlessly in Detail Views using `DyrectedMedia` with aspect ratio, alignment, and object-fit constraints.
  - **Adjacent Record Stepper**: Add header and footer stepper controls to navigate smoothly between previous and next records in the active collection.
  - **JEXL Visibility Context**: Pass full document properties to visibility evaluation context for robust conditional rendering.

## 2.8.1

### Patch Changes

- 38548a4: - **Detail View Inline Editing (`editable: true`)**: Added interactive inline editing directly within the Detail View screen. Editors can toggle simple fields (such as internal notes, tags, status choices, quantities, and dates) into editable form inputs with single-click save and cancel controls, updating records immediately via the client SDK without navigating away from the detail screen.
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
  - **Comprehensive Detail Reference & Type Definitions**: Added complete JSDoc annotations and automated contract generation in `@dyrected/knowledge` for all 9 Detail View helper functions (`displayField`, `displaySection`, `displayTabs`, `displayTab`, `displayGrid`, `displayRepeat`, `displayComputed`, `displayText`, `displayDivider`, `displayCustom`) and their configuration options.

## 2.8.0

### Minor Changes

- ### Added
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

## 2.7.1

### Patch Changes

- 93b38db: - Scoped split-pane edit page width calculation exclusively to desktop screen breakpoints, preventing form compression on mobile viewports
  - Replaced zero-based index array warnings with human-readable collection and field slug names in CLI `sync:schema` outputs
  - Added direct documentation links to CLI schema sync warning messages and core config validation outputs
  - Added comprehensive built-in Jexl helper utility functions (`slugify`, `lower`, `upper`, `trim`, `capitalize`, `truncate`, `readingTime`, `wordCount`, `replace`, `startsWith`, `endsWith`, `now`, `today`, `formatDate`, `addDays`, `diffDays`, `isPast`, `isFuture`, `includes`, `join`, `first`, `last`, `compact`, `unique`, `length`, `round`, `clamp`, `default`, `coalesce`, `isEmpty`, `get`) across `@dyrected/core`, `@dyrected/admin`, and CLI declarative validation
- - Isolated server observability and logger runtime dependencies under `@dyrected/core/server` to prevent Node core modules (`fs`, `worker_threads`, `stream`) and Pino from leaking into frontend client bundles.
  - Added browser fallback module configurations for Next.js (`withDyrected`) and Nuxt module Vite build hooks to ensure clean client component compilation across Turbopack and Vite.

## 2.7.0

## 2.6.4

### Patch Changes

- be3da3f: Improve admin safety and auth onboarding across admin, core, and SDK.

  - add a professional invite dialog in admin with copyable invite URLs and role selection for new invites
  - support invite acceptance directly from admin invite links
  - pre-create pending invited users in auth collections so they appear in admin lists before acceptance
  - let invite and reset emails use clickable URLs with stronger email-client-safe HTML and visible link fallbacks
  - expand dashboard "Needs attention" checks with backend health and invite-related signals
  - replace browser delete alerts with admin dialogs, including typed confirmation before deleting auth users

- b84943e: Add Cloud-safe declarative hooks, broader declarative-expression validation, and clearer config diagnostics across core, admin, Nuxt, SDK, and CLI.

  - add declarative string hook support for collection/global `beforeRead`, `afterRead`, and `beforeChange`, field `beforeChange`, and field `admin.hooks.onChange`
  - preserve supported declarative hook strings during `sync:schema`, strip function hooks from Cloud payloads intentionally, and warn with exact schema paths
  - validate declarative access rules, string access policies, declarative hooks, `admin.condition`, and `admin.previewUrl` early with exact config paths and cleaner diagnostics
  - expose config diagnostics from `/api/schemas` so admin surfaces can consume them, and improve admin dashboard attention signals around config issues
  - improve Nuxt startup and reload reporting for invalid declarative config with formatted diagnostics instead of noisy raw errors
  - document the Cloud-safe access and hooks model more clearly, including synced string policies, `createdByCurrentUser` vs `isOwner`, declarative hook contexts, and short notes about early validation for access, hooks, preview, and `admin.condition`

## 2.6.3

## 2.6.2

## 2.6.1

### Patch Changes

- b011a89: Improve workflow editing UX in the Admin for workflow-enabled and `drafts: true` collections. Editors now get faster transition actions in the entry header and list view, clearer live-vs-draft status messaging, desktop labels for header action buttons, and a manual "save draft" fallback alongside workflow transitions.

  Add workflow-aware draft autosave config to collection admin options with `admin.autosave` and `admin.autosaveDelayMs`. Workflow-enabled collections now default to autosaving draft revisions without changing the published snapshot, while projects can still disable autosave per collection when they need explicit manual saves.

## 2.6.0

### Minor Changes

- 42f007b: Add typed collection search config and backend-powered admin search across core, admin, and SDK.

  Improve admin document titles and list cell rendering for relationship, object, and array values, including nested relation title chains and nested field `admin.useAsTitle`.

  Add join-field admin actions to show or hide `Create new` and `View all`, with `View all` opening the related collection list pre-filtered by the join relationship.

## 2.5.65

### Patch Changes

- 812fef0: - Keep the edit-form change-password section inside the default tab when a collection has multiple tabs.
  - Populate nested join fields when the requested depth budget allows it, while leaving them unpopulated when depth is exhausted.
  - Reuse a shared Postgres client per connection URL so repeated adapter construction in dev servers does not exhaust database connections.

## 2.5.64

## 2.5.63

### Patch Changes

- 42f92d0: Fix workflow and draft handling across the admin UI and core collection APIs.

  - stop showing the admin publishing status column for collections that only define a user `status` field
  - show workflow state labels and colors consistently in admin list and edit views
  - return published workflow documents correctly in public reads, including legacy entries without a materialized published snapshot
  - materialize workflow metadata on update responses so the admin can keep draft and transition state in sync
  - improve the example auth roles setup and docs so custom auth `roles` fields use the expected array-backed shape

## 2.5.62

### Patch Changes

- a1b867e: Add built-in API rate limiting, proxy-aware client IP resolution, and revocable auth sessions

  Dyrected auth and request protection were missing three production layers that Payload already treats as part of the core server contract: app-level request throttling, correct client-IP handling behind proxies, and a way to revoke JWT sessions immediately instead of waiting for expiry.

  `createDyrectedApp` now mounts an in-process API rate limiter with Payload-style defaults for `/api` routes, including configurable `max`, `window`, `paths`, `skip`, and `trustProxy` options. Client IP resolution now understands common provider headers and trusted `X-Forwarded-For` chains so production deployments behind a reverse proxy count the right caller instead of the proxy hop.

  Auth collections also move from purely stateless login tokens to JWTs backed by hidden `__auth_sessions` records. New tokens carry a session id, auth middleware validates that the backing session is still active, logout can revoke the current session immediately, `?allSessions=true` can revoke every session for the account, and password reset / password change now invalidate active sessions as a security boundary. Refreshing a token keeps the same underlying session instead of creating a second one silently.

  The docs and OpenAPI surface were updated to match the new behavior, especially around built-in rate limiting, trusted proxy setup, logout semantics, and session revocation.

- 16592a3: Point package-distributed documentation references at the canonical `/docs` tree

  The docs site no longer maintains a separate `/new-docs` content tree and route. The new authored docs set now lives directly under the canonical `/docs` path, and the knowledge generator, published references, and package JSDoc links were updated to match.

  For `@dyrected/core`, this updates JSDoc `@see` links so generated API references and editor tooling point at the current docs URLs instead of the removed `/new-docs` paths.

  For `@dyrected/knowledge`, this refreshes generated references, prompt artifacts, LLM indexes, and skill outputs so published knowledge bundles link to the canonical docs paths and no longer depend on removed legacy recipe/reference pages.

- ee0e566: Add `definePublishingWorkflow` to map your own role names onto the publishing workflow

  `publishingWorkflow()` hardcoded the role names `editor`, `publisher`, and `admin`, so a project whose roles are named differently (e.g. `writer`, `managing-editor`) got no capabilities and couldn't move documents through the flow.

  `definePublishingWorkflow({ editors, publishers })` builds the same `draft → in review → published` workflow but maps _your_ role values onto its two capability tiers — `editors` may edit and submit, `publishers` may also publish and unpublish. `publishingWorkflow()` is now a shorthand for `definePublishingWorkflow()` with the conventional defaults, so existing usage is unchanged.

  ```ts
  workflow: definePublishingWorkflow({
    editors: ["writer"],
    publishers: ["managing-editor", "admin"],
  });
  ```

- ee0e566: Fix `drafts: true` documents disappearing from the Admin list

  The publishing workflow synthesized from `drafts: true` (`simplePublishingWorkflow`) defined no role→capability mappings, so `canViewWorkflowDraft` returned `false` for everyone — including admins and editors. Every draft document was then filtered out of collection reads, leaving the Admin list empty.

  `canViewWorkflowDraft` now treats a workflow with no `roles` (the `drafts: true` case) as ungated: any **authenticated** user can view drafts, so they show up in the Admin regardless of what a project names its roles. Unauthenticated/public readers still only ever see published content, so drafts never leak to the live site. Workflows that define explicit `roles` keep their existing capability-based gating.

- b3cccd2: Add Payload-style logger config and first-class observability to Dyrected core

  Dyrected now supports a root `logger` config shaped like Payload's Pino-based logger surface, plus a new top-level `observability` config for request logging, redaction, sampling, tracing, metrics, and Dyrected-managed transports.

  Request logging is now structured instead of ad hoc string output. Successful requests are sampled, `4xx` requests log at `warn`, `5xx` requests log at `error`, and request ids, site/workspace ids, and trace correlation fields are included when available.

  Body logging is opt-in and bounded. Dyrected only attempts to capture JSON request bodies, redacts common secret fields and headers before logging, truncates oversized payloads, and falls back to metadata-only logging when a body cannot be parsed safely after capture.

  Core services and request paths now use structured logger helpers instead of direct `console.*` calls. This includes auth, audit-failure reporting, email delivery failures, router warnings, workflow hook isolation, and request error handling.

  OpenTelemetry tracing and metrics are now available behind explicit config. Dyrected can create request spans, emit request and failure metrics, export telemetry through OTLP, and expose a Prometheus scrape route only when configured. Audit logging remains a separate feature and is not merged with runtime observability.

## 2.5.61

### Patch Changes

- b4a06ff: Admin: brand accent color, wired page metadata, and list export

  - Add `admin.branding.accentColor` — a second brand color for links, navigation accents, and focus rings (mapped to the `--intelligence` token) alongside `primaryColor`. Branding colors now also apply correctly in dark mode.
  - Wire `admin.meta.titleSuffix` into the browser tab title (it now reflects the current page and updates on navigation) and `admin.branding.favicon` into the page favicon. Both restore the host page's title/icon when the embedded admin unmounts.
  - Add an **Export Selected** bulk action on collection lists (export just the selected rows to CSV), and quote/escape CSV export values per RFC 4180 so values containing commas, quotes, or newlines no longer break columns.

  **Breaking (shipped as patch):** removed the no-op `basename` prop from `AdminUIProps` and the `@dyrected/vue` / `@dyrected/nuxt` wrappers, and stopped the CLI from scaffolding it. The admin routes internally with a hash router, so the panel's location is determined by the route of the page you render it in. If your app passes `basename`, remove it — it had no effect.

- b9b900b: Fix audit log and drafts/workflow panels not appearing in the Admin

  Three related fixes so `audit: true` and `drafts: true` surface their Admin UI as intended:

  - **Audit log button never showed.** The `/api/schemas` response hand-serialized each collection and omitted the `audit` and `drafts` flags, so the Admin's `schema.audit` was always `undefined` and the audit-history button never rendered regardless of config. Both flags are now included in the serialized schema.
  - **Workflow/version panel hidden for existing documents.** Setting `drafts: true` synthesizes a publishing workflow via `normalizeConfig`, but the panel only appears when a document carries `__workflow` metadata — which documents created before the workflow existed (e.g. seeded content) don't have. `materializeWorkflowDocument` now treats such legacy documents as already-published live content: it surfaces them with the workflow's published state (keeping them visible to the public) so the workflow panel appears. New documents are unaffected.
  - **Live/Draft badge missing on workflow collections.** The header publishing badge only rendered for collections without a workflow, and read the raw `status` field. It now derives from the workflow state when a workflow is present (a state flagged `published` shows "Live", otherwise "Draft"), so collections using `drafts: true` — including ones with no `status` field — show the correct badge.

- b9b900b: Server-side (token) live preview now works end to end

  `previewMode: "token"` was previously a config value with backend endpoints but no admin integration. It's now wired up for server-rendered and statically generated frontends that can't receive `postMessage`.

  - `@dyrected/admin`: in `token` mode the live-preview pane mints a short-lived token from the current draft (debounced) and loads the frontend iframe at `previewUrl?dyPreview=<token>`, reloading on change. Click-to-edit and live-as-you-type remain `postMessage`-only.
  - `@dyrected/sdk`: new `createPreviewToken({ collectionSlug, documentId?, data })` to mint a token, plus `getPreviewToken(search)` and `PREVIEW_TOKEN_PARAM` helpers for reading the `dyPreview` token from a request's query string. `@dyrected/react` and `@dyrected/vue` re-export the helpers; `@dyrected/nuxt` auto-imports `getPreviewToken`.
  - `@dyrected/core`: the server now logs a startup warning when `DYRECTED_JWT_SECRET` is unset, since token-mode preview signs with it.

  Token mode is refresh-based (a mint + iframe reload per change) and embeds the draft in the signed token — see the Live Preview → Server-side docs for the security notes (set `DYRECTED_JWT_SECRET`) and the large-document URL-length caveat.

## 2.5.60

### Patch Changes

- 1c13fc0: Improve dynamic select options, frontend rendering components, and field ergonomics.

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

## 2.5.59

### Patch Changes

- 8fe08dc: Fix server-side field access evaluation so field rules receive the current document `id` during API reads and updates, matching admin behavior and preventing `!id`-style rules from silently allowing protected field changes.

  Improve the public access-control type surface by allowing `AccessFunctionArgs`, `AccessFunction`, `AccessRule`, `AccessPolicyResolver`, `DyrectedConfig`, and `defineConfig` to carry a custom authenticated-user type for deployments that extend the default user claims.

  Align the access-control overview docs with runtime behavior by documenting that field access is enforced by both the API and the admin panel.

  I improved dyrected upgrade in packages/cli/src/commands/upgrade.t
  It now:

  - resolves the actual published version for each @dyrected/* package with `npm view <pkg> version`
  - installs explicit versions instead of relying on @latest
  - upgrades dependencies and devDependencies separately
  - uses exact-version installs (--save-exact / --exact)
  - verifies both package.json and node_modules after install
  - fails loudly if the installed result is still stale

## 2.5.58

### Patch Changes

- Add a production-ready access control model that supports booleans, Jexl strings, direct self-hosted functions, and named policies across collections, globals, and field access.

  Introduce top-level `accessPolicies` resolution in core, enforce collection/global/field access on the server, and preserve object-based Jexl filter results for row-level access constraints.

  Make Cloud schema sync safe by stripping function-based access rules from synced payloads, preserving only booleans, Jexl strings, and named policies, with clear warnings for unsupported rules.

  Harden the admin hooks sandbox message listener so it only accepts messages from the expected iframe source.

## 2.5.57

### Patch Changes

- 8e03174: Add type-safe field builder helpers and related updates.

  - Add `defineField`, `defineBlock`, and a dedicated `define<Type>Field` helper for every field type (`defineTextField`, `defineRichTextField`, `defineRelationshipField`, …) to `@dyrected/core`. Each is an identity helper that injects the field `type` and preserves full document-shape inference through `defineCollection`/`defineGlobal`.
  - Add configurable `features` and `headingLevels` to rich-text fields. The Admin rich-text editor now enables only the configured toolbar controls and editor capabilities (disabling a feature also removes its keyboard shortcut and paste handling).
  - Migrate documentation examples, the `dyrected init` scaffold, and the `@dyrected/knowledge` recipes and prompt templates to use the new `define*Field` helpers.
  - Rename the `JWT_SECRET` environment variable to `DYRECTED_JWT_SECRET` — update your `.env` accordingly.
  - Filter unpublished documents out of public read responses.

## 2.5.56

### Patch Changes

- 9cb41d8: Render single-field arrays as a flat, reorderable list instead of accordion cards, with the label shown once and per-row actions (duplicate, move, delete) in an overflow menu. Add a `hideLabel` admin option to suppress a field's label where it would be redundant. Hide the admin's own mobile header when embedded so the host dashboard renders a single top bar, driven via a `dyrected:toggle-menu` window event. Fix the mobile nav drawer closing immediately after opening (the close-on-navigation effect depended on the open state and re-triggered itself); it now closes only when the route changes. Refresh the dashboard update-check cache on a TTL so the banner reflects newly published versions instead of freezing on the first value seen.

## 2.5.55

## 2.5.54

## 2.5.53

### Patch Changes

- 8e391a5: Expose the field-type contracts as public types. `Block`, `BlockVariant`, `TypedField`, `FieldBase`, the per-field admin option types (`BaseFieldAdmin`, `TextFieldAdmin`, `TextareaFieldAdmin`, `EmailFieldAdmin`, `UrlFieldAdmin`, `IconFieldAdmin`, `SelectFieldAdmin`, `RadioFieldAdmin`, `BooleanFieldAdmin`, `MultiSelectFieldAdmin`, `CharacterLimitFieldAdmin`, `WordLimitFieldAdmin`), and the field hook shapes (`FieldHooks`, `FieldAdminHooks`) are now exported from `@dyrected/core`. This lets consumers and generated documentation reference the full field type surface directly. Purely additive — no runtime or existing-type changes.

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

- ea1d99d: Upload MIME/size validation and add-media-from-URL.

  **Core (`@dyrected/core`)**
  - New `upload-validation` utility: `isMimeAllowed` (supports `*`, `type/*`, and exact `type/subtype` patterns, case-insensitive) and payload validation that returns a typed error with the correct HTTP status (`415 Unsupported Media Type` or `413 Payload Too Large`).
  - The media controller enforces a collection's `upload` config (`allowedMimeTypes`, `maxFileSize`) on upload and accepts external media references.

  **Admin (`@dyrected/admin`)**
  - Add media from a URL: `external-media` builder + `useAddMediaFromUrl` hook detect YouTube/Vimeo videos, direct image URLs, and generic files, and store them as reference-only media records (no file bytes). The media grid and preview components key off the resulting `mimeType` (`video/youtube`, `video/vimeo`, `image/external`, …) to render each asset correctly.
  - Media picker, media card, media library dialog, and media page updated to support external media and surface upload validation errors.

  **SDK (`@dyrected/sdk`)**
  - Support for external media references and upload validation feedback.

## 2.5.51

## 2.5.50

### Patch Changes

- 08b7839: Resolve preview domain dynamically using schemas siteUrl, prefix/strip url field domains using siteUrl origin, and update block builder library dialog with scrollable 3-column desktop layout.

## 2.5.49

## 2.5.48

### Patch Changes

- 7cdfb01: Improve cloud admin auth collection resolution and delegated membership handling
  - Prefer the `__admins` collection for admin auth when present, then fall back to the configured `adminAuth.collectionSlug`, then the first auth collection
  - Return the resolved admin auth collection slug in public admin auth config so the admin UI and server agree on the active auth collection
  - Pass a normalized hook request context to delegated provider membership handlers so cloud-backed user management hooks can safely read query params and request headers
  - Preserve multipart upload behavior in the SDK by letting fetch set the multipart boundary automatically

## 2.5.47

## 2.5.46

## 2.5.45

### Patch Changes

- e94ec78: feat: add enterprise guide and implement table auto-initialization with improved admin authentication checks

## 2.5.44

### Patch Changes

- Add provider membership hooks type definitions and collection controller delegation logic to redirect authentication collection CRUD requests.

## 2.5.43

### Patch Changes

- feat: add support for external authentication provider exchange and update Node.js requirement to 22+

## 2.5.42

### Patch Changes

- afa1ae0: feat: enable dynamic site admin authentication by supporting schema-derived config in the auth controller

  refactor: modularize type definitions by extracting schemas, access, adapters, and configuration interfaces into separate files

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

## 2.5.40

### Patch Changes

- d5aa016: fix docs and global seeding

## 2.5.39

## 2.5.38

## 2.5.37

### Patch Changes

- 0b13e96: feat: add customizable field widths to collection edit layouts and unify list page view settings
  - Added customizable field widths (25%, 33%, 50%, 66%, 75%, 100%) to edit forms, enabling side-by-side field positioning.
  - Expanded the layout preferences API and SDK client to handle generic LayoutItem objects (`Array<{ name: string; width?: string }>`).
  - Consolidated the list view mode selector and column configure popovers into a unified "View Settings" panel.
  - Enabled column visibility toggles (checklists) directly inside the new unified view settings popover, syncing visible columns with the data table.

## 2.5.36

## 2.5.35

## 2.5.34

## 2.5.33

## 2.5.32

### Patch Changes

- 9fcf1e2: @dyrected/knowledge — minor

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

## 2.5.31

### Patch Changes

- fa1ad68: feat: add workflow reference generation scripts, improve admin documentation, and implement dashboard testing utilities

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

## 2.5.29

- Add type-safe Lucide `admin.icon` configuration for collection and global sidebar navigation.

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

## 2.5.27

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

## 2.5.24

## 2.5.23

### Patch Changes

- feat: add custom field component support, field-level error boundaries, and fix React instance mismatch in Vue bridge

## 2.5.22

## 2.5.21

## 2.5.20

## 2.5.19

## 2.5.18

### Patch Changes

- 09d6e92: Minor improvements
  - move Admin UI to @dyrected/react, add DyrectedMedia components, and introduce withDyrected Next.js config for dependency resolution.
  - consolidate React components in @dyrected/react, re-export from @dyrected/next, and add Next.js config wrapper
  - remove restrictive vertical scroll constraints across block builder, edit page, and media components
  - add password reset flow with token handling and UI views
  - add time picker field and image cropping functionality to media picker
  - enable image cropping, add clipboard file paste to media manager, and add support for date range pickers.

## 2.5.17

### Patch Changes

- bd0d9a3: feat: document hook isolation behaviors, add clear button to multi-select, and optimize JEXL condition/access evaluation with memoized compilation.

## 2.5.16

### Patch Changes

- 414b005: - feat: add generic typing to defineCollection and defineGlobal, introduce HookRequestContext, and enhance DynamicOptions interfaces.
  - feat: implement automatic document shape inference for collection and global definitions via field array analysis
  - feat: enhance rich text editor link management, add time support to date picker, and update radio field props
  - feat: add table support to rich text editor, introduce datetime field type, and improve form engine type safety.

## 2.5.15

### Patch Changes

- 356a7a5: feat: implement recursive lifecycle hooks system with collection/field level execution and admin sandbox support
  refactor: implement flexible grid-based form layout with radio field support and make selecet and multiselect filed searchable

## 2.5.14

## 2.5.13

### Patch Changes

- 2961a9d: - Implement secure password field support (hashing, validation, and UI input form handling) and a password update endpoint.
  - Implement configuration cache invalidation for hot-reloading.
  - Add collection schema support for labels, simplify server handler config resolution, and add a Nuxt dynamic pages setup guide.

## 2.5.12

### Patch Changes

- admin
  • Introduced character‑count UI for fields with maxLength.
  • Refactored field components to improve placeholder handling and default values.

  nuxt
  • Fixed SSR data‑fetching and dynamic‑route rendering bugs.
  • Added hot‑reloading support for configuration files.

## 2.5.11

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

## 2.5.9

### Patch Changes

- a8fa0b7: refactor: normalize logical operators to uppercase in parser and media-picker query

## 2.5.8

### Patch Changes

- refactor: type MediaPicker preview function with Media interface

## 2.5.7

### Patch Changes

- 890c56a: - **URL Field Evolution**: Implemented a modern dual-mode URL Field component featuring a direct toggle between external links and a dynamic internal page/document selector (complete with direct database slug binding and custom label fields).
  - **Global Settings Configuration**: Added native Global Configuration support, with robust schema validation, configuration normalization, hydration mechanisms, and full type safety across standard field components.
  - **Form Engine & Block Builder Revamp**:
    - Re-architected the Block Builder with interactive, collapsible block layout items, custom drag-and-drop sort handlers, and automatic field-value summary crawling for collapsed block previews.
    - Replaced the simple dropdown block selector with a visual center-aligned **Block Library Dialog Modal** featuring soft-indicator layer graphics.
    - Standardized external save triggers (header Save button & `⌘S` shortcut) using native HTML5 `form` attributes to bind seamlessly with the Hook Form submit engine.
    - Enlarged block titles and integrated center-aligned dashed "Add Block" buttons directly under the block lists for optimized edit flow.

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

## 2.5.5

### Patch Changes

- Normalize version to 2.5.5 to align all `@dyrected/*` packages in a fixed release group. All packages now move together on every future release.

## 2.5.2

### Patch Changes

- Updated the CLI DX

## 2.5.1

### Patch Changes

- improve Nuxt server request URL handling

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

## 2.4.1

### Patch Changes

- 5dd7403: fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK

## 2.4.0

### Minor Changes

- Infrastructure standardization, MySQL adapter improvements, and SDK robustness testing.

## 2.3.0

### Minor Changes

- Standardize database infrastructure and implement field promotion.
  - **Field Promotion**: Added 'promoted' option to Collection fields to extract JSON data into native SQL columns for indexing and performance.
  - **Lazy Migrations**: Added 'renameTo' support for seamless field renames without breaking existing data.
  - **Auto-Seeding**: Standardized 'initialData' seeding logic across all adapters.
  - **MySQL Adapter**: New robust MySQL adapter implementation.
  - **Strict Filtering**: Improved query translation parity across all SQL-based adapters.

## 2.1.0

### Minor Changes

- 220818c: ### @dyrected/core
  - **New Discovery Workflow**: Refined the AI setup prompt with a multi-step "Phase 0" discovery process to improve initial project scoping.
  - **Nomenclature Standardization**: Updated all system prompts to use "Nuxt.js" nomenclature and improved schema definition examples.

  ### @dyrected/db-postgres & @dyrected/db-sqlite
  - **Architecture Documentation**: Added source-level documentation explaining the use of raw SQL drivers (postgres.js/better-sqlite3) alongside Drizzle to support dynamic runtime schemas.

  ### @dyrected/admin
  - **Internal Maintenance**: Synchronized internal documentation and field renderer context to support the latest core setup workflows.

## 2.0.0

### Major Changes

- Updated all storage adapters to support `Uint8Array` buffers and file prefixing.
  - **Storage API Update**: The `buffer` parameter in `StorageAdapter.upload` and `resolve` now expects a `Uint8Array` instead of a Node.js `Buffer`. This ensures better compatibility across different JavaScript environments.
  - **File Prefixing**: Added support for an optional `prefix` parameter in `StorageAdapter.upload` to allow organizing files into subfolders or prefixes (supported by Cloudinary, S3, B2, and Local storage).
  - **Alignment**: Standardized `CloudinaryStorageAdapter`, `LocalStorageAdapter`, `S3StorageAdapter`, and `B2StorageAdapter` to strictly follow the `@dyrected/core` interface.

## 1.0.9

### Patch Changes

- d8e1f29: bump package versions and update export conditions for admin package

## 1.0.8

### Patch Changes

- ### Summary of Changes
  - **AI Setup Prompt**: Updated `packages/core/src/utils/setup-prompt.ts` to generate configuration code using class-based instantiation. This ensures that AI assistants helping with project setup will provide the preferred 1.0.x syntax.

## 1.0.7

### Patch Changes

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt.

## 1.0.6

### Patch Changes

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture.

## 1.0.5

### Patch Changes

- Standardize framework integrations for Next.js and Nuxt. Fix CLI generation for Nuxt admin pages to use zero-import architecture and framework-aware env var prefixes.

## 1.0.4

### Patch Changes

- Standardized environment variable handling across Next.js and Nuxt (prioritizing `NEXT_PUBLIC_` and `NUXT_PUBLIC_` prefixes).
  Improved CLI initialization flow by saving AI setup prompts to `dyrected-ai-prompt.md` and refining the framework-specific setup instructions.
  Fixed type emission and dependency exports for `@dyrected/admin` to ensure stable builds in consuming applications.
  Added a drop-in `DyrectedAdmin` component for Next.js.
  Updated documentation with clearer self-hosted and cloud integration steps.

## 1.0.3

### Patch Changes

- Standardized environment variable handling across Next.js and Nuxt integrations.
  - CLI now generates .env templates with framework-specific prefixes (NEXT*PUBLIC* / NUXT*PUBLIC*).
  - Next.js and Nuxt clients automatically resolve these prefixed variables for client-side use.
  - Added a dedicated `@dyrected/next/admin` component for easy dashboard embedding in Next.js.
  - Fixed TypeScript type generation for the Admin UI package.

## 1.0.1

### Patch Changes

- bfc3468: Initial public release of the Dyrected CMS ecosystem.

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
