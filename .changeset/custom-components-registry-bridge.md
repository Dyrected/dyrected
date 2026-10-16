---
"@dyrected/core": minor
"@dyrected/sdk": minor
"@dyrected/admin": minor
"@dyrected/vue": minor
"@dyrected/react": minor
"@dyrected/nuxt": minor
"dyrected": minor
---

Custom admin components are now easier to write, harder to get wrong, and no longer need provider boilerplate in Vue.

**For app developers**

- **Vue custom components just work.** `useDyrectedForm()`, `useField()`, `useAdminTheme()` and the new `useAdminNavigate()`, `useAdminNotify()` and `useAccess()` work inside any custom field or slot component with no `provideDyrectedForm` call. Prop updates patch the component in place, so local state and input focus are kept.
- **New hooks and composables.** `useAdminNavigate()` (`navigate` plus `to.collection/document/view/page`), `useAdminNotify()` (`success/error/info`) and `useAccess().can(operation, collection, doc?)` ship in `@dyrected/react` and `@dyrected/vue`. They are marked experimental. `useAccess` is a UI hint only; the server stays authoritative.
- **Typed component keys.** Run `npx dyrected generate:types` and `defineAdminComponents({ fields: { ... } })` checks your keys against what your schema references. Untyped apps are unaffected.
- **Better failure modes.** A component that throws shows an inline error card with a Retry button, and the rest of the admin keeps working. This includes errors thrown inside a Vue component. An unregistered key shows a placeholder in development and a warning (a generic placeholder in production).
- **Unused registrations are flagged.** In development the admin warns once for each registered component the schema never references. Pass `warnUnusedComponents={false}` (or `:warn-unused-components="false"` in Vue) to silence it.
- **Lazy components.** `React.lazy` and `defineAsyncComponent` components show a skeleton while they load.
- **Nuxt auto-registration.** Drop a file at `components/dyrected/<registry>/<key>.vue` (for example `components/dyrected/fields/check_ins.scanner.vue`) and it is registered under that key. The `components` prop still wins on a clash, and nothing changes if you don't use the folder.

**For plugin and integration authors**

- `AdminComponents` gains `forms`, `viewLayouts`, `pages` and `customComponents`, plus the identity prop types `AdminFormComponentProps`, `AdminViewLayoutProps` and `AdminPageProps`. The first three are declared but not rendered yet; they are reserved for the custom forms, view layouts and pages work.
- `@dyrected/sdk` exports `RegisteredComponentKeys`, and `Register` accepts `componentKeys`.
- `@dyrected/core` exports `collectReferencedComponentKeys(schema)`, the scan the CLI and the admin both use.
- `@dyrected/admin/public` exports `AdminBridgeProvider`, `useAdminBridgeContext`, `AdminComponentErrorBoundary`, `AdminComponentFallback` and the new hooks.

**Upgrade notes**

- No breaking changes. Existing registries (`fields`, `dashboard`, `collectionList`, `collectionView`) keep their props.
- Regenerate types to get `Register.componentKeys`. If you hand-maintain a large `components` map in `admin.vue`, you can move entries into `components/dyrected/<registry>/` one at a time.
