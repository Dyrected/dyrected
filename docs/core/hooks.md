---
title: Hooks & Interceptors
description: Extend Dyrected logic with lifecycle hooks.
---

Hooks allow you to execute custom code at various points in the request lifecycle.

## Collection Hooks

Collections support hooks for `Read`, `Change` (Create/Update), and `Delete`.

```typescript
{
  slug: 'posts',
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        // Automatically generate a slug if missing
        if (data.title && !data.slug) {
          data.slug = data.title.toLowerCase().replace(/ /g, '-');
        }
        return data;
      }
    ],
    afterRead: [
      ({ doc }) => {
        // Modify data after it's fetched from the DB
        doc.readTime = Math.ceil(doc.content.length / 200);
        return doc;
      }
    ]
  }
}
```

## Field Hooks

You can also attach hooks directly to individual fields.

```typescript
{
  name: 'password',
  type: 'text',
  hooks: {
    beforeChange: [
      async ({ value }) => {
        return await hashPassword(value);
      }
    ]
  }
}
```

## Global Hooks

Globals support `beforeRead`, `afterRead`, `beforeChange`, and `afterChange` hooks.
