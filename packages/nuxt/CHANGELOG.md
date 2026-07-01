# @dyrected/nuxt

## 2.5.49

### Patch Changes

- Updated dependencies [b23b116]
  - @dyrected/admin@2.5.49
  - @dyrected/vue@2.5.49
  - @dyrected/core@2.5.49
  - @dyrected/sdk@2.5.49

## 2.5.48

### Patch Changes

- Updated dependencies [38bfacb]
- Updated dependencies [7cdfb01]
  - @dyrected/admin@2.5.48
  - @dyrected/core@2.5.48
  - @dyrected/sdk@2.5.48
  - @dyrected/vue@2.5.48

## 2.5.47

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.47
  - @dyrected/vue@2.5.47
  - @dyrected/core@2.5.47
  - @dyrected/sdk@2.5.47

## 2.5.46

### Patch Changes

- Updated dependencies [11c8ba0]
  - @dyrected/admin@2.5.46
  - @dyrected/vue@2.5.46
  - @dyrected/core@2.5.46
  - @dyrected/sdk@2.5.46

## 2.5.45

### Patch Changes

- Updated dependencies [e94ec78]
  - @dyrected/core@2.5.45
  - @dyrected/sdk@2.5.45
  - @dyrected/admin@2.5.45
  - @dyrected/vue@2.5.45

## 2.5.44

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.5.44
  - @dyrected/sdk@2.5.44
  - @dyrected/admin@2.5.44
  - @dyrected/vue@2.5.44

## 2.5.43

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.43
  - @dyrected/core@2.5.43
  - @dyrected/vue@2.5.43
  - @dyrected/sdk@2.5.43

## 2.5.42

### Patch Changes

- Updated dependencies [afa1ae0]
  - @dyrected/core@2.5.42
  - @dyrected/sdk@2.5.42
  - @dyrected/admin@2.5.42
  - @dyrected/vue@2.5.42

## 2.5.41

### Patch Changes

- Updated dependencies [8f9d96d]
  - @dyrected/admin@2.5.41
  - @dyrected/core@2.5.41
  - @dyrected/sdk@2.5.41
  - @dyrected/vue@2.5.41

## 2.5.40

### Patch Changes

- Updated dependencies [d5aa016]
  - @dyrected/core@2.5.40
  - @dyrected/sdk@2.5.40
  - @dyrected/vue@2.5.40
  - @dyrected/admin@2.5.40

## 2.5.39

### Patch Changes

- Updated dependencies [b5c8fea]
  - @dyrected/admin@2.5.39
  - @dyrected/vue@2.5.39
  - @dyrected/core@2.5.39
  - @dyrected/sdk@2.5.39

## 2.5.38

### Patch Changes

- Updated dependencies [60e0617]
  - @dyrected/admin@2.5.38
  - @dyrected/vue@2.5.38
  - @dyrected/core@2.5.38
  - @dyrected/sdk@2.5.38

## 2.5.37

### Patch Changes

- Updated dependencies [0b13e96]
  - @dyrected/admin@2.5.37
  - @dyrected/core@2.5.37
  - @dyrected/sdk@2.5.37
  - @dyrected/vue@2.5.37

## 2.5.36

### Patch Changes

- Updated dependencies [eb77809]
  - @dyrected/admin@2.5.36
  - @dyrected/vue@2.5.36
  - @dyrected/core@2.5.36
  - @dyrected/sdk@2.5.36

## 2.5.35

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.5.35
  - @dyrected/vue@2.5.35
  - @dyrected/core@2.5.35
  - @dyrected/sdk@2.5.35

## 2.5.34

### Patch Changes

- Updated dependencies [46b11d6]
  - @dyrected/admin@2.5.34
  - @dyrected/vue@2.5.34
  - @dyrected/core@2.5.34
  - @dyrected/sdk@2.5.34

## 2.5.33

### Patch Changes

- @dyrected/admin@2.5.33
- @dyrected/core@2.5.33
- @dyrected/sdk@2.5.33
- @dyrected/vue@2.5.33

## 2.5.32

### Patch Changes

- Updated dependencies [9fcf1e2]
  - @dyrected/core@2.5.32
  - @dyrected/sdk@2.5.32
  - @dyrected/vue@2.5.32
  - @dyrected/admin@2.5.32

## 2.5.31

