# @dyrected/docs

## 0.1.17

### Patch Changes

- e94ec78: feat: add enterprise guide and implement table auto-initialization with improved admin authentication checks

## 0.1.16

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
  - @dyrected/knowledge@0.2.3

## 0.1.15

### Patch Changes

- d5aa016: fix docs and global seeding
- Updated dependencies [d5aa016]
  - @dyrected/knowledge@0.2.2

## 0.1.14

### Patch Changes

- 0b13e96: feat: add customizable field widths to collection edit layouts and unify list page view settings
  - Added customizable field widths (25%, 33%, 50%, 66%, 75%, 100%) to edit forms, enabling side-by-side field positioning.
  - Expanded the layout preferences API and SDK client to handle generic LayoutItem objects (`Array<{ name: string; width?: string }>`).
  - Consolidated the list view mode selector and column configure popovers into a unified "View Settings" panel.
  - Enabled column visibility toggles (checklists) directly inside the new unified view settings popover, syncing visible columns with the data table.

- Updated dependencies [0b13e96]
  - @dyrected/knowledge@0.2.1

## 0.1.13

### Patch Changes

- 9fcf1e2: @dyrected/knowledge — minor

  Add @dyrected/knowledge package: compiled recipe library with behavioral tests, intent-indexed search, and a content generator that produces hybrid documentation pages (authored prose + generated TypeScript contracts in marked regions). Includes auto-slug, cross-field validation, dependent dropdown, owner-scoped access, role-based access, editorial workflow, page builder, upload collection, relationship/join, safe field rename, and conditional admin field recipes.

  @dyrected/core — patch

  Expand public type exports (CollectionConfig, GlobalConfig, Field, UploadConfig, workflow types) and extend the OpenAPI generator to include all auth, workflow, schema, and dynamic-option routes.

  @dyrected/sdk — patch

  Remove internal setup-prompt utility (superseded by CLI). Expand public API surface with fluent collection/global builders, authentication helpers, and complete TypeScript generics.

  @dyrected/cli — minor

  Add generate-ai-rules command. Extend init with framework/adapter detection. Add type generator and config templates.

  @dyrected/db-postgres, @dyrected/db-mongodb — patch

  Align adapter implementations with updated DatabaseAdapter contract (transactions, typed return shapes, ReadonlyDatabaseAdapter).

  @dyrected/docs — patch

  Rewrite reference, adapter, recipe, and guide pages as hybrid documents: authored mental models and examples preserved, TypeScript contracts generated into marked regions. Fix MDX region markers from HTML comments to JSX comments ({/\* \*/}) so fumadocs can compile them. Add check-contract.mjs validation: required heading manifests, authored word-count floor, and marker integrity checks.

  skills/dyrected — patch

  Restore full SKILL.md with schema migration procedure, access-control principles, intent-to-pattern table, and generated field/recipe inventories.

- Updated dependencies [9fcf1e2]
  - @dyrected/knowledge@0.2.0

## 0.1.12

### Patch Changes

- fa1ad68: feat: add workflow reference generation scripts, improve admin documentation, and implement dashboard testing utilities

## 0.1.11

### Patch Changes

- 1a2e552: ### ✨ Features & Refactors
  - **Admin UI Customization**: Implemented the Admin UI component slot injection system along with Vue bridging support, allowing developers to inject custom components natively into the dashboard and lists.
  - **Onboarding & Setup**: Replaced prompt generation with an external guided setup flow, and added a new email template service.
  - **UI Refresh**: Updated admin CSS variables and layout container styling for improved aesthetics.

  ### 📚 Documentation
  - **Structural Changes**: Migrated feature documentation into dedicated guides.
  - **Cloud Rebrand**: Updated app dashboard documentation and references to point to the new `cloud.dyrected.com` domain.
  - **General Polish**: Expanded and updated documentation across multiple files (including fixing the YAML parser bugs in the new markdown format).

## 0.1.10

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

## 0.1.9

### Patch Changes

- feat: add custom field component support, field-level error boundaries, and fix React instance mismatch in Vue bridge

## 0.1.8

### Patch Changes

- refactor: type MediaPicker preview function with Media interface

## 0.1.7

### Patch Changes

- 890c56a: - **URL Field Evolution**: Implemented a modern dual-mode URL Field component featuring a direct toggle between external links and a dynamic internal page/document selector (complete with direct database slug binding and custom label fields).
  - **Global Settings Configuration**: Added native Global Configuration support, with robust schema validation, configuration normalization, hydration mechanisms, and full type safety across standard field components.
  - **Form Engine & Block Builder Revamp**:
    - Re-architected the Block Builder with interactive, collapsible block layout items, custom drag-and-drop sort handlers, and automatic field-value summary crawling for collapsed block previews.
    - Replaced the simple dropdown block selector with a visual center-aligned **Block Library Dialog Modal** featuring soft-indicator layer graphics.
    - Standardized external save triggers (header Save button & `⌘S` shortcut) using native HTML5 `form` attributes to bind seamlessly with the Hook Form submit engine.
    - Enlarged block titles and integrated center-aligned dashed "Add Block" buttons directly under the block lists for optimized edit flow.

## 0.1.6

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

## 0.1.5

### Patch Changes

- Updated the CLI DX

## 0.1.4

### Patch Changes

- improve Nuxt server request URL handling

## 0.1.3

### Patch Changes

- 5dd7403: fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK

## 0.1.2

### Patch Changes

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt.

## 0.1.1

### Patch Changes

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture.
