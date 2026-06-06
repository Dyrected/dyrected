# @dyrected/db-mysql

## 2.5.22

### Patch Changes

- @dyrected/core@2.5.22

## 2.5.21

### Patch Changes

- @dyrected/core@2.5.21

## 2.5.20

### Patch Changes

- @dyrected/core@2.5.20

## 2.5.19

### Patch Changes

- @dyrected/core@2.5.19

## 2.5.18

### Patch Changes

- Updated dependencies [09d6e92]
  - @dyrected/core@2.5.18

## 2.5.17

### Patch Changes

- Updated dependencies [bd0d9a3]
  - @dyrected/core@2.5.17

## 2.5.16

### Patch Changes

- Updated dependencies [414b005]
  - @dyrected/core@2.5.16

## 2.5.15

### Patch Changes

- Updated dependencies [356a7a5]
  - @dyrected/core@2.5.15

## 2.5.14

### Patch Changes

- @dyrected/core@2.5.14

## 2.5.13

### Patch Changes

- Updated dependencies [2961a9d]
  - @dyrected/core@2.5.13

## 2.5.12

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.5.12

## 2.5.11

### Patch Changes

- @dyrected/core@2.5.11

## 2.5.10

### Patch Changes

- Updated dependencies [4a6881b]
  - @dyrected/core@2.5.10

## 2.5.9

### Patch Changes

- Updated dependencies [a8fa0b7]
  - @dyrected/core@2.5.9

## 2.5.8

### Patch Changes

- refactor: type MediaPicker preview function with Media interface
- Updated dependencies
  - @dyrected/core@2.5.8

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

## 2.5.5

### Patch Changes

- Normalize package version to 2.5.5 to align with the rest of the `@dyrected/*` monorepo.
  Versions 3.x–5.x were published in error due to incorrect major version bumps in the
  changeset workflow. Those versions have been deprecated on npm. All packages now share a
  fixed version group and will move together on every future release.
- Updated dependencies
  - @dyrected/core@2.5.5

## 2.5.2 (published as 5.0.2 in error)

### Patch Changes

- Updated the CLI DX
- Updated dependencies
  - @dyrected/core@2.5.2

## 2.5.1 (published as 5.0.1 in error)

### Patch Changes

- Improve Nuxt server request URL handling
- Updated dependencies
  - @dyrected/core@2.5.1

## 2.5.0 (published as 5.0.0 in error)

### Patch Changes

- Admin UI enhancements: clickable primary column, Tabs Layout, Row Layout, Icon Field, Join Fields, Inline Page Editing.
- Architecture: extraction of Vue-specific logic into `@dyrected/vue`, synchronized field types across SDK and Admin.
- Integrations: improved Nuxt and Next.js support.
- Bug fixes: resolved build failures related to shadowing type declarations in `@dyrected/core`, fixed `@dyrected/vue` package exports.
- Updated dependencies
  - @dyrected/core@2.5.0

## 2.4.1 (published as 4.0.2 in error)

### Patch Changes

- fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK
- Updated dependencies
  - @dyrected/core@2.4.1

## 2.4.0 (published as 4.0.1 in error)

### Patch Changes

- fix: include dist directory in npm package

## 2.4.0 (published as 4.0.0 in error)

### Minor Changes

- Infrastructure standardization, MySQL adapter improvements, and SDK robustness testing.
- Updated dependencies
  - @dyrected/core@2.4.0

## 2.3.0 (published as 3.0.0 in error)

### Minor Changes

- Standardize database infrastructure and implement field promotion.
  - **Field Promotion**: Added `promoted` option to collection fields to extract JSON data into native SQL columns for indexing and performance.
  - **Lazy Migrations**: Added `renameTo` support for seamless field renames without breaking existing data.
  - **Auto-Seeding**: Standardized `initialData` seeding logic across all adapters.
  - **MySQL Adapter**: New robust MySQL adapter implementation.
  - **Strict Filtering**: Improved query translation parity across all SQL-based adapters.
- Updated dependencies
  - @dyrected/core@2.3.0
