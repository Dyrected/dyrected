---
"@dyrected/admin": minor
---

Promote operational table to canonical list view:

- **Default view synthesis in `getSchemas`**: `resolveSchemas` (`DyrectedProvider`) now synthesizes a `list` view (`layout: table`, columns from `admin.defaultColumns` or first 5 display fields) for collections without explicit `views`, so every collection has a table workspace and `CollectionRoute` can render without redirect.
- **Standardized preference keys**: Column, view-mode, and toolbar keys now use `layout:collections:${slug}:list` for the default view and `layout:collections:${slug}:view:${viewSlug}[:variant|:mode|:toolbar]` for named views (variant suffix for `cards`/`kanban`). Reads fall back to legacy keys (`view-pref:`, `view-mode:`, `view-columns:`, `view-toolbar:`) and migrate on next save.
- **CollectionRoute (Option B)**: `/collections/:slug` now renders `OperationalViewPage` directly with the first (synthesized) view instead of `CollectionListPage` (`list-view-v1`). `list-view-v1.tsx` is deprecated (kept for reference). Media collections still render `MediaPage`.
- **URL compat shim**: Legacy `?where=<json>` (FilterBuilder) and `?search=<term>` params are merged into the view's `filter` (`mergeFilters` / `contains` on first searchable field) so old shared links keep working.
- **Slot aliasing**: `admin.components.beforeList` → `beforeViewHeader`, `beforeListTable` → `beforeViewContent`, `afterListTable`/`afterList` → `afterViewContent` are now rendered via `AdminComponentSlot` with a stubbed `CollectionListSlotProps` so existing `collectionList` slot consumers continue to mount inside operational views. `collectionView` slots remain primary.

`list-view-v1.tsx` is marked `@deprecated` and will be removed in a future minor.
