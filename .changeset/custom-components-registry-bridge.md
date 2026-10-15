---
"@dyrected/sdk": minor
"@dyrected/admin": minor
"@dyrected/vue": minor
"@dyrected/react": minor
"dyrected": minor
---

- **Custom Components Registry and Types**:
  - Added extensible `RegisteredComponentKeys` interface in `@dyrected/sdk` and documented declaration merging via `Register.componentKeys`.
  - Added identity prop interfaces (`AdminFormComponentProps`, `AdminViewLayoutProps`, `AdminPageProps`) and `defineAdminComponents` helper in `@dyrected/admin` and `@dyrected/react`.
  - Added `forms`, `viewLayouts`, `pages`, and `customComponents` registries to `AdminComponents`.
  - Updated CLI (`dyrected`) type generator to scan schemas and emit strongly-typed `componentKeys`.

- **Ambient Bridge Hooks & Context**:
  - Added `AdminBridgeProvider` and public hooks (`useAdminNavigate`, `useAdminNotify`, `useAccess`) exported from `@dyrected/admin/public`, `@dyrected/react`, and `@dyrected/vue`.
  - Added fallback routing support for standard paths and hash routing (`#/`).
  - Split `AdminBridgeContext` and `AdminBridgeProvider` into separate files for full React Fast Refresh compliance.

- **Vue Bridge Ambient Context Injection**:
  - Automated `BridgeContextProvider` in `@dyrected/vue`'s `wrapVueComponent` to pass form controllers, field path, client, theme, and admin bridge context into Vue's `provide()`/`inject()` tree with zero manual provider ceremony.
  - Reactive propagation using `shallowRef` and shallow-equality optimizations (`arePropsShallowEqual`, `areMapsEqual`) to prevent redundant Vue island re-renders.

- **Slot Resilience & Developer Experience**:
  - Enhanced `AdminComponentErrorBoundary` to render compact error cards with an inline "Retry" button.
  - Added missing component placeholders in development mode and deduplicated console warnings.
