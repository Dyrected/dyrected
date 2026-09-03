# dyrected

## 2.11.0

### Patch Changes

- 0ecdf5c: - Fix Admin UI session staleness and authentication desynchronization:
  - Add proactive background token refresh timer scheduled 5 minutes before JWT expiration.
  - Refresh token on browser tab `focus` and `visibilitychange` when returning to an open dashboard.
  - Dispatch `dyrected:auth-unauthorized` and support `onAuthError` callback in `@dyrected/sdk` on 401 responses.
  - Automatically attempt token refresh on 401s in Admin UI, falling back to instant login gate transition if session is expired or revoked.
  - Fix user state leak bug in `DyrectedProvider` that prevented logout and login page rendering.
  - Call backend `POST /api/collections/:slug/logout` to revoke server session in `__auth_sessions` during logout.
  - Allow operational view component slots (`afterViewHeader`, `beforeViewHeader`, `beforeViewContent`, `afterViewContent`) to resolve components registered under either `components.collectionView` or `components.collectionList`.
  - Enhance action and confirmation dialogs for mobile and tall content:
    - Render as a mobile bottom-sheet (`max-sm:bottom-0`, slide from bottom, top grab handle) on small viewports.
    - Constrain all fields and custom modal components within the device viewport width (`w-full min-w-0 overflow-x-hidden`).
    - Enable independent vertical scrolling (`overflow-y-auto`) with fixed, docked headers and action footer buttons.
  - Add operational view Refresh button in [ViewHeader](file:///Users/busola/Work/dyrected/packages/admin/src/pages/collections/views/view-header.tsx) and mobile action menu:
    - Refetches both collection/view data and summary metrics in the background.
    - Keeps current datasets and stats on screen while displaying spinning and pulsing refetch indicators.
  - Update back button navigation on document edit and global editor pages to use browser history when available, preserving active operational view filters, sorting, and pagination.
- Updated dependencies [e0246ed]
- Updated dependencies [0ecdf5c]
  - @dyrected/core@2.11.0
  - @dyrected/sdk@2.11.0

## 2.10.1

### Patch Changes

- 558341d: - Support `submitLabel` on operational view actions to customize the modal submit/run button text.
  - Automatically prefill action modal forms with the target document's current field values when executing row actions.
  - Normalize logical operators (`AND`/`and`, `OR`/`or`) case-insensitively in `where-sanitizer`.
  - Apply schema default values on `create()` before persisting to the database.
  - Strictly type operational view filters as `WhereClause | string`.
  - Add thorough JSDoc documentation across all operational view types and interfaces.
  - Add architecture specs for `npx dyrected doctor` diagnostics and multi-adapter automatic field promotion.
- 2720377: - Added type-safe `when` declarative condition and expression builder to `@dyrected/sdk` and `@dyrected/core`.
  - Added framework parity for `useDyPath()` and `useDyPathHelper()` in `@dyrected/vue` and auto-imported in `@dyrected/nuxt`.
  - Enhanced CLI `upgrade` command to automatically refresh `.dyrected/ai-rules.md` with the latest canonical rules when upgrading packages.
  - Added Marketing Site Page Builder Architecture, Array Field Object Shape Contract, and Type Synchronization Workflow to `@dyrected/knowledge` prompt templates and AI rules.
  - Added `/docs/[...slug]` legacy catch-all redirect route in documentation.
- Updated dependencies [558341d]
- Updated dependencies [2720377]
  - @dyrected/core@2.10.1
  - @dyrected/sdk@2.10.1
  - @dyrected/knowledge@0.4.1

## 2.10.0

### Patch Changes

- Updated dependencies [55d71f7]
- Updated dependencies [7cbb3cd]
  - @dyrected/core@2.10.0
  - @dyrected/sdk@2.10.0

## 2.9.0

### Patch Changes

- Updated dependencies [a484857]
- Updated dependencies [019a890]
  - @dyrected/core@2.9.0
  - @dyrected/sdk@2.9.0
  - @dyrected/knowledge@0.4.0

## 2.8.3

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.8.3
  - @dyrected/sdk@2.8.3

## 2.8.2

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.8.2
  - @dyrected/sdk@2.8.2

## 2.8.1

### Patch Changes

- Updated dependencies [38548a4]
  - @dyrected/core@2.8.1
  - @dyrected/knowledge@0.3.1
  - @dyrected/sdk@2.8.1

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

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.8.0
  - @dyrected/sdk@2.8.0
  - @dyrected/knowledge@0.3.0

## 2.7.1

### Patch Changes

- 93b38db: - Scoped split-pane edit page width calculation exclusively to desktop screen breakpoints, preventing form compression on mobile viewports
  - Replaced zero-based index array warnings with human-readable collection and field slug names in CLI `sync:schema` outputs
  - Added direct documentation links to CLI schema sync warning messages and core config validation outputs
  - Added comprehensive built-in Jexl helper utility functions (`slugify`, `lower`, `upper`, `trim`, `capitalize`, `truncate`, `readingTime`, `wordCount`, `replace`, `startsWith`, `endsWith`, `now`, `today`, `formatDate`, `addDays`, `diffDays`, `isPast`, `isFuture`, `includes`, `join`, `first`, `last`, `compact`, `unique`, `length`, `round`, `clamp`, `default`, `coalesce`, `isEmpty`, `get`) across `@dyrected/core`, `@dyrected/admin`, and CLI declarative validation
- Updated dependencies [93b38db]
- Updated dependencies
  - @dyrected/core@2.7.1
  - @dyrected/sdk@2.7.1

## 2.7.0

### Patch Changes

- cc1a8d3: - Added dark mode SVG logo asset and theme-aware fallback rendering in `admin-shell`
  - Migrated Nuxt example component config access to `useRuntimeConfig`
  - Transitioned default live preview mode to `postMessage` across prompt templates, skills, documentation, and recipes
  - Updated Dyrected configuration, environment integration, and content modeling rules for rich text and tabbed admin layouts
  - Modularized and consolidated prompt generation logic, AI rules, and shared rule templates
- Updated dependencies [cc1a8d3]
  - @dyrected/knowledge@0.2.16
  - @dyrected/core@2.7.0
  - @dyrected/sdk@2.7.0

## 2.6.4

### Patch Changes

- b84943e: Add Cloud-safe declarative hooks, broader declarative-expression validation, and clearer config diagnostics across core, admin, Nuxt, SDK, and CLI.

  - add declarative string hook support for collection/global `beforeRead`, `afterRead`, and `beforeChange`, field `beforeChange`, and field `admin.hooks.onChange`
  - preserve supported declarative hook strings during `sync:schema`, strip function hooks from Cloud payloads intentionally, and warn with exact schema paths
  - validate declarative access rules, string access policies, declarative hooks, `admin.condition`, and `admin.previewUrl` early with exact config paths and cleaner diagnostics
  - expose config diagnostics from `/api/schemas` so admin surfaces can consume them, and improve admin dashboard attention signals around config issues
  - improve Nuxt startup and reload reporting for invalid declarative config with formatted diagnostics instead of noisy raw errors
  - document the Cloud-safe access and hooks model more clearly, including synced string policies, `createdByCurrentUser` vs `isOwner`, declarative hook contexts, and short notes about early validation for access, hooks, preview, and `admin.condition`

- Updated dependencies [be3da3f]
- Updated dependencies [b84943e]
  - @dyrected/core@2.6.4
  - @dyrected/sdk@2.6.4

## 2.6.3

### Patch Changes

- @dyrected/core@2.6.3
- @dyrected/sdk@2.6.3

## 2.6.2

### Patch Changes

- @dyrected/core@2.6.2
- @dyrected/sdk@2.6.2

## 2.6.1

### Patch Changes

- Updated dependencies [b011a89]
  - @dyrected/core@2.6.1
  - @dyrected/sdk@2.6.1

## 2.6.0

### Patch Changes

- Updated dependencies [42f007b]
  - @dyrected/core@2.6.0
  - @dyrected/sdk@2.6.0

## 2.5.65

### Patch Changes

- Updated dependencies [812fef0]
  - @dyrected/core@2.5.65
  - @dyrected/sdk@2.5.65

## 2.5.64

### Patch Changes

- @dyrected/core@2.5.64
- @dyrected/sdk@2.5.64

## 2.5.63

### Patch Changes

- Updated dependencies [42f92d0]
  - @dyrected/core@2.5.63
  - @dyrected/sdk@2.5.63

## 2.5.62

### Patch Changes

- 4e5cfad: Type the SDK client and framework hooks against your generated schema automatically

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

  The Nuxt composables (`useDyrectedDoc`, `useDyrectedCollection`, `useDyrectedGlobal`) now return a properly typed `AsyncData<...>` instead of `any` — their `data` is typed as your document/global shape — and are constrained to your schema's slugs.

- Updated dependencies [a1b867e]
- Updated dependencies [16592a3]
- Updated dependencies [ee0e566]
- Updated dependencies [ee0e566]
- Updated dependencies [b3cccd2]
- Updated dependencies [4e5cfad]
  - @dyrected/core@2.5.62
  - @dyrected/knowledge@0.2.14
  - @dyrected/sdk@2.5.62

## 2.5.61

### Patch Changes

- b4a06ff: Admin: brand accent color, wired page metadata, and list export

  - Add `admin.branding.accentColor` — a second brand color for links, navigation accents, and focus rings (mapped to the `--intelligence` token) alongside `primaryColor`. Branding colors now also apply correctly in dark mode.
  - Wire `admin.meta.titleSuffix` into the browser tab title (it now reflects the current page and updates on navigation) and `admin.branding.favicon` into the page favicon. Both restore the host page's title/icon when the embedded admin unmounts.
  - Add an **Export Selected** bulk action on collection lists (export just the selected rows to CSV), and quote/escape CSV export values per RFC 4180 so values containing commas, quotes, or newlines no longer break columns.

  **Breaking (shipped as patch):** removed the no-op `basename` prop from `AdminUIProps` and the `@dyrected/vue` / `@dyrected/nuxt` wrappers, and stopped the CLI from scaffolding it. The admin routes internally with a hash router, so the panel's location is determined by the route of the page you render it in. If your app passes `basename`, remove it — it had no effect.

- 49ed92c: Vue bridge shares the host app context, CLI sync respects DYRECTED_URL

  - `@dyrected/vue`: custom Vue components in the admin (custom field inputs and dashboard/list slots) now share the host app's context instead of each mounting an isolated Vue app. They can use the host app's plugins, `provide`/`inject`, Pinia, and i18n, and many custom components no longer spin up one full Vue app per instance.
  - `dyrected` (CLI): `sync:schema` now honors `DYRECTED_URL` (and the `NEXT_PUBLIC_` / `NUXT_PUBLIC_` / `VITE_` variants) from your environment. Previously the `--url` option's hardcoded default masked the env fallback, so it always synced to Dyrected Cloud regardless of your configured URL.
  - `@dyrected/admin`: fix the admin browser-title helper resolving a collection's label — it read a non-existent `collection.label` (collections use `labels.singular` / `labels.plural`), which broke the package build. Also corrected the misleading `AdminComponents` JSDoc (`fields` is keyed by the field's `admin.component` string, not field type; `collectionList` injects list slots rather than replacing the list view).