### Patch Changes

- Updated dependencies [fa1ad68]
  - @dyrected/admin@2.5.31
  - @dyrected/core@2.5.31
  - @dyrected/vue@2.5.31
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
  - @dyrected/core@2.5.30
  - @dyrected/sdk@2.5.30
  - @dyrected/vue@2.5.30

## 2.5.29

### Patch Changes

- Updated dependencies [cbc6dad]
  - @dyrected/admin@2.5.29
  - @dyrected/vue@2.5.29
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
  - @dyrected/admin@2.5.28
  - @dyrected/core@2.5.28
  - @dyrected/sdk@2.5.28
  - @dyrected/vue@2.5.28

## 2.5.27

### Patch Changes

- 8c27ba9: refactor: unify React dependency resolution across packages and optimize Vite/Next configuration for dependency sharing
- Updated dependencies [8c27ba9]
  - @dyrected/admin@2.5.27
  - @dyrected/vue@2.5.27
  - @dyrected/core@2.5.27
  - @dyrected/sdk@2.5.27

## 2.5.26

### Patch Changes

- Updated dependencies [7db84cc]
  - @dyrected/admin@2.5.26
  - @dyrected/core@2.5.26
  - @dyrected/sdk@2.5.26
  - @dyrected/vue@2.5.26

## 2.5.25

### Patch Changes

- Updated dependencies [ed94c3a]
  - @dyrected/admin@2.5.25
  - @dyrected/core@2.5.25
  - @dyrected/vue@2.5.25
  - @dyrected/sdk@2.5.25

## 2.5.24

### Patch Changes

- Updated dependencies [71348fb]
  - @dyrected/admin@2.5.24
  - @dyrected/vue@2.5.24
  - @dyrected/core@2.5.24
  - @dyrected/sdk@2.5.24

## 2.5.23

### Patch Changes

- feat: add custom field component support, field-level error boundaries, and fix React instance mismatch in Vue bridge
- Updated dependencies
  - @dyrected/admin@2.5.23
  - @dyrected/core@2.5.23
  - @dyrected/vue@2.5.23
  - @dyrected/sdk@2.5.23

## 2.5.22

### Patch Changes

- Fix tabs roving focus error, resolve Nuxt module production build config loading, and add user profile display in admin sidebar footer.
- Updated dependencies
  - @dyrected/admin@2.5.22
  - @dyrected/vue@2.5.22
  - @dyrected/core@2.5.22
  - @dyrected/sdk@2.5.22

## 2.5.21

### Patch Changes

- refactor: update form-engine to use TabsList and implement dynamic hot-reloading for database configuration in Nuxt module
- Updated dependencies
  - @dyrected/admin@2.5.21
  - @dyrected/vue@2.5.21
  - @dyrected/core@2.5.21
  - @dyrected/sdk@2.5.21

## 2.5.20

### Patch Changes

- Updated dependencies [298a35b]
  - @dyrected/admin@2.5.20
  - @dyrected/vue@2.5.20
  - @dyrected/core@2.5.20
  - @dyrected/sdk@2.5.20

## 2.5.19

### Patch Changes

- 3ae7315: feat: implement lazy database initialization with auto-creation support and update config loading template strategy
  - @dyrected/admin@2.5.19
  - @dyrected/core@2.5.19
  - @dyrected/sdk@2.5.19
  - @dyrected/vue@2.5.19

## 2.5.18

### Patch Changes

- Updated dependencies [09d6e92]
  - @dyrected/admin@2.5.18
  - @dyrected/core@2.5.18
  - @dyrected/sdk@2.5.18
  - @dyrected/vue@2.5.18

## 2.5.17

### Patch Changes

- Updated dependencies [bd0d9a3]
  - @dyrected/admin@2.5.17
  - @dyrected/core@2.5.17
  - @dyrected/vue@2.5.17
  - @dyrected/sdk@2.5.17

## 2.5.16

### Patch Changes

- Updated dependencies [414b005]
  - @dyrected/admin@2.5.16
  - @dyrected/core@2.5.16
  - @dyrected/sdk@2.5.16
  - @dyrected/vue@2.5.16

## 2.5.15

### Patch Changes

- Updated dependencies [356a7a5]
  - @dyrected/admin@2.5.15
  - @dyrected/core@2.5.15
  - @dyrected/vue@2.5.15
  - @dyrected/sdk@2.5.15

