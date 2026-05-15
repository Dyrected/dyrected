# @dyrected/db-mysql

## 5.0.0

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

## 4.0.2

### Patch Changes

- 5dd7403: fix: resolve SSR data fetching and dynamic route rendering in Nuxt and SDK
- Updated dependencies [5dd7403]
  - @dyrected/core@2.4.1

## 4.0.1

### Patch Changes

- fix: include dist directory in npm package

## 4.0.0

### Minor Changes

- Infrastructure standardization, MySQL adapter improvements, and SDK robustness testing.

### Patch Changes

- Updated dependencies
  - @dyrected/core@2.4.0

## 3.0.0

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