- Updated dependencies [b4a06ff]
- Updated dependencies [b9b900b]
- Updated dependencies [b9b900b]
  - @dyrected/core@2.5.61
  - @dyrected/knowledge@0.2.13
  - @dyrected/sdk@2.5.61

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

- Updated dependencies [1c13fc0]
  - @dyrected/core@2.5.60
  - @dyrected/knowledge@0.2.12
  - @dyrected/sdk@2.5.60

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

- Updated dependencies [8fe08dc]
  - @dyrected/core@2.5.59
  - @dyrected/sdk@2.5.59

## 2.5.58

### Patch Changes

- Add a production-ready access control model that supports booleans, Jexl strings, direct self-hosted functions, and named policies across collections, globals, and field access.

  Introduce top-level `accessPolicies` resolution in core, enforce collection/global/field access on the server, and preserve object-based Jexl filter results for row-level access constraints.

  Make Cloud schema sync safe by stripping function-based access rules from synced payloads, preserving only booleans, Jexl strings, and named policies, with clear warnings for unsupported rules.

  Harden the admin hooks sandbox message listener so it only accepts messages from the expected iframe source.

- Updated dependencies
  - @dyrected/core@2.5.58
  - @dyrected/sdk@2.5.58

## 2.5.57

### Patch Changes