## 2.5.14

### Patch Changes

- 959b5c5: Fix branding logo rendering by replacing the buggy comma operator with `getMediaUrl`. Resolve Nuxt module template and config-load path issues, and bundle the `qs` dependency inside the SDK to eliminate browser compatibility errors.
- Updated dependencies [959b5c5]
  - @dyrected/admin@2.5.14
  - @dyrected/sdk@2.5.14
  - @dyrected/vue@2.5.14
  - @dyrected/core@2.5.14

## 2.5.13

### Patch Changes

- 2961a9d: - Implement secure password field support (hashing, validation, and UI input form handling) and a password update endpoint.
  - Implement configuration cache invalidation for hot-reloading.
  - Add collection schema support for labels, simplify server handler config resolution, and add a Nuxt dynamic pages setup guide.
- Updated dependencies [2961a9d]
  - @dyrected/admin@2.5.13
  - @dyrected/core@2.5.13
  - @dyrected/vue@2.5.13
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
  - @dyrected/admin@2.5.12
  - @dyrected/core@2.5.12
  - @dyrected/vue@2.5.12
  - @dyrected/sdk@2.5.12

## 2.5.11

### Patch Changes

- Updated dependencies [ff1a756]
  - @dyrected/admin@2.5.11
  - @dyrected/vue@2.5.11
  - @dyrected/core@2.5.11
  - @dyrected/sdk@2.5.11

## 2.5.10

### Patch Changes

- Updated dependencies [4a6881b]
  - @dyrected/admin@2.5.10
  - @dyrected/core@2.5.10
  - @dyrected/vue@2.5.10
  - @dyrected/sdk@2.5.10

## 2.5.9

### Patch Changes

- Updated dependencies [a8fa0b7]
  - @dyrected/admin@2.5.9
  - @dyrected/core@2.5.9
  - @dyrected/vue@2.5.9
  - @dyrected/sdk@2.5.9

## 2.5.8

### Patch Changes

- refactor: type MediaPicker preview function with Media interface
- Updated dependencies
  - @dyrected/admin@2.5.8
  - @dyrected/core@2.5.8
  - @dyrected/sdk@2.5.8
  - @dyrected/vue@2.5.8

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
  - @dyrected/core@2.5.7
  - @dyrected/sdk@2.5.7
  - @dyrected/vue@2.5.7

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
  - @dyrected/core@2.5.6
  - @dyrected/sdk@2.5.6
  - @dyrected/vue@2.5.6

## 2.5.5

### Minor Changes

- Add `adminPath` module option to specify where the admin page is mounted.
- Log admin and API URLs to the console when the Nitro dev server starts (via `listen` hook).
- Normalize version to 2.5.5 to align with the rest of the monorepo.
- Updated dependencies
  - @dyrected/admin@2.5.5
  - @dyrected/core@2.5.5
  - @dyrected/sdk@2.5.5
  - @dyrected/vue@2.5.5

## 2.3.9

### Patch Changes

- Updated the CLI DX
- Updated dependencies
  - @dyrected/admin@2.5.3
  - @dyrected/core@2.5.2
  - @dyrected/sdk@2.4.6
  - @dyrected/vue@2.5.5

## 2.3.8

### Patch Changes

- improve Nuxt server request URL handling
- Updated dependencies
  - @dyrected/admin@2.5.2
  - @dyrected/core@2.5.1
  - @dyrected/sdk@2.4.5
  - @dyrected/vue@2.5.4

## 2.3.7

### Patch Changes

- fix react dependency issues
- Updated dependencies
  - @dyrected/sdk@2.4.4
  - @dyrected/vue@2.5.3

## 2.3.6

### Patch Changes

- Updated dependencies
  - @dyrected/sdk@2.4.3
  - @dyrected/vue@2.5.2

## 2.3.5

### Patch Changes

- cdc953e: Fixed mising CSS and added dy- prefix to all classes in components
- Updated dependencies [cdc953e]
  - @dyrected/admin@2.5.1
  - @dyrected/vue@2.5.1

## 2.3.4

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
  - @dyrected/admin@2.5.0
  - @dyrected/core@2.5.0
  - @dyrected/vue@2.5.0
  - @dyrected/sdk@2.4.2

