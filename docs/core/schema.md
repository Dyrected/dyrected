---
title: Schema Definition
description: Defining your content model in Dyrected.
---

In Dyrected, your content model is defined as a series of **Collections** and **Globals** in your `dyrected.config.ts`.

## Collections

Collections are used for content that has multiple entries, like blog posts, products, or users.

```typescript
export default defineConfig({
  collections: [
    {
      slug: 'posts',
      labels: {
        singular: 'Post',
        plural: 'Posts',
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText' },
      ],
    },
  ],
});
```

## Globals

Globals are used for "singleton" content that only has one instance, like site settings, navigation menus, or a home page hero section.

```typescript
export default defineConfig({
  globals: [
    {
      slug: 'settings',
      label: 'Site Settings',
      fields: [
        { name: 'siteName', type: 'text' },
        { name: 'logo', type: 'relationship', collection: 'media' },
      ],
    },
  ],
});
```

## Admin Customization

You can control how your collections appear in the Admin UI:

```typescript
{
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'createdAt'],
    group: 'Content',
    hidden: false
  }
}
```
