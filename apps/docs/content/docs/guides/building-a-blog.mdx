---
title: Building a Blog
description: Create a posts collection, fetch content in your frontend, and let clients edit through the Admin UI.
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
      access: { read: () => true },
      fields: [
        { name: 'title',       type: 'text',     required: true },
        { name: 'slug',        type: 'text',     required: true },
        { name: 'content',     type: 'richtext' },
        { name: 'status',      type: 'select',   options: ['draft', 'published'], defaultValue: 'draft' },
        { name: 'publishedAt', type: 'date' },
      ],
    },
  ],
})
```

---

## 2. Mount the API

<Tabs items={['Next.js', 'Nuxt']}>
<Tab value="Next.js">
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
</Tab>
<Tab value="Nuxt">
```ts
// nuxt.config.ts
import config from './dyrected.config'

export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: { ...config, apiBase: '/api/dyrected' },
})
```
</Tab>
</Tabs>

---

## 3. Fetch the post list

<Tabs items={['Next.js', 'Nuxt']}>
<Tab value="Next.js">
```tsx
// app/blog/page.tsx
export default async function BlogPage() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/posts?where[status][equals]=published&sort=-publishedAt`,
    { headers: { 'x-api-key': process.env.DYRECTED_API_KEY! }, next: { revalidate: 60 } }
  )
  const { docs } = await res.json()

  return (
    <ul>
      {docs.map((post: any) => (
        <li key={post.id}><a href={`/blog/${post.slug}`}>{post.title}</a></li>
      ))}
    </ul>
  )
}
```
</Tab>
<Tab value="Nuxt">
```vue
<!-- pages/blog/index.vue -->
<script setup lang="ts">
const { data } = await useDyrectedFind('posts', {
  where: { status: { equals: 'published' } },
  sort: '-publishedAt',
})
</script>

<template>
  <ul>
    <li v-for="post in data?.docs" :key="post.id">
      <NuxtLink :to="`/blog/${post.slug}`">{{ post.title }}</NuxtLink>
    </li>
  </ul>
</template>
```
</Tab>
</Tabs>

---

## 4. Fetch a single post

<Tabs items={['Next.js', 'Nuxt']}>
<Tab value="Next.js">
```tsx
// app/blog/[slug]/page.tsx
export default async function PostPage({ params }: { params: { slug: string } }) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/posts?where[slug][equals]=${params.slug}&limit=1`,
    { headers: { 'x-api-key': process.env.DYRECTED_API_KEY! } }
  )
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
</Tab>
<Tab value="Nuxt">
```vue
<!-- pages/blog/[slug].vue -->
<script setup lang="ts">
const route = useRoute()
const { data: post } = await useDyrectedDoc('posts', route.params.slug as string)
</script>

<template>
  <article v-if="post">
    <h1>{{ post.title }}</h1>
    <div v-html="post.content" />
  </article>
  <div v-else>Not found</div>
</template>
```
</Tab>
</Tabs>

---

## 5. Revalidate on publish

<Tabs items={['Next.js', 'Nuxt']}>
<Tab value="Next.js">
```ts
// dyrected.config.ts
import { revalidatePath } from 'next/cache'

hooks: {
  afterChange: [
    async ({ doc }) => {
      if (doc.status === 'published') {
        revalidatePath('/blog')
        revalidatePath(`/blog/${doc.slug}`)
      }
    },
  ],
}
```
</Tab>
<Tab value="Nuxt">
```ts
// dyrected.config.ts
hooks: {
  afterChange: [
    async ({ doc }) => {
      if (doc.status === 'published') {
        await $fetch('/api/revalidate', {
          method: 'POST',
          body: { slug: doc.slug },
        })
      }
    },
  ],
}
```
</Tab>
</Tabs>

---

## 6. Embed the Admin UI

<Tabs items={['Next.js', 'Nuxt']}>
<Tab value="Next.js">
```ts
// app/admin/[[...segments]]/page.tsx
export { AdminPage as default } from '@dyrected/next'
```
</Tab>
<Tab value="Nuxt">
The Admin UI mounts automatically at `/admin` when you add the `@dyrected/nuxt` module. Configure the path in `nuxt.config.ts`:

```ts
dyrected: {
  ...config,
  adminPath: '/admin',
}
```
</Tab>
</Tabs>

See [Admin UI Overview](/docs/admin/overview) for setup details.
