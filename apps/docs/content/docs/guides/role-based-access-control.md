---
title: Role-Based Access Control
description: Restrict what different users can read, create, edit, and delete based on their role.
---

This guide builds a `users` collection with three roles — `admin`, `editor`, and `viewer` — and wires up access rules so each role can only do what it's supposed to.

---

## 1. Add a role field to your users collection

```ts
// dyrected.config.ts
{
  slug: 'users',
  auth: true,
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'editor', 'viewer'],
      defaultValue: 'viewer',
      access: {
        // only admins can change someone's role
        update: ({ user }) => user?.role === 'admin',
      },
    },
  ],
}
```

---

## 2. Lock down the users collection

```ts
{
  slug: 'users',
  auth: true,
  access: {
    read:   ({ user }) => !!user,                          // must be logged in
    create: () => false,                                   // no self-registration — use invite
    update: ({ user, id }) =>
      user?.role === 'admin' || user?.id === id,           // edit yourself or be admin
    delete: ({ user }) => user?.role === 'admin',
  },
  fields: [...],
}
```

---

## 3. Apply roles to a content collection

```ts
{
  slug: 'posts',
  access: {
    // anyone can read published posts
    read: ({ user, doc }) => {
      if (doc?.status === 'published') return true
      return !!user  // drafts require login
    },
    create: ({ user }) => user?.role === 'admin' || user?.role === 'editor',
    update: ({ user, doc }) => {
      if (user?.role === 'admin') return true
      // editors can only update their own posts
      return user?.role === 'editor' && doc?.createdBy === user?.id
    },
    delete: ({ user }) => user?.role === 'admin',
  },
  fields: [
    { name: 'title',     type: 'text' },
    { name: 'content',   type: 'richtext' },
    { name: 'status',    type: 'select', options: ['draft', 'published'], defaultValue: 'draft' },
    { name: 'createdBy', type: 'relationship', relationTo: 'users' },
  ],
}
```

---

## 4. Stamp `createdBy` automatically

Use a `beforeChange` hook so the author is always set to the current user on create:

```ts
hooks: {
  beforeChange: [
    ({ data, operation, user }) => {
      if (operation === 'create') {
        return { ...data, createdBy: user?.id }
      }
      return data
    },
  ],
},
```

---

## 5. Hide sensitive fields from viewers

Use field-level access to strip fields from API responses for lower-privilege users:

```ts
{
  name: 'internalNotes',
  type: 'textarea',
  access: {
    read:   ({ user }) => user?.role === 'admin' || user?.role === 'editor',
    update: ({ user }) => user?.role === 'admin',
  },
}
```

---

## 6. Check the role on the frontend

After login the JWT payload includes the user document. Decode it or hit `/me` to get the role:

```ts
const res = await fetch('/api/dyrected/collections/users/me', {
  headers: { Authorization: `Bearer ${token}` },
})
const { role } = await res.json()

if (role === 'admin') {
  // show admin controls
}
```

Or with the SDK:

```ts
const user = await client.collection('users').me()
// user.role === 'admin' | 'editor' | 'viewer'
```

---

## Summary

| Role | Read posts | Create posts | Edit own posts | Edit any post | Delete | Manage users |
|---|---|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `editor` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `viewer` | ✅ (published) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Anonymous | ✅ (published) | ❌ | ❌ | ❌ | ❌ | ❌ |

See [Access Control](/docs/concepts/access-control) for the full reference on access function signatures.
