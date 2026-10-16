---
"@dyrected/core": minor
"@dyrected/admin": minor
"@dyrected/react": minor
"@dyrected/vue": minor
---

Operational views can now render documents with your own component, while Dyrected keeps the header, KPI metrics, search, pagination, selection, bulk actions and action dialogs.

**For app developers**

- **Add a custom layout.** Define a view with `layout: "custom"` and a `component` key, then register a component under that key in `components.viewLayouts`:

  ```ts
  defineView({
    slug: "seating",
    label: "Seating Chart",
    layout: "custom",
    component: "guests.seatingChart",
    options: { tableField: "tableNumber" },
    data: { fetchAll: true },
  })
  ```

- **Read everything through a hook.** `useCollectionView()` gives you `documents`, `total`, `isLoading`, `pagination`, `sort`, `search`, `filters`, `selection`, `permissions` and `open()`. `useViewActions()` runs the view's actions and shows Dyrected's own confirm dialog and input form. `useGroupedDocuments(field)` groups documents with select and relationship labels resolved. The same three exist in `@dyrected/vue` as composables, with state as refs, and work with no manual `provide`.
- **Save changes from your layout.** `updateDocument(id, patch)` updates optimistically and rolls back with an error toast if the server rejects the change. Hooks, access rules and validation still run.
- **Load everything when you need to.** Set `data.fetchAll` to load up to 1,000 documents. Past that, the user sees a notice that the list was truncated.
- **Safe fallback.** If the component key is not registered, the view shows a message with a **Show as table** button instead of a blank page.

**For plugin and integration authors**

- `ViewLayout` gains `"custom"`, and `@dyrected/core` exports `CustomViewConfig`, `CustomViewDataConfig`, `defineCustomView` and `CUSTOM_VIEW_FETCH_ALL_LIMIT`. Views serialized to the admin now carry `component`, `options` and `data`.
- `@dyrected/admin/public` exports `ViewControllerContext`, `createViewController` and `DYRECTED_VIEW_KEY` for hosts that embed the controller. The controller is subscribable, like the form controller.
- `dyrected generate-types` now includes custom layout components in `Register.componentKeys.viewLayouts`.

**Upgrade notes**

- No breaking changes. Existing layouts are untouched.
- The hooks are marked experimental. Built-in layouts do not use them yet.
- A custom view's `component` is required. `defineView` throws at config load if it is missing.
