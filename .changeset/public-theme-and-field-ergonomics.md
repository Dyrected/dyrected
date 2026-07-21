---
"@dyrected/admin": patch
---

Extend the public admin API with theme controller support and field-path ergonomics:

- Introduce `createAdminThemeController` as a framework-agnostic theme state foundation for React, Vue, and other host apps.
- Export the public React theme adapter surface:
  - `AdminThemeProvider`
  - `AdminThemedRoot`
  - `useAdminTheme`
- Export pure theme helpers:
  - `resolveAdminTheme`
  - `adminThemeClassName`
  - `getSystemAdminTheme`
- Add higher-level nested field path helpers for custom field authors:
  - `normalizeFieldPath`
  - `getFieldPathSegments`
  - `joinFieldPath`
  - `getParentFieldPath`
- Extend `useField` with object/array convenience helpers so nested custom fields can work with child and item paths without hand-building dot-path strings.
- Document the controller-first public API pattern in `packages/admin/docs/public-controller-pattern.md`.