- 44663d4: Centralize preview URL resolution into a shared admin utility and standardize project initialization with updated defaults and enhanced schema configuration.
- 8e03174: Add type-safe field builder helpers and related updates.

  - Add `defineField`, `defineBlock`, and a dedicated `define<Type>Field` helper for every field type (`defineTextField`, `defineRichTextField`, `defineRelationshipField`, …) to `@dyrected/core`. Each is an identity helper that injects the field `type` and preserves full document-shape inference through `defineCollection`/`defineGlobal`.
  - Add configurable `features` and `headingLevels` to rich-text fields. The Admin rich-text editor now enables only the configured toolbar controls and editor capabilities (disabling a feature also removes its keyboard shortcut and paste handling).
  - Migrate documentation examples, the `dyrected init` scaffold, and the `@dyrected/knowledge` recipes and prompt templates to use the new `define*Field` helpers.
  - Rename the `JWT_SECRET` environment variable to `DYRECTED_JWT_SECRET` — update your `.env` accordingly.
  - Filter unpublished documents out of public read responses.

- Updated dependencies [8e03174]
  - @dyrected/core@2.5.57
  - @dyrected/knowledge@0.2.11
  - @dyrected/sdk@2.5.57

## 2.5.56

### Patch Changes

- Updated dependencies [9cb41d8]
  - @dyrected/core@2.5.56
  - @dyrected/sdk@2.5.56

