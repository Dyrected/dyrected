# List Grouping / Section By Field (Future)

## Overview

Allow the list view to visually group rows by the value of a field — similar to grouping by category, status, or author. Each distinct value becomes a collapsible section header, with the matching documents listed beneath it.

---

## Concept

```ts
// dyrected.config.ts
{
  slug: 'posts',
  admin: {
    groupBy: 'category',  // field name to group by
  }
}
```

The list renders as:

```
▾ Technology  (12)
  Post A
  Post B
  ...

▾ Design  (8)
  Post C
  ...

▾ Uncategorized  (3)
  Post D
  ...
```

---

## Key Design Questions (unresolved)

- **Frontend vs backend grouping** — grouping purely on the frontend (from a full result set) is simple but breaks with pagination. Backend grouping (grouped queries per value) is correct but requires multiple requests or a more complex query. Most likely: fetch all distinct values first, then paginate within each group lazily.
- **Relation fields** — grouping by a relationship field (e.g. `category` which is a relation to a `categories` collection) needs to resolve the related document's title, not just the ID.
- **Sort within groups** — each group should respect the collection's default sort independently.
- **Collapsed state** — should collapsed/expanded state persist in the URL or just in local component state?
- **Grouping + filtering** — when dynamic filters are active, grouping should apply to the filtered set. The two features need to compose cleanly.
- **Empty groups** — whether to show groups with zero results (useful for status-based grouping, e.g. always show "Draft" even if empty).
- **User-controlled grouping** — future consideration: let the user change the group-by field from the UI rather than only from config.

---

## Relationship to Filters

Grouping is orthogonal to filtering — filters reduce the set, grouping organises what remains. Both can be active simultaneously.
