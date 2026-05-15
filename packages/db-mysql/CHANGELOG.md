# @dyrected/db-mysql

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