## 2.5.55

### Patch Changes

- @dyrected/core@2.5.55
- @dyrected/sdk@2.5.55

## 2.5.54

### Patch Changes

- @dyrected/core@2.5.54
- @dyrected/sdk@2.5.54

## 2.5.53

### Patch Changes

- Updated dependencies [8e391a5]
- Updated dependencies [8e391a5]
  - @dyrected/core@2.5.53
  - @dyrected/knowledge@0.2.10
  - @dyrected/sdk@2.5.53

## 2.5.52

### Patch Changes

- Updated dependencies [ea1d99d]
- Updated dependencies [ea1d99d]
- Updated dependencies [ea1d99d]
  - @dyrected/core@2.5.52
  - @dyrected/knowledge@0.2.9
  - @dyrected/sdk@2.5.52

## 2.5.51

### Patch Changes

- 6b77541: Traverse parent directories to detect lockfiles in monorepos/nested workspaces during package manager detection.
  - @dyrected/core@2.5.51
  - @dyrected/sdk@2.5.51

## 2.5.50

### Patch Changes

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

- Updated dependencies [676ba83]
- Updated dependencies [7cdfb01]
  - @dyrected/knowledge@0.2.5
  - @dyrected/core@2.5.48
  - @dyrected/sdk@2.5.48

## 2.5.47

### Patch Changes

- @dyrected/core@2.5.47
- @dyrected/sdk@2.5.47

## 2.5.46

### Patch Changes

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

- Updated dependencies [8f9d96d]
  - @dyrected/knowledge@0.2.3
  - @dyrected/core@2.5.41
  - @dyrected/sdk@2.5.41

## 2.5.40

