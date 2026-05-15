# @dyrected/vue

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
