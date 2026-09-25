---
"@dyrected/core": patch
"@dyrected/admin": patch
---

Fix operational workspace view action resolution and optional field null validation.

- **Workspace view actions (`@dyrected/core`):** Support operational view actions defined inside `config.admin.navigation` (such as `defineWorkspace` views targeting a collection via `view.collection`, `item.collection`, or `addToCollection`). `runViewAction` and action route registration now search both `collection.views` and all matching workspace views, preventing `Action "<action>" was not found in view "<viewSlug>"` errors.
- **Optional field null validation (`@dyrected/admin`):** Updated `buildSchemaShape` so optional fields accept `null` (`.nullable().optional().or(z.literal(""))`), resolving spurious `Expected string, received null` validation errors when saving existing records with null database values.
