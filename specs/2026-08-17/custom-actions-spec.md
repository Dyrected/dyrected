# Custom Actions Spec

## Overview

Dyrected's list view currently has hardcoded row actions (Edit, Delete) and a hardcoded bulk action (Bulk Delete). This spec defines a unified, extensible actions system that lets users add their own actions, control ordering, and hide built-in ones — entirely through props on `<DyrectedAdmin />`.

---

## Design Principles

- **All actions follow one system.** Row actions and bulk actions use the same registration pattern. Built-in actions (Edit, Delete, Bulk Delete) are refactored to be default actions within this system, not special-cased code.
- **All UI configuration lives on `<DyrectedAdmin />`** — not in `dyrected.config.ts`. The config file owns the data model (fields, access control, hooks). The Admin UI props own all UI behaviour.
- **One place, full control.** Ordering, hiding built-ins, and adding custom components are all expressed in a single array per collection.
- **Framework agnostic.** Vue components are supported via the existing Vue-to-React bridge, same as custom fields.

---

## Separation of Concerns

| | `dyrected.config.ts` | `<DyrectedAdmin />` props |
|---|---|---|
| Fields, access, hooks | ✓ | — |
| Row actions | — | ✓ |
| Bulk actions | — | ✓ |
| Custom field components | — | ✓ |

---

## Row Actions

### Built-in defaults

Each row renders the following actions by default, inline below the title:

- **`'edit'`** — navigates to the edit page
- **`'delete'`** — deletes the document with access control evaluation

When no `rowActions` are registered for a collection, the default order `['edit', 'delete']` applies.

### Registering row actions

Custom components and built-in sentinels are passed together in a single array under `components.rowActions`, keyed by collection name:

```tsx
import { PublishButton } from './components/PublishButton'
import { CopyLinkButton } from './components/CopyLinkButton'

<DyrectedAdmin
  components={{
    rowActions: {
      posts: [PublishButton, 'edit', CopyLinkButton, 'delete']
    }
  }}
/>
```

**Once an array is defined for a collection, it is the full truth.** Only what is in it renders, in that order. Omitting `'edit'` or `'delete'` hides them — no separate config flag needed.

### Ordering

Array order controls render order. Built-in sentinels can appear anywhere:

```tsx
// Custom action first, then edit, no delete
rowActions: {
  posts: [PublishButton, 'edit']
}

// Delete moved before edit
rowActions: {
  posts: ['delete', 'edit']
}
```

### Row action component interface

```ts
interface RowActionProps {
  doc: Record<string, any>  // the full document for that row
  collection: string        // the collection name
}
```

The component has full React control — modals, clipboard, mutations, navigation, etc.

```tsx
// components/PublishButton.tsx
export function PublishButton({ doc, collection }: RowActionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Publish</button>
      <PublishModal doc={doc} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

---

## Bulk Actions

### Built-in defaults

When one or more rows are selected, a bulk action bar appears with:

- **`'delete'`** — deletes all selected documents, respecting per-document access control

When no `bulkActions` are registered for a collection, the default `['delete']` applies.

### Registering bulk actions

```tsx
import { BulkPublishButton } from './components/BulkPublishButton'
import { BulkArchiveButton } from './components/BulkArchiveButton'

<DyrectedAdmin
  components={{
    bulkActions: {
      posts: [BulkPublishButton, 'delete', BulkArchiveButton]
    }
  }}
/>
```

Same rules apply — the array is the full truth, sentinels control built-in placement.

### Bulk action component interface

```ts
interface BulkActionProps {
  selectedIds: string[]    // IDs of all currently selected documents
  collection: string       // the collection name
  onComplete?: () => void  // call this to clear selection and refetch after mutating
}
```

```tsx
// components/BulkPublishButton.tsx
export function BulkPublishButton({ selectedIds, collection, onComplete }: BulkActionProps) {
  const mutation = useMutation({
    mutationFn: () => fetch(`/api/${collection}/bulk-publish`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds }),
    }),
    onSuccess: onComplete,
  })

  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      Publish {selectedIds.length} items
    </button>
  )
}
```

---

## Full Props Shape

### `AdminUIProps.components`

```ts
components?: {
  fields?: Record<string, React.ComponentType<any>>
  rowActions?: Record<string, (React.ComponentType<RowActionProps> | 'edit' | 'delete')[]>
  bulkActions?: Record<string, (React.ComponentType<BulkActionProps> | 'delete')[]>
}
```

### No changes to `CollectionConfig`

The `admin` block in `dyrected.config.ts` gains no new action-related properties. Action configuration is UI-only and belongs entirely on `<DyrectedAdmin />`.

---

## Implementation Notes

- The hardcoded Edit/Delete row actions in `list-page.tsx` (~lines 277-303) should be refactored into renderable default entries, resolved when no `rowActions[collection]` array is provided.
- The inline bulk delete in `list-page.tsx` (~lines 477-509) should follow the same pattern — a default resolved when no `bulkActions[collection]` array is provided.
- The `DataTable` `bulkActions` prop currently takes `(selectedIds: string[]) => React.ReactNode`. This should be updated to accept the resolved component list from the list page.
- `onComplete` for bulk actions should trigger selection reset and list query invalidation — the same behaviour the current bulk delete already does.

---

## What This Is Not

- There is no config-level route or handler registration. Actions that call an API define their own fetch/mutation logic inside the component.
- There are no TypeScript errors for omitting built-in sentinels. If `'edit'` is left out of the array, the edit action simply does not render.
