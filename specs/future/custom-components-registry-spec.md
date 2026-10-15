# Admin Component Registry & Framework Bridge Specification

**Document Version:** 0.2.0 (Draft)
**Status:** Partially implemented. See [Implementation Status](#12-implementation-status).
**Scope:** `@dyrected/core`, `@dyrected/admin`, `@dyrected/react`, `@dyrected/vue`, `@dyrected/nuxt`, CLI type generation
**Part of:** Custom Admin Surfaces (1 of 4)

| # | Spec | Depends on |
| --- | --- | --- |
| **1** | **This spec: registry + bridge foundation** | none |
| 2 | [Custom Document Forms](./custom-document-forms-spec.md) | 1 |
| 3 | [Custom View Layouts](./custom-view-layouts-spec.md) | 1 |
| 4 | [Custom Admin Pages](./custom-admin-pages-spec.md) | 1 |

Plugin packaging is intentionally out of scope. It should be designed after 1–4 land, as a bundle of `{ config, components }` over these registries.

---

## 1. Context & Motivation

Dyrected's admin is React (`@dyrected/admin`). Host apps register custom UI by passing a `components` object to `<DyrectedAdmin>`. Config references a component by **string key**; the host supplies the real component under that key. This keeps config serializable, because it travels from the server to the admin over the API.

Today that pattern exists in four registries (see `packages/admin/src/types/admin-components.ts`):

| Registry | Config key | Effect |
| --- | --- | --- |
| `fields` | `field.admin.component` | replaces one field's input |
| `dashboard` | `admin.components.before/afterDashboard` | injects around the dashboard |
| `collectionList` | `collection.admin.components.beforeList…` | injects around the list |
| `collectionView` | `…components.collectionView` / `view.components` | injects around an operational view |

Every existing registry is either a **field override** or a **slot that injects around built-in UI**. Nothing replaces a form, a layout, or a page. Specs 2–4 add those. They share machinery that does not exist yet, and that machinery is this spec.

### Evidence from a real app

`thesweetunion/pages/admin.vue` hand-maps about 30 keys. The same component appears under several keys (`sendPassModal`, `passModal`, `rsvp_records.sendPassModal`) and a typo in a key fails silently. Custom Vue components also cannot use the form composables (`useField`, `useDyrectedForm`) without calling `provideDyrectedForm` themselves. A Vue island mounted by the bridge has no parent Vue tree for `inject` to reach.

## 2. Goals & Non-Goals

**Goals**

1. One `AdminComponents` shape that new registries (`forms`, `viewLayouts`, `pages`) extend uniformly.
2. Vue and React components receive the same ambient contexts through the same composable/hook names.
3. Registry keys are type-checked at author time and diagnosed at runtime.
4. A broken custom component degrades to a local error card, never a blank admin.

**Non-goals**

- Sandboxing. Custom components are first-party host code, not untrusted plugins.
- Runtime-defined (non-code) components. Declarative form/layout builders are a separate concern.
- Plugin discovery, manifests, marketplace.

## 3. Registry Shape

```ts
export interface AdminComponents {
  // existing
  fields?: Record<string, ComponentType<AdminFieldComponentProps>>;
  dashboard?: Record<string, ComponentType<DashboardSlotProps>>;
  collectionList?: Record<string, ComponentType<CollectionListSlotProps>>;
  collectionView?: Record<string, ComponentType<CollectionViewSlotProps>>;

  // new, defined in specs 2–4
  forms?: Record<string, ComponentType<AdminFormComponentProps>>;
  viewLayouts?: Record<string, ComponentType<AdminViewLayoutProps>>;
  pages?: Record<string, ComponentType<AdminPageProps>>;
}
```

### Rule for new registries: identity in props, everything else in composables

Existing slot components receive large prop bags (`CollectionViewSlotProps` carries `client`, `user`, `documents`, `permissions`, `urls`…). Adding a prop is a breaking-surface decision every time. New registries instead pass **identity only** (`collection`, `mode`, `viewSlug`, `slug`) and expose the rest through composables. New capabilities then ship as new composables, not new props. Existing registries are unchanged.

## 4. Ambient Context Across the Vue Bridge

### The problem

`wrapVueComponent` (`packages/vue/src/bridge/react-in-vue.ts`) mounts the Vue component with Vue's low-level `render(vnode, container)` and a shared `appContext`. There is no Vue parent component, so `provide()` calls made on the React side cannot reach `inject()` in the island. Today the only way to get a form controller into a Vue component is for the component to call `provideDyrectedForm` itself, which requires already having the controller.

### The design

The bridge wraps each island in a small `ContextProvider` Vue component whose `setup()` calls `provide()` for every ambient key, then renders the user component as its child:

```
React tree                       Vue island
──────────                       ──────────
<VueWrapper contexts={…}>  ─►    <ContextProvider provides={…}>
                                   └─ <UserComponent {...props} />
```

`contexts` is built from the React contexts the wrapper is mounted under (form controller, field path, view controller, page controller, admin session).

**Rule: provide stable controllers, never state snapshots.** Controllers are created once per surface and are subscribable (`getState()` / `subscribe()`, the same shape as `DyrectedFormController`). Vue's `provide()` runs once in `setup()`, so a snapshot would go stale. The composable subscribes and mirrors state into a `shallowRef`, which is what `useDyrectedForm` already does.

### Ambient keys (initial set)

| Key | Provided on | Consumed by |
| --- | --- | --- |
| `DYRECTED_FORM_CONTROLLER_KEY` | field, form | `useDyrectedForm`, `useField` (exists) |
| `DYRECTED_FIELD_PATH_KEY` | field | `useField` (exists) |
| `DYRECTED_DOCUMENT_KEY` | forms (spec 2) | `useDocumentForm` |
| `DYRECTED_VIEW_KEY` | view layouts, slots (spec 3) | `useCollectionView`, `useViewActions` |
| `DYRECTED_PAGE_KEY` | pages (spec 4) | `usePageMeta`, `usePageRoute` |
| `DYRECTED_ADMIN_KEY` | every island | `useAdminNavigate`, `useAdminNotify`, `useAccess`, `useAdminTheme` |

React needs no bridge. The same controllers sit behind React contexts and the hooks read them directly.

### Reverse bridge

Custom forms need to embed built-in React inputs (`<DyrectedField>`). The reverse bridge (Vue rendering a React component) already exists for `DyrectedRichText` and `DyrectedIcon`. **Risk:** React island → Vue island → React island means nested React roots. Context does not cross roots, so the reverse bridge must receive controllers explicitly, the same way the forward bridge does. The Nuxt adapter's React dedupe must keep all roots on one React copy.

## 5. Cross-Cutting Composables / Hooks

Identical names in `@dyrected/react` (hooks) and `@dyrected/vue` (composables; return shape follows the existing `VueStateify`).

| API | Returns | Why it must exist |
| --- | --- | --- |
| `useAdminNavigate()` | `navigate(to, opts?)` plus `to.collection(slug)`, `to.document(slug, id)`, `to.page(slug)`, `to.view(slug, viewSlug)` | Embedded mode uses `HashRouter`. A Nuxt or Next host has its own router. Components must not import `react-router` or guess URLs. |
| `useAdminNotify()` | `success/error/info(message)` | Toasts without importing the admin's toast library. |
| `useAccess()` | `can(operation, collection, doc?)` | UI gating that mirrors server access rules. |
| `useDyrected()` | SDK client (exists) | data access |
| `useDyrectedAuth()` | current user (exists) | identity |
| `useAdminSchemas()` | schemas (exists) | metadata |

`useAccess` is UI gating only. Server-side access rules remain the enforcement point, and this must be documented on every access-related API in specs 2–4.

## 6. Typed Keys

The CLI already generates `dyrected-types.ts` and the `Register` seam exists in the SDK. Extend generation to emit the keys the config references, per registry:

```ts
// dyrected-types.ts (generated)
declare module "@dyrected/sdk" {
  interface Register {
    componentKeys: {
      fields: "check_ins.checkInScanner" | "rsvp_records.sendWhatsApp";
      forms: "check_ins.scanForm";
      viewLayouts: "guests.seatingChart";
      pages: "door-checkin";
    };
  }
}
```

and a typed helper:

```ts
// Vue (pages/admin.vue)  /  React (admin.tsx): identical
const components = defineAdminComponents({
  fields: { "check_ins.checkInScanner": CheckInScanner },
  forms:  { "check_ins.scanForm": ScanForm },
  // ✗ compile error: "check_ins.scanFrom" is not a registered forms key
});
```

- Every key referenced in config must appear in the generated union.
- With `noUnusedKeys` semantics (configurable), a registered component that config never references is flagged.
- Apps that don't run generation fall back to `Record<string, …>`. Typing is opt-in and never breaks untyped usage.

## 7. Runtime Diagnostics & Failure Containment

1. **Unresolved key.** The admin resolves each referenced key at mount. If missing, render an inline placeholder ("Component `check_ins.scanForm` is not registered in `forms`") and emit a `ConfigDiagnostic` (`code: "component-unresolved"`) into the existing `configDiagnostics` channel. In development this is a console warning too. In production the placeholder is generic, without key names or stack.
2. **Unused registration.** In development, warn once when a registered key is never referenced.
3. **Error boundary.** Every custom mount, React or bridged Vue, sits in a boundary that renders a compact error card (key, message, retry). The surrounding shell (nav, header) keeps working. Errors go to the same logger the admin uses.
4. **Suspense.** Async components (`React.lazy`, Vue `defineAsyncComponent`) are supported. The bridge wraps islands in the admin's skeleton fallback.

## 8. Optional: Nuxt Auto-Registration (Phase 3, non-core)

Convention: `components/dyrected/<registry>/<key>.vue`, for example `components/dyrected/forms/check_ins.scanForm.vue`. The Nuxt module globs the directory and builds the registry, which removes the hand-maintained map. This is ergonomic sugar over the explicit `components` prop and must not be required.

## 9. Implementation Plan

**Phase 1 (bridge & contexts)**

- `ContextProvider` in the Vue bridge, plus the `DYRECTED_ADMIN_KEY` provider.
- `useAdminNavigate`, `useAdminNotify`, `useAccess` in admin `public`, re-exported by react and vue.
- Error boundary and unresolved-key placeholder.

**Phase 2 (typing & diagnostics)**

- `AdminComponents` gains the new registry slots (typed, unused until specs 2–4).
- Key generation and `defineAdminComponents`.
- `component-unresolved` diagnostic.

**Phase 3**

- Nuxt auto-registration.
- Docs and migration note for `admin.vue`-style maps.

## 10. Testing

- Vue bridge: island under `ContextProvider` resolves `useDyrectedForm()` with no manual `provideDyrectedForm`.
- Controller identity is stable across React re-renders (no re-provide, no stale state).
- Boundary isolates a throwing component from siblings, in React and in a bridged Vue island.
- Unresolved-key placeholder and diagnostic emission.
- Type tests: a wrong key fails `tsc`. Untyped apps still compile.

## 11. Open Questions

1. Should `displayCustomComponent` (detail views) join the unified registry? It resolves by name today. Verify which registry it reads and fold it in if it has its own.
2. Should `fields` keep its current per-field key scheme (`collection.field`) or also accept a global key? Keep as-is unless the generated union makes it awkward.
3. Is one global `ContextProvider` per island enough for the bridge, or do slot components need per-slot contexts (a slot inside a view has the view context, one inside the dashboard does not)? Proposal: yes, per-mount `contexts` argument.

## 12. Implementation Status

Audited against the codebase on 2026-10-15.

| Section | Item | Status | Evidence |
| --- | --- | --- | --- |
| 3 | Existing registries: `fields`, `dashboard`, `collectionList`, `collectionView` | **Done** | `AdminComponents` in `packages/admin/src/types/admin-components.ts` |
| 3 | New registry slots `forms`, `viewLayouts`, `pages`, `customComponents` | **Done** | `AdminComponents` in `packages/admin/src/types/admin-components.ts` |
| 4 | Forward bridge (React hosts a Vue island, shared host `appContext`) | **Done** | `wrapVueComponent` in `packages/vue/src/bridge/react-in-vue.ts` |
| 4 | `ContextProvider` wrapper that `provide()`s ambient keys to the island | **Done** | `BridgeContextProvider` in `packages/vue/src/bridge/react-in-vue.ts` |
| 4 | `DYRECTED_FORM_CONTROLLER_KEY`, `DYRECTED_FIELD_PATH_KEY` | **Done** | Provided automatically by bridge `ContextProvider` |
| 4 | `DYRECTED_CLIENT_KEY`, `ADMIN_THEME_CONTROLLER_KEY`, `DYRECTED_ADMIN_KEY` | **Done** | Exported in vue and provided automatically across bridge |
| 4 | Reverse bridge (Vue renders React) for `DyrectedRichText`, `DyrectedIcon` | **Done** | `packages/vue/src/components/` |
| 4 | Single React copy under Nuxt | **Done** | `vite.resolve.dedupe` in `packages/nuxt/src/module.ts` |
| 5 | `useDyrected`, `useDyrectedAuth`, `useAdminSchemas` | **Done** | react and vue packages |
| 5 | `useAdminTheme`, `useDyrectedForm`, `useField` | **Done** | react re-exports from `@dyrected/admin/public`; vue has its own |
| 5 | `useAdminNavigate`, `useAdminNotify`, `useAccess` | **Done** | Implemented across `@dyrected/admin/public`, `@dyrected/react`, `@dyrected/vue` |
| 6 | `Register` seam in the SDK | **Done** | `packages/sdk/src/index.ts` (`Register` and `RegisteredComponentKeys`) |
| 6 | `componentKeys` generation, `defineAdminComponents` | **Done** | `cli/src/utils/type-generator.ts` and `defineAdminComponents` in admin/react/vue |
| 7 | Error boundary around slot components | **Done** | `AdminComponentErrorBoundary` renders error card with retry button |
| 7 | Unresolved key warning & placeholder | **Done** | Dev-only placeholder and deduplicated warning |
| 7 | Unused-registration warning | **Not started** | |
| 7 | Suspense / skeleton fallback for async components | **Not started** | |
| 8 | Nuxt `components/dyrected/<registry>/<key>.vue` auto-registration | **Not started** | Deferred to Phase 3 |


### Spec updates implied by the audit

- §1: the "four registries" table is accurate. Keep it.
- §9 Phase 1: remove the error boundary from Phase 1 scope as a net-new item. It exists in a reduced form, so reword to "upgrade the slot boundary to render an error card with retry".
- §11 Q1: `displayCustomComponent` is a `detail.ts` helper in `@dyrected/core` that wraps `displayCustom(name, options)`. It resolves by name in the detail DSL, not through `AdminComponents`. Confirm whether detail views read a registry at all before folding it in.

## 13. Deferred: Path-Based Component References

**Decision (2026-10-15):** ship the typed `defineAdminComponents` map from §6 as the registration mechanism. Do not add per-component wrapper files.

**Future direction.** Replace the hand-kept map with path-based references, in the style of Payload CMS: config names a module path and export (`"/components/dyrected/ScanForm#default"`), and a build step resolves it into an import and generates the registry. This removes the central map and gives "go to definition" from config. It requires build tooling for Vite, Nuxt and Next, so it is deferred until the typed map has settled.

**Alternative under consideration.** Declaring metadata inside the component file itself (read by a build-time scan). It shares the same tooling cost, so it would be evaluated together with the path-based approach.

**Constraint on today's design.** Components must remain plain framework components with no registration code inside them, so that moving from the map to path references changes only where the key is declared.
