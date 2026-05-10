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

Dyrected can be run in two modes: **Cloud** (Managed) or **Self-Hosted** (Core).

### Option A: Cloud Mode (Managed)
Use this if you are using Dyrected Cloud to host your backend.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    apiKey: process.env.DYRECTED_API_KEY,
    siteId: process.env.DYRECTED_SITE_ID,
    baseUrl: 'https://api.dyrected.cloud', // Or your custom cloud URL
    apiBase: '/api/dyrected',              // Local proxy path
  }
})
```

### Option B: Self-Hosted Mode (Core)
Use this if you want to run the Dyrected engine directly inside your Nuxt app. We recommend defining your schema in a separate `dyrected.config.ts` file.

```ts
// nuxt.config.ts
import config from './dyrected.config'

export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    ...config,
    apiBase: '/api/dyrected',
  },
  // Necessary for embedding the Admin UI dashboard
  build: {
    transpile: ["@dyrected/admin"],
  },
  vite: {
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "lucide-react"
      ],
    },
  },
})
```

And your `dyrected.config.ts` (using SQLite as an example):

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core'
import { SqliteAdapter } from '@dyrected/db-sqlite'

export default defineConfig({
  db: new SqliteAdapter({
    filename: 'dyrected.db'
  }),
  collections: [
    // ... your collections
  ]
})
```

---

## Environment Variables

For Cloud mode, you should use environment variables for your keys:

```bash
# .env
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

A convenience shortcut for fetching a single document by ID. It wraps `useAsyncData`, so destructure `{ data }` from the result:

```vue
<script setup lang="ts">
const route = useRoute()
const { data: post } = await useDyrectedDoc('posts', route.params.id as string, { depth: 1 })
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
| `useDyrectedGlobal(slug)` | ✅ Available | Wraps `client.global(slug).get()` with `useAsyncData` |
| `useDyrectedAuth(collection)` | ✅ Available | Returns `login()`, `logout()`, `user`, `isLoggedIn` |
| `useLivePreview(options)` | ✅ Available | Live preview `postMessage` integration |

---

## Authentication

The `useDyrectedAuth(collection)` composable provides everything you need to manage user sessions. Pass the slug of your auth-enabled collection:

```vue
<script setup lang="ts">
const { login, logout, user, isLoggedIn } = useDyrectedAuth('users')

async function handleLogin() {
  await login('user@example.com', 'my-password')
  navigateTo('/dashboard')
}
</script>
```

---

## Live Preview

Enable real-time synchronization with the Admin UI using `useLivePreview`:

```vue
<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

// Fetch initial data
const { data: initialData } = await useAsyncData('page', () => 
  useDyrected().collection('pages').findOne(route.params.slug)
)

// Sync with Admin UI
const { data: page, isLive } = useLivePreview({
  initialData: initialData.value,
  serverURL: config.public.dyrectedAdminUrl
})
</script>
```

---

## Step 4 — Embed the Admin UI

The Admin UI is a React-based dashboard. The `@dyrected/nuxt` module provides a `<DyrectedAdmin />` component that handles all the React-to-Vue bridging, mounting, and routing isolation for you.

Create a file at `pages/cms-admin.vue`.

```vue
<!-- pages/cms-admin.vue -->
<script setup lang="ts">
// Disable Nuxt layout for the dashboard to provide a full-screen experience
definePageMeta({
  layout: false,
});
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin basename="/cms-admin" />
  </ClientOnly>
</template>
```

> [!IMPORTANT]
> Ensure you have added `@dyrected/admin` to your `build.transpile` and relevant React dependencies to `vite.optimizeDeps.include` in your `nuxt.config.ts` as shown in Step 1.

> [!TIP]
> If you are using Cloud mode and want to connect directly to the Cloud API from the browser (bypassing the proxy), you can pass `baseUrl`, `apiKey`, and `siteId` props to `<AdminUI />`.

---

## Server Handler

The module automatically registers a server handler at `/api/dyrected/[...route]`. This proxies requests from your Nuxt frontend to your Dyrected backend, injecting the API key server-side so it is never exposed to the browser.

You can customise the prefix:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    apiBase: '/api/cms',   // defaults to '/api/dyrected'
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

---

### Transformation Errors (e.g. `Unexpected "!"`)
If you see errors like `Unexpected "!"` or `Transform failed` for files in `@dyrected/admin`, it usually means Vite is trying to parse the TypeScript code as plain JavaScript. 

**Solution**: Ensure you have added `@dyrected/admin` to `build.transpile` in your `nuxt.config.ts`. If problems persist, you may need to force the `tsx` loader in your Vite config:

```ts
export default defineNuxtConfig({
  vite: {
    esbuild: {
      loader: 'tsx',
      include: /@dyrected\/admin\/.*\.tsx$/
    }
  }
})
```

### Hash Routing
For self-hosted deployments embedded in Nuxt, we recommend using **Hash Routing**. This ensures that the Admin dashboard's internal navigation doesn't interfere with your Nuxt application's URL paths. 

The `<DyrectedAdmin />` component uses hash routing by default for internal navigation to ensure maximum compatibility.
