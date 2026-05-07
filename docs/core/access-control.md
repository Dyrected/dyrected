---
title: Access Control (RBAC)
description: Secure your API with fine-grained access policies.
---

Dyrected provides a powerful access control system that allows you to define who can read, create, update, or delete data.

## Policy Functions

Access is defined using functions that return either a `boolean` (allow/deny) or a `where` query object (row-level security).

```typescript
{
  slug: 'posts',
  access: {
    read: ({ user }) => {
      if (user?.role === 'admin') return true;
      
      // Only allow users to read their own posts
      return {
        owner: {
          equals: user.id
        }
      };
    },
    create: ({ user }) => !!user, // Must be logged in
    update: ({ user }) => user?.role === 'admin',
    delete: ({ user }) => user?.role === 'admin',
  }
}
```

## Available Context

Every access function receives an object containing:
- `user`: The currently authenticated user object.
- `req`: The raw Hono request object.
- `data`: (For create/update) The data being sent.
- `doc`: (For update/delete) The existing document in the database.

## Field-Level Access

You can also restrict access to specific fields within a collection or global.

```typescript
{
  name: 'internalNotes',
  type: 'textarea',
  access: {
    read: ({ user }) => user?.role === 'admin',
    update: ({ user }) => user?.role === 'admin',
  }
}
```
