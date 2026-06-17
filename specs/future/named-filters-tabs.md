# Named Filters & List Tabs (Future)

## Overview

Allow collection authors to define named filter presets in config. Each preset appears as a **tab** above the list table, giving users one-click access to common filtered views — e.g. "Published", "Drafts", "Mine", "This Week".

This builds directly on the dynamic filter system defined in `../list-filters-spec.md`.

---

## Concept

```ts
// dyrected.config.ts
{
  slug: 'posts',
  admin: {
    tabs: [
      {
        label: 'All',
        // no where clause — shows everything
      },
      {
        label: 'Published',
        where: { status: { equals: 'published' } },
      },
      {
        label: 'Drafts',
        where: { status: { equals: 'draft' } },
      },
      {
        label: 'Mine',
        where: { author: { equals: '{{user.sub}}' } }, // runtime interpolation TBD
      },
    ]
  }
}
```

The active tab's `where` clause is merged with any active dynamic filters from the filter builder and sent to the backend as a single combined `WhereClause`.

---

## Key Design Questions (unresolved)

- **Tab + filter interaction** — when a tab is active and the user adds a dynamic filter, do they combine (AND) or does the dynamic filter replace the tab's clause?
- **Runtime interpolation** — `{{user.sub}}` style values that resolve to the current user at render time. Requires a small template resolver on the frontend.
- **URL state** — active tab should be in the URL (e.g. `?tab=published`) separate from `?where=` so the two can coexist cleanly.
- **Default tab** — which tab is active on first load? First in the array, or whichever matches the current `?tab=` param.
- **Tab counts** — optionally show the document count per tab (requires one extra count query per tab, so opt-in).

---

## Relationship to Dynamic Filters

Named filter tabs are a preset entry point into the same filter system. They are not a separate feature — they write to the same `where` that the filter builder uses. The backend sees no difference.
