# @dyrected/db-mysql

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
