# List Filters Spec

## Overview

Add a dynamic filter builder to the collection list page. Users pick a field, an operator, and a value — the list filters server-side via the existing `WhereClause` DSL. Filter state lives in the URL so it survives refresh and can be shared.

---

## What Already Exists

This feature builds directly on infrastructure that is already in place:

- **`WhereClause` DSL** — `packages/core/src/utils/parse-where.ts` defines operators (`equals`, `not_equals`, `contains`, `starts_with`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `exists`) and translates to SQL (Postgres, MySQL, SQLite) and MongoDB
- **SDK `find()`** — already accepts a `where` object, JSON-stringifies it, and sends it as a URL param to the backend
- **List page query** — `client.collection(slug).find({ page, limit: 20, depth: 1 }).exec()` just needs `where` added to this call

The work is: filter builder UI + URL state + `filterable` config flag + backend validation.

---

## Design Principles

- **Config wins for field-level control** — `filterable` lives in `dyrected.config.ts` because the backend must validate it. A field marked non-filterable must be rejected server-side, not just hidden from the UI.
- **URL-based state** — filters serialize to `?where=<JSON>` so they survive refresh and can be shared or bookmarked.
- **Flat rules only** — all rules are AND'd together. No nested groups for now.
- **All fields filterable by default** — users opt specific fields out.

---

## Config Changes

### Field-level opt-out

```ts
// dyrected.config.ts
{
  name: 'internalNotes',
  type: 'textarea',
  admin: {
    filterable: false
  }
}
```

`filterable` defaults to `true` for all field types. Setting it to `false` hides the field from the filter UI and causes the backend to strip it from any incoming `where` clause.

### Collection-level opt-out

```ts
{
  slug: 'auditLogs',
  admin: {
    filterable: false  // disables the filter UI entirely for this collection
  }
}
```

### Fields that are never filterable

Regardless of config, the following field types are excluded from filtering:

| Field type | Reason |
|---|---|
| `password` | Security — never expose |
| `richText` | Unstructured HTML, not meaningful to query |
| `json` | Arbitrary structure, no useful operator set |
| `file` / `image` | Binary references, not text-queryable |
| `join` | Computed virtual field, no DB column |
| `collapsible` | Layout-only, not a real field |

---

## Operators Per Field Type

The filter UI exposes only the operators that make sense for each field type.

| Field type | Allowed operators |
|---|---|
| `text`, `textarea`, `email`, `url`, `slug`, `code` | `equals`, `not_equals`, `contains`, `starts_with`, `exists` |
| `number` | `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `exists` |
| `date`, `datetime` | `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `exists` |
| `boolean` | `equals` |
| `select`, `radio` | `equals`, `not_equals`, `in`, `not_in`, `exists` |
| `multiSelect` | `in`, `not_in`, `exists` |
| `relationship` | `equals`, `not_equals`, `in`, `not_in`, `exists` |
| `color` | `equals`, `not_equals`, `exists` |

The `exists` operator renders no value input — it maps to "is empty" (`exists: false`) and "is not empty" (`exists: true`).

---

## Filter Rule Shape (frontend state)

```ts
interface FilterRule {
  field: string            // field name from the schema
  operator: WhereOperatorName
  value: any               // undefined when operator is 'exists'
}
```

An array of `FilterRule[]` is AND'd together and converted to a `WhereClause` before being passed to `find()`:

```ts
// [{ field: 'status', operator: 'equals', value: 'published' }, { field: 'views', operator: 'gt', value: 1000 }]
// →
{ status: { equals: 'published' }, views: { gt: 1000 } }
```

---

## URL Serialization

Filter state is stored in the `where` query param as a JSON-stringified `WhereClause`:

```
/admin/collections/posts?where={"status":{"equals":"published"},"views":{"gt":1000}}
```

The SDK's `find()` already accepts and serializes `where` objects — the list page just needs to read the param from the URL and pass it through.

When no filters are active, the `where` param is absent from the URL.

---

## Value Input Per Operator

The value input morphs based on the field type and operator:

| Context | Input |
|---|---|
| `exists` (any type) | No input — renders "is empty" / "is not empty" label |
| `boolean` | Select: True / False |
| `select` / `radio` | Select using the field's defined options |
| `multiSelect`, `in` / `not_in` | Multi-select using the field's defined options |
| `relationship` | Searchable dropdown — lazy loads documents from the related collection using the related collection's `useAsTitle` field as the label; stores the document ID as the value |
| `date` / `datetime` | Date picker |
| `number` | Number input |
| `text` and variants | Text input |

---

## List Page Changes

### Query

```ts
// Before
queryKey: ['collection', slug, page]
queryFn: () => client.collection(slug).find({ page, limit: 20, depth: 1 }).exec()

// After
queryKey: ['collection', slug, page, where]
queryFn: () => client.collection(slug).find({ page, limit: 20, depth: 1, where }).exec()
```

`where` is derived from the URL `where` param. When filters change, the URL updates, the query key changes, and the list refetches. Page resets to 1 when filters change.

### UI

- A **Filter** button above the table opens the filter builder panel
- Each active rule shows: field dropdown → operator dropdown → value input → remove button
- **Add filter** button appends a new empty rule
- **Clear all** button removes all rules and clears the URL param
- Active filter count shown on the Filter button badge when rules are present

---

## Backend Validation

When the backend receives a `find` request with a `where` param, it must validate each field in the clause against the collection schema before executing:

1. Parse the `where` JSON
2. For each field key in the clause (excluding `AND`/`OR`), look up the field in the collection schema
3. If the field does not exist, or `field.admin.filterable === false`, or the field type is in the never-filterable list — strip that key from the where clause silently (do not error, to avoid leaking schema information)
4. If `collection.admin.filterable === false` — ignore the `where` param entirely

Stripping rather than rejecting avoids leaking which fields exist.

---

## Implementation Notes

- The `WhereClause` type and all DB translators already handle every operator in this spec. No changes needed to `parse-where.ts` or any DB adapter.
- The SDK `find()` already JSON-stringifies and sends `where`. No SDK changes needed.
- The only new exports from `@dyrected/core` are the `FilterRule` interface and a `rulesToWhere(rules: FilterRule[]): WhereClause` utility function (single source of truth for the conversion).
- Relationship field value input needs a `useQuery` call to load options from the related collection — identical in shape to how the relationship field editor already works in the edit form.
