# @dyrected/knowledge

## 0.2.14

### Patch Changes

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

- Updated dependencies [a1b867e]
- Updated dependencies [16592a3]
- Updated dependencies [ee0e566]
- Updated dependencies [ee0e566]
- Updated dependencies [b3cccd2]
  - @dyrected/core@2.5.62

## 0.2.13

### Patch Changes

- b4a06ff: Admin: brand accent color, wired page metadata, and list export

  - Add `admin.branding.accentColor` — a second brand color for links, navigation accents, and focus rings (mapped to the `--intelligence` token) alongside `primaryColor`. Branding colors now also apply correctly in dark mode.
  - Wire `admin.meta.titleSuffix` into the browser tab title (it now reflects the current page and updates on navigation) and `admin.branding.favicon` into the page favicon. Both restore the host page's title/icon when the embedded admin unmounts.
  - Add an **Export Selected** bulk action on collection lists (export just the selected rows to CSV), and quote/escape CSV export values per RFC 4180 so values containing commas, quotes, or newlines no longer break columns.

  **Breaking (shipped as patch):** removed the no-op `basename` prop from `AdminUIProps` and the `@dyrected/vue` / `@dyrected/nuxt` wrappers, and stopped the CLI from scaffolding it. The admin routes internally with a hash router, so the panel's location is determined by the route of the page you render it in. If your app passes `basename`, remove it — it had no effect.

- Updated dependencies [b4a06ff]
- Updated dependencies [b9b900b]
- Updated dependencies [b9b900b]
  - @dyrected/core@2.5.61

## 0.2.12

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

## 0.2.11

### Patch Changes

- 8e03174: Add type-safe field builder helpers and related updates.

  - Add `defineField`, `defineBlock`, and a dedicated `define<Type>Field` helper for every field type (`defineTextField`, `defineRichTextField`, `defineRelationshipField`, …) to `@dyrected/core`. Each is an identity helper that injects the field `type` and preserves full document-shape inference through `defineCollection`/`defineGlobal`.
  - Add configurable `features` and `headingLevels` to rich-text fields. The Admin rich-text editor now enables only the configured toolbar controls and editor capabilities (disabling a feature also removes its keyboard shortcut and paste handling).
  - Migrate documentation examples, the `dyrected init` scaffold, and the `@dyrected/knowledge` recipes and prompt templates to use the new `define*Field` helpers.
  - Rename the `JWT_SECRET` environment variable to `DYRECTED_JWT_SECRET` — update your `.env` accordingly.
  - Filter unpublished documents out of public read responses.

- Updated dependencies [8e03174]
  - @dyrected/core@2.5.57

## 0.2.10

### Patch Changes

- 8e391a5: Document block variants and expand the generated field reference. Adds `Block`/`BlockVariant` guidance (presentation variants, switching behaviour, defaults, admin/preview) and generates the full field-type contract set — `TypedField`, `FieldBase`, every per-type field alias, the admin option types, and the dynamic-options and character/word-limit config types — into the knowledge reference.
- Updated dependencies [8e391a5]
  - @dyrected/core@2.5.53

## 0.2.9

### Patch Changes

- ea1d99d: AI knowledge for generating new Dyrected sites, not only migrating existing ones.
  - New content-modeling rules: greenfield site generation, content coherence, deterministic seed relationships, initial-data seeding mechanics (globals seed on any read; collections seed only on an unfiltered list read), the icon field, config authoring (keep block/field arrays inline to preserve literal types; module splitting), and adapter/deployment-target selection (file SQLite and local storage are not serverless-safe).
  - New frontend-integration rules: link/URL field resolution, site chrome via globals with safe fallbacks, and live preview / click-to-edit.
  - New `generate-site.md` template: a staged, plain-language, greenfield counterpart to `generate-cms.md`, wired through the generator and exported as `GENERATE_SITE_PROMPT`.
  - Every new rule section links to the relevant docs page, and each rule instructs the assistant technically while forbidding technical language in replies to the user.

- Updated dependencies [ea1d99d]
- Updated dependencies [ea1d99d]
  - @dyrected/core@2.5.52

## 0.2.8

### Patch Changes

- fb76591: Add Page Routing Rule for frontend integration guidelines in AI Rules template.

## 0.2.7

### Patch Changes

- 03acdb6: Update AI templates, generated rules, and re-compile auto-generated markdown documentation files across apps and specs.
  - @dyrected/core@2.5.49

## 0.2.6

### Patch Changes

- Modularize content-modeling and frontend-integration rules into distinct shared source files and update the setup prompts.

## 0.2.5

### Patch Changes

- 676ba83: Add llms.txt index URL to generate-cms prompt so the AI fetches the full documentation index before navigating individual pages
- Updated dependencies [7cdfb01]
  - @dyrected/core@2.5.48

## 0.2.4

### Patch Changes

- Expose the generated CMS setup prompt as `GENERATE_CMS_PROMPT`.

## 0.2.3

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

## 0.2.2

### Patch Changes

- d5aa016: fix docs and global seeding
- Updated dependencies [d5aa016]
  - @dyrected/core@2.5.40

## 0.2.1

### Patch Changes

- 0b13e96: feat: add customizable field widths to collection edit layouts and unify list page view settings
  - Added customizable field widths (25%, 33%, 50%, 66%, 75%, 100%) to edit forms, enabling side-by-side field positioning.
  - Expanded the layout preferences API and SDK client to handle generic LayoutItem objects (`Array<{ name: string; width?: string }>`).
  - Consolidated the list view mode selector and column configure popovers into a unified "View Settings" panel.
  - Enabled column visibility toggles (checklists) directly inside the new unified view settings popover, syncing visible columns with the data table.

- Updated dependencies [0b13e96]
  - @dyrected/core@2.5.37

## 0.2.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [9fcf1e2]
  - @dyrected/core@2.5.32
