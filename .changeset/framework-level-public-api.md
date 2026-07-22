---
"@dyrected/admin": patch
"@dyrected/vue": patch
"@dyrected/react": patch
---

Implemented the framework-level public API first, which was the right prerequisite for docs.
Added a framework-level public API across the admin, React, and Vue packages.

- `@dyrected/admin` now ships a side-effect-free public entrypoint for controllers, helpers, and React admin primitives, without pulling in the admin app entry or its CSS.
- `@dyrected/react` now exposes the intended top-level admin and media hooks, and re-exports the form, field, and theme React APIs from the admin public surface.
- `@dyrected/vue` now exposes first-class composables for admin schemas, media flows, forms, fields, and theming, and includes a Vue module shim so plain TypeScript validation works.