### Patch Changes

- Updated dependencies [d5aa016]
  - @dyrected/knowledge@0.2.2
  - @dyrected/core@2.5.40
  - @dyrected/sdk@2.5.40

## 2.5.39

### Patch Changes

- @dyrected/core@2.5.39
- @dyrected/sdk@2.5.39

## 2.5.38

### Patch Changes

- @dyrected/core@2.5.38
- @dyrected/sdk@2.5.38

## 2.5.37

### Patch Changes

- Updated dependencies [0b13e96]
  - @dyrected/knowledge@0.2.1
  - @dyrected/core@2.5.37
  - @dyrected/sdk@2.5.37

## 2.5.36

### Patch Changes

- @dyrected/core@2.5.36
- @dyrected/sdk@2.5.36

## 2.5.35

### Patch Changes

- @dyrected/core@2.5.35
- @dyrected/sdk@2.5.35

## 2.5.34

### Patch Changes

- @dyrected/core@2.5.34
- @dyrected/sdk@2.5.34

## 2.5.33

### Patch Changes

- Await lazy Dyrected app initialization in Next.js route handlers, mount API routes
  under `/dyrected` by default, support custom route prefixes, and generate valid
  App Router scaffolding from the CLI.
  - @dyrected/core@2.5.33
  - @dyrected/sdk@2.5.33

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

- Updated dependencies [9fcf1e2]
  - @dyrected/knowledge@0.2.0
  - @dyrected/core@2.5.32
  - @dyrected/sdk@2.5.32

## 2.5.31

### Patch Changes

- Updated dependencies [fa1ad68]
  - @dyrected/core@2.5.31
  - @dyrected/sdk@2.5.31

## 2.5.30

### Patch Changes

- Updated dependencies [1a2e552]
  - @dyrected/core@2.5.30
  - @dyrected/sdk@2.5.30

## 2.5.29

### Patch Changes

- @dyrected/core@2.5.29
- @dyrected/sdk@2.5.29

## 2.5.28

### Patch Changes

- Updated dependencies [fd36dfd]
  - @dyrected/core@2.5.28
  - @dyrected/sdk@2.5.28

## 2.5.27

### Patch Changes

- @dyrected/core@2.5.27
- @dyrected/sdk@2.5.27

## 2.5.26

### Patch Changes

- Updated dependencies [7db84cc]
  - @dyrected/core@2.5.26
  - @dyrected/sdk@2.5.26

## 2.5.25

### Patch Changes

- Updated dependencies [ed94c3a]
  - @dyrected/core@2.5.25
  - @dyrected/sdk@2.5.25

## 2.5.24

### Patch Changes

- @dyrected/core@2.5.24
- @dyrected/sdk@2.5.24

## 2.5.23

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.5.23
  - @dyrected/sdk@2.5.23

## 2.5.22

### Patch Changes

- @dyrected/core@2.5.22
- @dyrected/sdk@2.5.22

## 2.5.21

### Patch Changes

- @dyrected/core@2.5.21
- @dyrected/sdk@2.5.21

## 2.5.20

### Patch Changes

- @dyrected/core@2.5.20
- @dyrected/sdk@2.5.20

## 2.5.19

### Patch Changes

- @dyrected/core@2.5.19
- @dyrected/sdk@2.5.19

## 2.5.18

### Patch Changes

- Updated dependencies [09d6e92]
  - @dyrected/core@2.5.18
  - @dyrected/sdk@2.5.18

## 2.5.17

### Patch Changes

- Updated dependencies [bd0d9a3]
  - @dyrected/core@2.5.17
  - @dyrected/sdk@2.5.17

## 2.5.16

### Patch Changes

- Updated dependencies [414b005]
  - @dyrected/core@2.5.16
  - @dyrected/sdk@2.5.16

## 2.5.15

### Patch Changes

- Updated dependencies [356a7a5]
  - @dyrected/core@2.5.15
  - @dyrected/sdk@2.5.15