## 2.3.3

### Patch Changes

- 5dd7403: fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK
- Updated dependencies [5dd7403]
  - @dyrected/admin@2.4.2
  - @dyrected/core@2.4.1
  - @dyrected/sdk@2.4.1

## 2.3.2

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.4.1

## 2.3.1

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.4.0
  - @dyrected/sdk@2.4.0
  - @dyrected/admin@2.4.0

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
  - @dyrected/admin@2.3.0

## 2.0.1

### Patch Changes

- Updated dependencies [220818c]
  - @dyrected/admin@2.0.1
  - @dyrected/core@2.1.0
  - @dyrected/sdk@2.0.0

## 2.0.0

### Major Changes

- Updated all storage adapters to support `Uint8Array` buffers and file prefixing.
  - **Storage API Update**: The `buffer` parameter in `StorageAdapter.upload` and `resolve` now expects a `Uint8Array` instead of a Node.js `Buffer`. This ensures better compatibility across different JavaScript environments.
  - **File Prefixing**: Added support for an optional `prefix` parameter in `StorageAdapter.upload` to allow organizing files into subfolders or prefixes (supported by Cloudinary, S3, B2, and Local storage).
  - **Alignment**: Standardized `CloudinaryStorageAdapter`, `LocalStorageAdapter`, `S3StorageAdapter`, and `B2StorageAdapter` to strictly follow the `@dyrected/core` interface.

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.0.0
  - @dyrected/core@2.0.0
  - @dyrected/sdk@2.0.0

## 1.0.10

### Patch Changes

- d8e1f29: bump package versions and update export conditions for admin package
- Updated dependencies [d8e1f29]
  - @dyrected/admin@1.0.9
  - @dyrected/core@1.0.9
  - @dyrected/sdk@1.0.9

## 1.0.9

### Patch Changes

- Updated dependencies
  - @dyrected/core@1.0.8
  - @dyrected/sdk@1.0.5

## 1.0.8

### Patch Changes

- fix: use defineEventHandler and upgrade h3 to resolve deprecation warnings in Nuxt module

## 1.0.7

### Patch Changes

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt.
- Updated dependencies
  - @dyrected/admin@1.0.6
  - @dyrected/core@1.0.7
  - @dyrected/sdk@1.0.5

## 1.0.6

### Patch Changes

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture.
- Updated dependencies
  - @dyrected/admin@1.0.5
  - @dyrected/core@1.0.6
  - @dyrected/sdk@1.0.4

## 1.0.5

### Patch Changes

- Updated dependencies
  - @dyrected/core@1.0.5
  - @dyrected/sdk@1.0.3

## 1.0.4

### Patch Changes

- Standardized environment variable handling across Next.js and Nuxt (prioritizing `NEXT_PUBLIC_` and `NUXT_PUBLIC_` prefixes).
  Improved CLI initialization flow by saving AI setup prompts to `dyrected-ai-prompt.md` and refining the framework-specific setup instructions.
  Fixed type emission and dependency exports for `@dyrected/admin` to ensure stable builds in consuming applications.
  Added a drop-in `DyrectedAdmin` component for Next.js.
  Updated documentation with clearer self-hosted and cloud integration steps.
- Updated dependencies
  - @dyrected/core@1.0.4
  - @dyrected/admin@1.0.4
  - @dyrected/sdk@1.0.3

## 1.0.3

### Patch Changes

- Standardized environment variable handling across Next.js and Nuxt integrations.
  - CLI now generates .env templates with framework-specific prefixes (NEXT*PUBLIC* / NUXT*PUBLIC*).
  - Next.js and Nuxt clients automatically resolve these prefixed variables for client-side use.
  - Added a dedicated `@dyrected/next/admin` component for easy dashboard embedding in Next.js.
  - Fixed TypeScript type generation for the Admin UI package.
- Updated dependencies
  - @dyrected/admin@1.0.3
  - @dyrected/core@1.0.3
  - @dyrected/sdk@1.0.3

## 1.0.1

### Patch Changes

- bfc3468: Initial public release of the Dyrected CMS ecosystem.
- Updated dependencies [bfc3468]
  - @dyrected/admin@1.0.1
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
  - @dyrected/admin@1.0.0
  - @dyrected/core@1.0.0
  - @dyrected/sdk@1.0.0
