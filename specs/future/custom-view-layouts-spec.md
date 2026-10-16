# Custom View Layouts Specification

**Document Version:** 0.1.0 (Draft)
**Status:** Phases 1 and 2 implemented (custom layouts, public API, built-ins on the controller). Docs remain. See [Implementation Status](#12-implementation-status).
**Scope:** `@dyrected/core` (view types), `@dyrected/admin` (view engine), `@dyrected/react`, `@dyrected/vue`
**Part of:** Custom Admin Surfaces (3 of 4). Depends on [Component Registry & Bridge](./custom-components-registry-spec.md).

---

## 1. Context & Motivation

Operational views (`defineView`) render records through a closed set of layouts:

```ts
type ViewLayout = 'table' | 'spreadsheet' | 'kanban' | 'calendar' | 'gantt' | 'cards';
```

Everything around a layout is shared: the header, the KPI `metrics`, the filter toolbar, faceted filters, bulk actions, row actions (`defineAction`), badges, access rules and navigation. A team that needs a *seating chart*, a *map*, or a *floor plan* today has two choices. They can abuse `beforeViewContent` slots next to a table they don't want, or build a standalone page and lose all of that shared machinery.

The goal is to let a view say `layout: 'custom'` and supply the renderer, while the host keeps owning data, filters, actions and chrome.

## 2. Goals & Non-Goals

**Goals**
1. A custom layout is a first-class `ViewLayout` with the same config surface (`filter`, `sort`, `metrics`, `actions`, `access`, `badge`).
2. The host owns fetching, filtering, pagination, selection and action execution. The layout only *renders documents*.
3. Built-in layouts and custom layouts consume the **same** contract, so the contract stays honest.
4. Identical hook/composable API for Vue and React.

**Non-goals**
- Letting users switch between a custom layout and built-ins within one view (see Open Questions).
- A layout SDK for third-party distribution (that is plugin packaging).

## 3. Configuration

```ts
export interface CustomViewConfig extends ViewConfigBase {
  layout: "custom";
  /** Key in AdminComponents.viewLayouts. */
  component: string;
  /** Serializable options handed to the component via useCollectionView().config.options. */
  options?: Record<string, unknown>;
  /** Paging strategy the host uses to load documents. Default { pageSize: 50 }. */
  data?: { pageSize?: number; fetchAll?: boolean };
}

defineView({
  slug: "seating",
  label: "Seating Chart",
  layout: "custom",
  component: "guests.seatingChart",
  options: { tableField: "tableNumber", capacityField: "seats" },
  filter: { attending: { equals: true } },
  metrics: [/* rendered by the host above the layout */],
  actions: [assignTable],
});
```

`ViewLayout` gains `'custom'`, `defineView` gains an overload, and a `defineCustomView` convenience joins the existing `defineKanbanView` family. `component` is required when `layout` is `'custom'`. This is enforced by types and by config diagnostics.

`fetchAll` exists because kanban and calendar-style layouts need the full set, not one page. The host loads all pages up to a safety cap (proposal: 1,000 documents, then a visible truncation notice).

## 4. Responsibility Split

| Concern | Owner |
|---|---|
| Header, title, breadcrumbs, header actions | host |
| KPI `metrics` row | host |
| Toolbar: search, faceted filters, saved/named filters | host |
| Query, pagination, sorting, refetch | host |
| Selection state, bulk action bar | host |
| Action execution: confirm dialog, modal `fields`, access | host |
| **Rendering documents** | **layout** |
| Layout-specific interaction (drag, zoom, pan) | layout |
| Mutations from that interaction (move card, seat guest) | layout, via host API |

## 5. Hooks / Composables

Props carry identity only:

```ts
interface AdminViewLayoutProps { collection: string; viewSlug: string }
```

### `useCollectionView()`

```ts
interface CollectionViewApi {
  collection: CollectionConfig;
  viewSlug: string;
  config: { columns?: string[]; groupBy?: string; options?: Record<string, unknown>; /* serialized view */ };

  documents: Doc[];
  total: number;
  isLoading: boolean;          // first load
  isFetching: boolean;         // background refetch
  error?: DyrectedError;
  refetch(): Promise<void>;

  pagination: { page: number; pageSize: number; totalPages: number; setPage(n: number): void };
  sort: { value?: { field: string; direction: "asc" | "desc" }; set(next): void };
  search: { value: string; set(q: string): void };
  filters: { where: WhereClause; set(next: WhereClause): void };   // toolbar-owned; read-mostly

  selection: { ids: Set<string>; docs: Doc[]; toggle(id): void; set(ids): void; clear(): void };

  updateDocument(id: string, patch: Record<string, unknown>): Promise<Doc>;   // optimistic, rolls back on failure

  open(id: string, mode?: "view" | "edit" | "drawer"): void;
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean };
  urls: { collection: string; create: string };
}
```

`updateDocument` is what drag-and-drop layouts need. The existing kanban implements optimistic move logic internally (`use-grouped-view-data.ts`), and this promotes that behavior to public API. It goes through the normal update path (hooks, access, validation). A rejected update rolls back and shows an error toast.

### `useViewActions()`

```ts
interface ViewActionsApi {
  actions: ResolvedAction[];                        // filtered by access, with type/icon/label
  run(name: string, docs?: Doc[], input?: Record<string, unknown>): Promise<ActionResult>;
  isRunning(name: string): boolean;
}
```

`run` triggers the host's confirm dialog and modal `fields` UI, so a custom layout never re-implements confirmation. `docs` defaults to the current selection. Row actions pass one document, for example `run("assignTable", [guest], { tableNumber: 4 })` to skip the modal when input is supplied programmatically.

### `useGroupedDocuments(groupBy)`

Extracted from the kanban implementation: returns `{ groups: { key, label, docs }[]; ungrouped }` with relationship/select label resolution. Optional sugar. Custom layouts can group themselves.

## 6. Framework Examples

### Vue (Nuxt): seating chart

```vue
<!-- components/admin/SeatingChart.vue -->
<script setup lang="ts">
import { useCollectionView, useViewActions } from "@dyrected/vue";

const { documents, config, updateDocument, isLoading } = useCollectionView();
const { run } = useViewActions();
const tableField = config.value.options?.tableField as string;

const byTable = computed(() => Object.groupBy(documents.value, (g) => String(g[tableField] ?? "unassigned")));

const onDrop = (guestId: string, table: string) => updateDocument(guestId, { [tableField]: table });
</script>

<template>
  <SeatingSkeleton v-if="isLoading" />
  <FloorPlan v-else :tables="byTable" @drop="onDrop" @assign="(g) => run('assignTable', [g])" />
</template>
```

### React

```tsx
function SeatingChart() {
  const { documents, config, updateDocument, isLoading } = useCollectionView();
  const { run } = useViewActions();
  const tableField = config.options?.tableField as string;
  const byTable = useMemo(() => groupBy(documents, tableField), [documents, tableField]);
  if (isLoading) return <SeatingSkeleton />;
  return <FloorPlan tables={byTable} onDrop={(id, t) => updateDocument(id, { [tableField]: t })} onAssign={(g) => run("assignTable", [g])} />;
}
```

## 7. Dogfooding Built-ins

Kanban, calendar, gantt and cards should move onto `useCollectionView()` / `useViewActions()` (kanban already has most of it internally) and be registered as internal entries of the same `viewLayouts` registry. Benefits:
- The public contract is proven by real layouts and cannot silently lack something built-ins need.
- The navigation customizer and view-filter builder resolve layout capabilities from one place.

This is a refactor, not a prerequisite. Phase 1 can ship custom layouts with built-ins untouched, and Phase 2 migrates them.

## 8. Interaction With Existing Features

| Feature | Behavior with `layout: 'custom'` |
|---|---|
| `columns` | still in `config`. A layout may ignore it. The column-preferences UI is hidden for custom layouts. |
| `groupBy` | passed through in `config` for the layout to use. |
| Slots (`beforeViewContent` etc.) | still render around the custom layout. |
| View filter builder and navigation customizer | list custom views like any view. Layout-specific controls (column picker) are hidden. |
| `access.read` | gates the route before the component mounts. |
| Loading skeleton | host shows a generic skeleton until first load completes. The layout may render its own via `isLoading`. |
| Unresolved `component` key | render a placeholder card with a "Show as table" action (falls back to the built-in table). As decided in the registry spec §7.1, no `ConfigDiagnostic` is emitted: the server cannot know which components the host registered. |

## 9. Implementation Plan

1. Core: `'custom'` in `ViewLayout`, `CustomViewConfig`, `defineCustomView`, config diagnostics (`component` required, key format).
2. Admin: promote the view data layer (query, filters, selection, grouped data, optimistic update, action runner) to a `ViewController` created per view page. Provide it via React context.
3. `useCollectionView`, `useViewActions`, `useGroupedDocuments` in admin `public`. React re-exports. Vue composables and ambient key `DYRECTED_VIEW_KEY`.
4. Render dispatch: `viewLayouts[component]` when `layout === 'custom'`.
5. Phase 2: migrate built-ins onto the controller and register them.
6. Docs and a "seating chart" recipe.

## 10. Testing

- Custom layout receives documents and reacts to toolbar filter changes and pagination.
- `updateDocument` optimistic apply and rollback on rejected update. Server hooks run.
- `run()` shows the host confirm dialog, respects action `access`, and passes `input` to `fields`.
- `fetchAll` cap and truncation notice.
- Existing slot tests (`operational-view-slots.test.tsx`) pass unchanged.
- Vue island resolves `useCollectionView()` without manual provide.

## 11. Open Questions

1. **Layout switcher.** Should a collection be able to offer `layouts: ['table', { component, label, icon }]` so users toggle between built-in and custom within one view (there is an existing `useLayoutPreference`)? Deferred to keep v1 small, but the config shape above does not preclude it.
2. **Page size vs fetchAll defaults.** Is a 1,000-document cap right for `fetchAll`? Kanban today presumably has its own limit; align with it.
3. **Option validation.** `options` is an untyped bag. Should a layout be able to declare an options schema for config diagnostics? Likely a plugin-packaging concern.

## 12. Implementation Status

| Section | Item | Status | Evidence |
| --- | --- | --- | --- |
| 3 | `'custom'` layout, `CustomViewConfig`, `defineCustomView`, `defineView` overload | **Done** | `packages/core/src/types/views.ts` |
| 3 | `component` required for `layout: "custom"` | **Done** | Required by the type, and `defineView`/`defineCustomView` throw at definition time |
| 3 | `component`, `options`, `data` reach the admin | **Done** | `serializeViewForApi` in `packages/core/src/router.ts` |
| 3 | `data.fetchAll` with 1,000-document cap and truncation notice | **Done** | `CUSTOM_VIEW_FETCH_ALL_LIMIT`; `use-custom-view-session.ts`, `custom-layout.tsx` |
| 5 | `useCollectionView()`, `useViewActions()`, `useGroupedDocuments()` (React) | **Done** | `packages/admin/src/hooks/use-collection-view.ts`, re-exported by `@dyrected/react` |
| 5 | Vue composables and `DYRECTED_VIEW_KEY` | **Done** | `packages/vue/src/composables/useCollectionView.ts`, provided by the bridge |
| 5 | Optimistic `updateDocument` with rollback | **Done** | Goes through `collection.update`, so hooks, access and validation run |
| 5 | `run()` through the host confirm dialog and input form, `input` to skip the form | **Done** | `runCustomLayoutAction` in `operational-view-page.tsx` |
| 8 | Unresolved key: placeholder with "Show as table" | **Done** | `custom-layout.tsx` |
| 8 | Host skeleton until first load | **Done** | `custom-layout.tsx` |
| 4 | Host toolbar: search, faceted field filters, match logic, metric-card filters, pagination, bulk bar | **Done** | `toolbar/use-view-toolbar-state.ts` and `toolbar/view-filter-toolbar.tsx`, shared by table, kanban, cards and custom layouts |
| 7 | One controller per view, provided to every layout and extension slot | **Done** | `use-view-controller.ts`; `ViewControllerContext` wraps the whole page |
| 7 | Table, spreadsheet, kanban, cards and calendar publish their documents | **Done** | `usePublishViewData` in each layout. Slots and `useCollectionView()` see what the layout shows |
| 7 | Built-ins run actions through the controller | **Done** | `useLayoutActions()`; no action props are threaded to layouts any more |
| 7 | Kanban and calendar save through `updateDocument` | **Done** | Optimistic overlay on every layout; failures roll back |
| 7 | Layout registry with capabilities | **Done** | `layout-registry.ts`; the page, the header icon and the navigation customizer read it |
| 7 | App replaces a built-in layout by registering under its name | **Done** | `viewLayouts.kanban`, `viewLayouts.table`, … render in the host shell |
| 7 | Gantt renderer | **Not started** | `gantt` is accepted and renders as a table, as before. The registry records this as `rendersAs: "table"` |
| 9.6 | Docs and a "seating chart" recipe | **Not started** | Needs the `apps/docs` human-verified flow |

### Phase 2 notes

- **Data stays where it is loaded.** Table and spreadsheet keep their server-paginated TanStack tables, and kanban keeps one request per column. They publish what they loaded rather than being forced through a single flat query, so kanban's per-column totals and "load more" are unchanged. For kanban, `documents` is every loaded column flattened and `total` is the sum of the column totals.
- **Selection is the layout's own for table and spreadsheet.** Their row selection is a TanStack concern, so `useCollectionView().selection` reflects it only for custom layouts.
- **`setSort` and `setFilters` need a data owner that supports them.** Custom layouts do; the built-ins ignore them.
- **`updateDocument` takes `{ silent: true }`** to skip the error toast when the caller reports failures itself. Kanban and calendar use it.
- **Slots receive real documents.** `documents` and `isLoading` on slot props used to be a fixed empty list. They now carry the active layout's documents.

### Behaviour notes

- `filters.set(where)` adds a **layout-owned** filter that is AND-merged with the toolbar's; the toolbar's own filters stay read-only to the layout. `set(undefined)` clears it.
- `run()` resolves `true` once the action was dispatched. When a confirm dialog is shown it resolves right away and progress is reported through `isRunning()`.
- The controller is subscribable (`getState()` / `subscribe()`), the same shape as `DyrectedFormController`, so the Vue bridge provides it directly instead of a snapshot.
- Custom views are configuration-only. The navigation customizer does not offer `custom`, because a view created in the UI has no component.