## 2.5.14

### Patch Changes

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

- Updated dependencies
  - @dyrected/core@2.5.12
  - @dyrected/sdk@2.5.12

## 2.5.11

### Patch Changes

- @dyrected/core@2.5.11
- @dyrected/sdk@2.5.11

## 2.5.10

### Patch Changes

- Updated dependencies [4a6881b]
  - @dyrected/core@2.5.10
  - @dyrected/sdk@2.5.10

## 2.5.9

### Patch Changes

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

### Minor Changes

- Refactor source into `commands/` and `utils/` modules for maintainability.
- Add MySQL adapter as a database option in `init`.
- Auto-detect framework from `package.json` and pre-select it in the prompt.
- Detect Bun lockfile in package manager detection.
- **Next.js**: detect `src/` directory and App Router vs Pages Router; write files to the correct location.
- **Next.js**: generate `instrumentation.ts` to log admin and API URLs on server start.
- **Nuxt**: detect `app/` srcDir and write admin page to the correct location.
- **Nuxt**: auto-patch `nuxt.config.ts` to register `@dyrected/nuxt` with `adminPath`.
- Auto-generate TypeScript types after a successful `sync:schema` (`--skip-types` to opt out).
- Add `--help` examples to all commands.
- Add `__admins` collection to generated config by default so every new project has dashboard auth.
- Normalize version to 2.5.5 to align with the rest of the monorepo.
- Updated dependencies
  - @dyrected/core@2.5.5
  - @dyrected/sdk@2.5.5

## 2.3.5

### Patch Changes

- Updated the CLI DX
- Updated dependencies
  - @dyrected/core@2.5.2
  - @dyrected/sdk@2.4.6

## 2.3.4

### Patch Changes

- improve Nuxt server request URL handling
- Updated dependencies
  - @dyrected/core@2.5.1
  - @dyrected/sdk@2.4.5

## 2.3.3

### Patch Changes

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

- Updated dependencies
  - @dyrected/core@2.5.0
  - @dyrected/sdk@2.4.2

## 2.3.2

### Patch Changes

- 5dd7403: fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK
- Updated dependencies [5dd7403]
  - @dyrected/core@2.4.1
  - @dyrected/sdk@2.4.1

## 2.3.1

### Patch Changes

- fix: include dist directory in npm package

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

## 2.0.0

### Major Changes

- Updated all storage adapters to support `Uint8Array` buffers and file prefixing.
  - **Storage API Update**: The `buffer` parameter in `StorageAdapter.upload` and `resolve` now expects a `Uint8Array` instead of a Node.js `Buffer`. This ensures better compatibility across different JavaScript environments.
  - **File Prefixing**: Added support for an optional `prefix` parameter in `StorageAdapter.upload` to allow organizing files into subfolders or prefixes (supported by Cloudinary, S3, B2, and Local storage).
  - **Alignment**: Standardized `CloudinaryStorageAdapter`, `LocalStorageAdapter`, `S3StorageAdapter`, and `B2StorageAdapter` to strictly follow the `@dyrected/core` interface.

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.0.0

## 1.0.8

### Patch Changes

- d8e1f29: bump package versions and update export conditions for admin package
- Updated dependencies [d8e1f29]
  - @dyrected/core@1.0.9

## 1.0.7

### Patch Changes

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt.
- Updated dependencies
  - @dyrected/core@1.0.7

## 1.0.6

### Patch Changes

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture.
- Updated dependencies
  - @dyrected/core@1.0.6

## 1.0.5

### Patch Changes

- Standardize framework integrations for Next.js and Nuxt. Fix CLI generation for Nuxt admin pages to use zero-import architecture and framework-aware env var prefixes.
- Updated dependencies
  - @dyrected/core@1.0.5

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

## 1.0.1

### Patch Changes

- bfc3468: Initial public release of the Dyrected CMS ecosystem.
- Updated dependencies [bfc3468]
  - @dyrected/core@1.0.1

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
