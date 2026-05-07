---
title: Hooks
description: Lifecycle hooks for collections, globals, and individual fields.
---

Hooks let you run custom logic at specific points in the document lifecycle — before or after reads, writes, and deletes. They are defined as arrays of functions in your collection or field config.

---

## Collection Hooks

```ts
export const Posts = defineCollection({
  slug: 'posts',
  hooks: {
    beforeRead:   [logAccess],
    afterRead:    [formatDates],
    beforeChange: [generateSlug, validateDependencies],
    afterChange:  [sendWebhook, revalidateCache],
    beforeDelete: [checkReferences],
    afterDelete:  [cleanupMedia],
  },
  fields: [...],
})
```

| Hook | Runs | Receives | Return |
|---|---|---|---|
| `beforeRead` | Before fetching from the database | `{ req, query }` | Modified query or void |
| `afterRead` | After fetching, before sending response | `{ doc, req }` | Modified doc |
| `beforeChange` | Before insert/update | `{ data, doc, user, req, operation }` | Modified data object |
| `afterChange` | After insert/update committed | `{ doc, previousDoc, user, req, operation }` | void |
| `beforeDelete` | Before deletion | `{ id, doc, user, req }` | void (throw to abort) |
| `afterDelete` | After deletion | `{ id, doc, user, req }` | void |

### `operation`

`beforeChange` and `afterChange` receive an `operation` string: `'create'` or `'update'`. Use this to branch logic:

```ts
beforeChange: [
  ({ data, operation }) => {
    if (operation === 'create') {
      return { ...data, createdBy: 'system' }
    }
    return data
  }
]
```

### Auto-generating a slug

```ts
import { slugify } from 'some-slugify-lib'

hooks: {
  beforeChange: [
    ({ data, operation }) => {
      if (operation === 'create' || data.title) {
        return { ...data, slug: slugify(data.title) }
      }
      return data
    }
  ]
}
```

### Sending a webhook after save

```ts
hooks: {
  afterChange: [
    async ({ doc, operation }) => {
      await fetch('https://hooks.example.com/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: operation, doc }),
      })
    }
  ]
}
```

### Aborting a delete

Throw an error inside `beforeDelete` to prevent the deletion:

```ts
hooks: {
  beforeDelete: [
    async ({ id, doc }) => {
      const references = await db.find({ collection: 'pages', where: { featuredPost: id } })
      if (references.total > 0) {
        throw new Error(`Cannot delete: this post is referenced by ${references.total} page(s).`)
      }
    }
  ]
}
```

---

## Global Hooks

Globals support the same hooks as collections, excluding the delete hooks (globals cannot be deleted):

```ts
export const SiteSettings = defineGlobal({
  slug: 'site-settings',
  hooks: {
    beforeRead:   [...],
    afterRead:    [...],
    beforeChange: [...],
    afterChange:  [...],
  },
  fields: [...],
})
```

---

## Field Hooks

Field hooks run at the field level and are ideal for value transformations.

```ts
{
  name: 'email',
  type: 'email',
  hooks: {
    beforeChange: [({ value }) => value.toLowerCase().trim()],
    afterRead:    [({ value }) => value],
  }
}
```

| Hook | When | Receives | Return |
|---|---|---|---|
| `beforeChange` | Before saving this field's value | `{ value, originalDoc, data, user }` | The new value to store |
| `afterRead` | After reading this field's value | `{ value, doc, user }` | The transformed value to return |

### Common field hook patterns

**Normalise to lowercase:**
```ts
hooks: { beforeChange: [({ value }) => value?.toLowerCase()] }
```

**Hash a password:**
```ts
import bcrypt from 'bcrypt'
hooks: { beforeChange: [async ({ value }) => bcrypt.hash(value, 10)] }
```

**Mask a sensitive value on read:**
```ts
hooks: {
  afterRead: [({ value, user }) => {
    if (user?.role !== 'admin') return '****'
    return value
  }]
}
```

---

## Hook Execution Order

When multiple hooks are defined in the array, they run **sequentially** in order. The return value of one hook is passed as the input to the next.

```ts
beforeChange: [
  normaliseWhitespace,   // runs first
  validateLength,        // runs second, receives output of first
  generateExcerpt,       // runs third
]
```

If any hook throws, the chain is aborted and the operation fails with a `500` error (or a `400` if you explicitly throw a validation error).
