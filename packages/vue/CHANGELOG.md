# @dyrected/vue

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
