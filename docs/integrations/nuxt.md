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

Returns the configured `DyrectedClient` instance. Use it to call any SDK method.

```vue
<script setup lang="ts">
// useDyrected() returns the raw SDK client
const client = useDyrected()

// Fetch a list of posts
const { data: posts } = await useAsyncData('posts', () =>
  client.collection('posts').find({
    where: { status: { equals: 'published' } },
    sort: '-createdAt',
    depth: 1,
    limit: 10,
  })
)
</script>

<template>
  <ul>
    <li v-for="post in posts?.docs" :key="post.id">
      {{ post.title }}
    </li>
  </ul>
</template>
```

### Fetch a single document

```vue
<script setup lang="ts">
const route = useRoute()
const client = useDyrected()

const { data: post } = await useAsyncData(`post-${route.params.id}`, () =>
  client.collection('posts').findOne(route.params.id as string, { depth: 1 })
)
</script>
```

### `useDyrectedDoc(collection, id, options?)`

A convenience shortcut for fetching a single document by ID:

```vue
<script setup lang="ts">
const route = useRoute()
const post = await useDyrectedDoc('posts', route.params.id as string, { depth: 1 })
</script>
```

### Fetch a global

```vue
<script setup lang="ts">
const client = useDyrected()
const { data: settings } = await useAsyncData('site-settings', () =>
  client.global('site-settings').get()
)
</script>
```

---

## Step 3 — Mutating data

For create/update/delete operations, call methods on the client directly:

```vue
<script setup lang="ts">
const client = useDyrected()

async function submitForm(data: any) {
  await client.collection('inquiries').create(data)
}
</script>
```

---

## All Available Composables

| Composable | Status | Description |
|---|---|---|
| `useDyrected()` | ✅ Available | Returns the configured `DyrectedClient` |
| `useDyrectedDoc(slug, id, opts?)` | ✅ Available | Shortcut for `client.collection(slug).findOne(id)` |
| `useDyrectedGlobal(slug)` | 🔜 Planned | Wraps `client.global(slug).get()` with `useAsyncData` |
| `useDyrectedAuth()` | 🔜 Planned | Returns `login()`, `logout()`, `user`, `isLoggedIn` |
| `useLivePreview(options)` | 🔜 Planned | Live preview `postMessage` integration |

---

## Authentication

`useDyrectedAuth()` is planned — see Phase 13 in the implementation plan. In the meantime, call auth methods directly:

```vue
<script setup lang="ts">
const client = useDyrected()

async function handleLogin() {
  const { token } = await client.collection('users').login('user@example.com', 'my-password')
  // Store token — client.setToken(token) and persist in a cookie
  navigateTo('/dashboard')
}
</script>
```

---

## Live Preview

`useLivePreview()` is planned — see [Live Preview](/docs/admin/live-preview) for the postMessage protocol. In the meantime, implement it manually:

```vue
<script setup lang="ts">
const initialData = ...
const page = ref(initialData)
const isLive = ref(false)

onMounted(() => {
  window.addEventListener('message', (e) => {
    if (e.origin !== 'https://your-admin.com') return
    if (e.data?.type === 'dyrected-live-preview') {
      page.value = e.data.data
      isLive.value = true
    }
  })
})
</script>
```

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

Wrap data fetching in `useAsyncData` so Nuxt can cache and revalidate it:

```vue
<script setup lang="ts">
const client = useDyrected()
const { data: posts, refresh } = await useAsyncData('posts', () =>
  client.collection('posts').find()
)

async function publish(id: string) {
  await client.collection('posts').update(id, { status: 'published' })
  await refresh()  // Re-fetch the list
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

The module auto-imports `useDyrected` and `useDyrectedDoc`. Pass your type to the SDK methods for type-safe responses:

```ts
interface Post {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
}

const client = useDyrected()
const { data } = await useAsyncData('posts', () =>
  client.collection<Post>('posts').find()
)
// data.value?.docs is Post[]
```
