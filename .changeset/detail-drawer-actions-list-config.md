---
"@dyrected/core": minor
"@dyrected/admin": minor
"@dyrected/sdk": minor
---

Detail View drawers, workflow actions, and list config improvements:

- Join field rows (on the edit page) and detail-repeat rows (on the read-only Detail View) now open into a side drawer showing that row's own collection's Detail View config when it has one (falling back to the edit form otherwise), with a view/edit toggle and prev/next navigation between the already-loaded rows.
- Auto-generated Detail View schemas now render join fields as a table instead of badge pills, and table-layout repeat fields no longer duplicate field labels already shown in the column header.
- New `collection.actions` (`defineAction`/`displayAction`) let a collection define workflow actions that run against a single document independent of any view, rendered in the Detail View's header toolbar and/or inline via `displayAction(name)` — backed by a new view-less `POST /api/collections/:slug/actions/:action` route and a `client.collection(slug).runCollectionAction()` SDK method.
- New `collection.admin.filter` / `sort` / `metrics` / `groupBy` apply directly to a collection's default list view, without needing to define a separate `views` array and mark it as the default.
- Inline-editable Detail View fields now show their edit affordance by default on mobile instead of only on hover.
