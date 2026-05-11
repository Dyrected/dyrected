---
title: Access Control
description: Function-based access control at the collection level and field level.
---

Dyrected uses a **function-based** access control system. Every collection and field defines its own rules as plain JavaScript functions — there is no global role registry or permission table.

---

## How Access Works

Access functions are called on every request **before** any database operation. They receive the current user (from the JWT on the request) plus context, and return:

- `true` — allow the operation
- `false` — deny (returns `403 Forbidden`)
- `object` — allow, but filter the results to only documents matching the object (used for row-level security)

```ts
type AccessFunction = (args: {
  user: AuthenticatedUser | null
  doc?: Record<string, any>    // the existing document (on read/update/delete)
  data?: Record<string, any>   // the incoming data (on create/update)
  req: HonoRequest
}) => boolean | object | Promise<boolean | object>
```

---

## Collection-Level Access

Define access rules on the `access` key of a `CollectionConfig`:

```ts
export const Posts = defineCollection({
  slug: 'posts',
  access: {
    read:   ({ user, doc }) => doc?.status === 'published' || !!user,
    create: ({ user }) => ['editor', 'admin'].includes(user?.role),
    update: ({ user, doc }) => user?.id === doc?.authorId || user?.role === 'admin',
    delete: ({ user }) => user?.role === 'admin',
  },
  fields: [...],
})
```

| Operation | HTTP Method | Access Key |
|---|---|---|
| List & get single | `GET` | `read` |
| Create | `POST` | `create` |
| Update | `PATCH` | `update` |
| Delete | `DELETE` | `delete` |

### Public Access

```ts
access: {
  read:   () => true,   // anyone can read
  create: () => true,   // anyone can submit (e.g. a contact form)
  update: () => false,  // nobody can update
  delete: () => false,
}
```

### Row-Level Filtering

When `read` returns an **object**, Dyrected treats it as a `where` clause and automatically filters the query:

```ts
access: {
  // Users can only read their own orders
  read: ({ user }) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return { customer: user.id }   // adds WHERE customer = user.id
  }
}
```

The filter object uses the same shape as the `where` query parameter on the API.

### Async Access

Access functions can be `async` — useful for lookups:

```ts
access: {
  update: async ({ user, doc }) => {
    const org = await db.findOne({ collection: 'orgs', id: doc.orgId })
    return org?.members.includes(user?.id)
  }
}
```

---

## Field-Level Access

Fields can define their own `access` object. This is evaluated **after** collection-level access is granted.

```ts
{
  name: 'internalNotes',
  type: 'textarea',
  access: {
    read:   ({ user }) => user?.role === 'admin',
    update: ({ user }) => user?.role === 'admin',
  }
}
```

| Key | Effect on reads | Effect on writes |
|---|---|---|
| `read: () => false` | Field is **stripped from the response** | — |
| `update: () => false` | — | Field is **silently ignored** on write |

Field access functions receive the same `{ user, doc, data, req }` args as collection access.

**Admin UI behaviour:**
- Fields where `read` returns `false` are hidden from the edit form.
- Fields where `update` returns `false` are rendered as read-only in the form.

---

## Global-Level Access

Globals support `read` and `update`:

```ts
export const SiteSettings = defineGlobal({
  slug: 'site-settings',
  access: {
    read:   () => true,
    update: ({ user }) => user?.role === 'admin',
  },
  fields: [...],
})
```

---

## Common Patterns

### Only authenticated users can write

```ts
access: {
  read:   () => true,
  create: ({ user }) => !!user,
  update: ({ user }) => !!user,
  delete: ({ user }) => !!user,
}
```

### Admins can do everything; editors can read and update; viewers read-only

```ts
access: {
  read:   ({ user }) => !!user,
  create: ({ user }) => ['admin', 'editor'].includes(user?.role),
  update: ({ user }) => ['admin', 'editor'].includes(user?.role),
  delete: ({ user }) => user?.role === 'admin',
}
```

### Authors own their content

```ts
access: {
  read:   ({ user, doc }) => doc?.status === 'published' || !!user,
  create: ({ user }) => !!user,
  update: ({ user, doc }) => user?.role === 'admin' || user?.id === doc?.authorId,
  delete: ({ user }) => user?.role === 'admin',
}
```

### Public contact form

```ts
access: {
  create: () => true,       // anyone can submit
  read:   ({ user }) => !!user,  // only logged-in users can read submissions
  update: () => false,
  delete: ({ user }) => user?.role === 'admin',
}
```
