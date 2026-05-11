---
title: Building a Blog
description: Create a simple blog with a posts collection, Next.js frontend, and the Admin UI.
---

This guide walks through building a blog from scratch: defining a `posts` collection, querying it from a Next.js page, and editing content through the Admin UI.

---

## 1. Define the collection

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core'
import { SqliteAdapter } from '@dyrected/db-sqlite'

export default defineConfig({
  db: new SqliteAdapter({ filename: './dyrected.db' }),
  collections: [
    {
      slug: 'posts',
      access: {
        read: () => true,   // public reads
      },
      fields: [
        { name: 'title',     type: 'text',     required: true },
        { name: 'slug',      type: 'text',     required: true },
        { name: 'content',   type: 'richtext' },
        { name: 'status',    type: 'select',   options: ['draft', 'published'], defaultValue: 'draft' },
        { name: 'publishedAt', type: 'date' },
      ],
    },
  ],
})
```

---

## 2. Mount the Dyrected API

```ts
// app/api/dyrected/[...route]/route.ts
import { createApp } from '@dyrected/core'
import config from '@/dyrected.config'

const app = createApp(config)

export const GET    = app.fetch
export const POST   = app.fetch
export const PATCH  = app.fetch
export const DELETE = app.fetch
```

---

## 3. Fetch posts in a Next.js page

```ts
// app/blog/page.tsx
export default async function BlogPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/posts?where[status][equals]=published&sort=-publishedAt`, {
    headers: { 'x-api-key': process.env.DYRECTED_API_KEY! },
    next: { revalidate: 60 },
  })
  const { docs } = await res.json()

  return (
    <ul>
      {docs.map((post: any) => (
        <li key={post.id}>
          <a href={`/blog/${post.slug}`}>{post.title}</a>
        </li>
      ))}
    </ul>
  )
}
```

---

## 4. Fetch a single post

```ts
// app/blog/[slug]/page.tsx
export default async function PostPage({ params }: { params: { slug: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/posts?where[slug][equals]=${params.slug}&limit=1`, {
    headers: { 'x-api-key': process.env.DYRECTED_API_KEY! },
  })
  const { docs } = await res.json()
  const post = docs[0]

  if (!post) return <div>Not found</div>

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}
```

---

## 5. Revalidate on publish

Use an `afterChange` hook to clear the Next.js page cache when a post is published:

```ts
// dyrected.config.ts
import { revalidatePath } from 'next/cache'

{
  slug: 'posts',
  hooks: {
    afterChange: [
      async ({ doc }) => {
        if (doc.status === 'published') {
          revalidatePath('/blog')
          revalidatePath(`/blog/${doc.slug}`)
        }
      },
    ],
  },
}
```

---

## 6. Embed the Admin UI

Mount the Admin UI panel so editors can manage posts at `/admin`:

```ts
// app/admin/[[...segments]]/page.tsx
export { AdminPage as default } from '@dyrected/next'
```

See [Admin UI Overview](/admin/overview) for setup details.
