---
title: Nuxt 3 Integration
description: Complete guide to using Dyrected in a Nuxt 3 application with SSR and composables.
---

The `@dyrected/nuxt` module provides first-class Nuxt 3 support: automatic server handler registration, SSR-aware composables, and live preview support.

---

## Installation

```bash
pnpm add @dyrected/nuxt @dyrected/sdk
```

---

## Step 1 — Configure the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],

  runtimeConfig: {
    // Server-only (never exposed to browser)
    dyrectedApiKey: process.env.DYRECTED_API_KEY,

    public: {
      // Exposed to browser
      dyrectedUrl:    process.env.DYRECTED_URL,
      dyrectedSiteId: process.env.DYRECTED_SITE_ID,
    }
  }
})
```

```bash
# .env
DYRECTED_URL=https://cms.mysite.com/api
DYRECTED_API_KEY=sk_live_...
DYRECTED_SITE_ID=site_...
```

---

## Step 2 — Fetch data with composables

### `useDyrected`

The primary composable for fetching content. Wraps `@dyrected/sdk` with `useAsyncData` for SSR compatibility.

```vue
<script setup lang="ts">
// Fetch a list of posts
const { data: posts } = await useDyrected('posts').find({
  where: { status: { equals: 'published' } },
  sort: '-createdAt',
  depth: 1,
  limit: 10,
})
</script>

<template>
  <ul>
    <li v-for="post in posts?.docs" :key="post.id">
      {{ post.title }}
    </li>
  </ul>
</template>
```

### `useDyrected(slug).findOne(id)`

```vue
<script setup lang="ts">
const route = useRoute()
const { data: post } = await useDyrected('posts').findOne(route.params.id as string, {
  depth: 1,
})
</script>
```

### `useDyrectedGlobal(slug)`

Fetch a global singleton:

```vue
<script setup lang="ts">
const { data: settings } = await useDyrectedGlobal('site-settings')
</script>
```

---

## Step 3 — Mutating data

For create/update/delete operations (e.g. in forms), use the raw SDK client:

```vue
<script setup lang="ts">
const config = useRuntimeConfig()
const client = createClient({
  baseUrl: config.public.dyrectedUrl,
  apiKey: config.public.dyrectedApiKey,
})

async function submitForm(data: any) {
  await client.collection('inquiries').create(data)
}
</script>
```

---

## All Available Composables

| Composable | Description |
|---|---|
| `useDyrected(slug)` | Returns an object with `.find()` and `.findOne()` methods |
| `useDyrectedGlobal(slug)` | Fetches a global singleton |
| `useDyrectedAuth()` | Returns `login()`, `logout()`, `user`, and `isLoggedIn` |
| `useLivePreview(options)` | Enables live preview `postMessage` integration |

---

## Authentication Composable

```vue
<script setup lang="ts">
const { login, logout, user, isLoggedIn } = useDyrectedAuth()

async function handleLogin() {
  await login('user@example.com', 'my-password')
  navigateTo('/dashboard')
}
</script>

<template>
  <div v-if="isLoggedIn">Welcome, {{ user?.name }}</div>
  <button v-else @click="handleLogin">Log in</button>
</template>
```

---

## Live Preview Composable

```vue
<script setup lang="ts">
const { data: page, isLive } = useLivePreview({
  initialData: await useDyrected('pages').findOne(route.params.slug),
  serverURL: useRuntimeConfig().public.dyrectedAdminUrl,
})
</script>

<template>
  <div>
    <span v-if="isLive" class="badge">Preview</span>
    <h1>{{ page?.title }}</h1>
  </div>
</template>
```

See [Live Preview](/docs/admin/live-preview) for the full guide.

---

## Server Handler

The module automatically registers a server handler at `/api/dyrected/[...route]`. This proxies requests from your Nuxt frontend to your Dyrected backend, injecting the API key server-side so it is never exposed to the browser.

You can customise the prefix:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    routePrefix: '/api/cms',   // defaults to '/api/dyrected'
  }
})
```

---

## Cache Revalidation

Nuxt caches `useAsyncData` results. When content changes, call `refreshNuxtData()` to invalidate:

```vue
<script setup lang="ts">
const { data: posts, refresh } = await useDyrected('posts').find()

// Call refresh() after a mutation to re-fetch
async function publish(id: string) {
  await client.collection('posts').update(id, { status: 'published' })
  await refresh()
}
</script>
```

For full-page ISR-style revalidation on a Nuxt server, use Nitro's cache:

```ts
// server/api/revalidate.post.ts
export default defineEventHandler(async (event) => {
  await clearNuxtDataCache(event, 'posts')
  return { ok: true }
})
```

---

## TypeScript

The module auto-imports all composables globally. For type safety, define your document types and pass them as generics:

```ts
interface Post {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
}

const { data } = await useDyrected<Post>('posts').find()
// data.value?.docs is Post[]
```
