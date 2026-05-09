# Dyrected Framework Adapters

This document covers `@dyrected/next` and `@dyrected/nuxt` — the embedded integration packages for Next.js and Nuxt. Both packages let you run Dyrected inside your existing application with no separate server, no separate deployment, and no separate process.

Both adapters follow the same mental model. The Next.js sections are written first and in full. The Nuxt sections cover the same ground with Nuxt-specific APIs and note where behaviour differs.

---

## What Embedded Mode Means

In embedded mode, Dyrected mounts as middleware inside your framework application. Your CMS API and your website share one codebase, one deployment, and one process.

```
/                   → your website
/api/dyrected/      → Dyrected API (mounted by the adapter)
/cms                → Dyrected admin (mounted by you, wherever you want)
```

On the server side, the adapter also exposes a direct client that bypasses HTTP entirely and calls Dyrected's internal service functions in-process. This is faster, works at build time, and is the recommended way to fetch content in Server Components and Nuxt server routes.

On the client side (browser), the standard `@dyrected/sdk` HTTP client is used as normal, pointed at your own domain.

---

---

# @dyrected/next

## Installation

```bash
pnpm add @dyrected/next
```

`@dyrected/next` depends on `@dyrected/core`. Install your database and storage adapters separately.

```bash
pnpm add @dyrected/db-postgres @dyrected/storage-s3
```

---

## Config File

Create `dyrected.config.ts` at the root of your Next.js project. This is identical to the standalone self-hosted config — same `defineConfig`, same adapters, same collections and globals.

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core'
import { postgresAdapter } from '@dyrected/db-postgres'
import { localAdapter } from '@dyrected/storage-local'

import { Users } from './collections/users'
import { Posts } from './collections/posts'
import { Pages } from './collections/pages'
import { Images } from './collections/images'
import { Navbar } from './globals/navbar'
import { Footer } from './globals/footer'

export default defineConfig({
  collections: [Users, Posts, Pages, Images],
  globals: [Navbar, Footer],

  db: postgresAdapter({
    url: process.env.DATABASE_URL,
  }),

  storage: localAdapter({
    directory: './public/uploads',
    serveFrom: '/uploads',
  }),

  cors: {
    origins: [process.env.NEXT_PUBLIC_APP_URL],
  },
})
```

---

## Mounting the API

Create a single catch-all route handler. The adapter exports named HTTP method handlers that Next.js App Router expects.

```ts
// app/api/dyrected/[...route]/route.ts
export { GET, POST, PUT, PATCH, DELETE } from '@dyrected/next'
```

That is the entire file. Dyrected now handles every request under `/api/dyrected/`.

All collection, global, auth, and schema endpoints are available at this path:

```
POST   /api/dyrected/auth/users/login
GET    /api/dyrected/collections/posts
POST   /api/dyrected/collections/posts
GET    /api/dyrected/collections/posts/:id
GET    /api/dyrected/globals/navbar
```

---

## Mounting the Admin

The admin is a standalone React app served by your Next.js application at a path you choose. Mount it by creating a catch-all route for your chosen path and rendering the admin component inside it.

```ts
// app/cms/[[...route]]/page.tsx
import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminPage() {
  return <DyrectedAdmin apiPath="/api/dyrected" />
}
```

The admin is now available at `/cms`. Change the folder name to change the path — `/admin`, `/dashboard`, `/editor`, whatever suits the project.

`apiPath` tells the admin where the API is mounted. It must match the path used in the route handler above.

### Protecting the Admin Route

The admin route is a normal Next.js route. Protect it however you protect other routes in your app — middleware, layout-level auth checks, or a dedicated auth wrapper.

```ts
// app/cms/[[...route]]/page.tsx
import { DyrectedAdmin } from '@dyrected/next/admin'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/session'

export default async function AdminPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  return <DyrectedAdmin apiPath="/api/dyrected" />
}
```

Or use Next.js middleware to protect the entire `/cms` prefix:

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('dyrected_token')

  if (request.nextUrl.pathname.startsWith('/cms') && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/cms/:path*'],
}
```

---

## Server-Side Data Fetching

The adapter provides a direct client for use in Server Components, `generateStaticParams`, `generateMetadata`, and any other server-side Next.js context. It has the same interface as `@dyrected/sdk` but calls Dyrected's service layer directly — no HTTP round trip.

### Basic Usage

```ts
import { getDyrectedClient } from '@dyrected/next/server'

const dyrected = getDyrectedClient()

// Server Component
export default async function BlogPage() {
  const posts = await dyrected.collections.find('posts', {
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 10,
  })

  return (
    <ul>
      {posts.docs.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### Dynamic Routes

```ts
// app/blog/[slug]/page.tsx
import { getDyrectedClient } from '@dyrected/next/server'
import { notFound } from 'next/navigation'

const dyrected = getDyrectedClient()

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await dyrected.collections.findBy('posts', {
    field: 'slug',
    value: params.slug,
  }).catch(() => null)

  if (!post) notFound()

  return <article>{post.title}</article>
}

export async function generateStaticParams() {
  const posts = await dyrected.collections.find('posts', {
    where: { status: { equals: 'published' } },
    limit: 1000,
  })

  return posts.docs.map(post => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await dyrected.collections.findBy('posts', {
    field: 'slug',
    value: params.slug,
  }).catch(() => null)

  if (!post) return {}

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      images: [post.coverImage?.url],
    },
  }
}
```

### Globals in Layouts

```ts
// app/layout.tsx
import { getDyrectedClient } from '@dyrected/next/server'

const dyrected = getDyrectedClient()

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [navbar, footer] = await Promise.all([
    dyrected.globals.get('navbar', { depth: 1 }),
    dyrected.globals.get('footer', { depth: 1 }),
  ])

  return (
    <html>
      <body>
        <Navbar data={navbar} />
        {children}
        <Footer data={footer} />
      </body>
    </html>
  )
}
```

### Auth-Aware Server Fetching

Pass cookies into the direct client to make access-controlled requests on behalf of the current user. Access rules run exactly as they do over HTTP.

```ts
import { getDyrectedClient } from '@dyrected/next/server'
import { cookies } from 'next/headers'

export default async function DraftsPage() {
  const dyrected = getDyrectedClient({ cookies: cookies() })

  // only succeeds if the current user has read access to drafts
  const drafts = await dyrected.collections.find('posts', {
    where: { status: { equals: 'draft' } },
  })

  return <DraftsList drafts={drafts.docs} />
}
```

---

## Client-Side Data Fetching

For Client Components, use the standard `@dyrected/sdk` HTTP client pointed at your mounted API path.

```ts
// lib/dyrected-client.ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  apiUrl: '/api/dyrected',
  apiKey: process.env.NEXT_PUBLIC_DYRECTED_API_KEY,
})
```

```tsx
// components/ContactForm.tsx
'use client'

import { dyrected } from '@/lib/dyrected-client'
import { useState } from 'react'

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const form = new FormData(e.currentTarget)

    await dyrected.collections.create('contact-submissions', {
      name: form.get('name'),
      email: form.get('email'),
      message: form.get('message'),
    })

    setStatus('done')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" />
      <input name="email" type="email" />
      <textarea name="message" />
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending...' : 'Send'}
      </button>
      {status === 'done' && <p>Message sent.</p>}
    </form>
  )
}
```

---

## TypeScript Setup

Generate types from your schema and pass them to both clients.

```bash
pnpm dyrected generate:types
```

```ts
// lib/dyrected-server.ts
import { getDyrectedClient } from '@dyrected/next/server'
import type { DyrectedTypes } from '../dyrected.types'

export const dyrected = getDyrectedClient<DyrectedTypes>()
```

```ts
// lib/dyrected-client.ts
import { createClient } from '@dyrected/sdk'
import type { DyrectedTypes } from '../dyrected.types'

export const dyrected = createClient<DyrectedTypes>({
  apiUrl: '/api/dyrected',
  apiKey: process.env.NEXT_PUBLIC_DYRECTED_API_KEY,
})
```

Both clients share the same `DyrectedTypes` — one generated file covers the entire project.

---

## Environment Variables

```env
# Required
DATABASE_URL=postgres://user:pass@host:5432/myapp
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-aes-256-key

# Required for client-side SDK
NEXT_PUBLIC_DYRECTED_API_KEY=local-self-hosted

# Optional
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

In self-hosted embedded mode, `DYRECTED_SITE_KEY` is a constant you define — it is not issued externally. It is only used by the client-side HTTP SDK to identify itself to the API. The server-side direct client does not use it.

---

## Caching

The direct server client does not cache. Caching is handled by Next.js's native fetch cache, which you control through the custom `fetch` option on the HTTP client or through `revalidatePath` / `revalidateTag` on mutations.

### Revalidation on Write

```ts
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { path } = await req.json()
  revalidatePath(path)
  return NextResponse.json({ revalidated: true })
}
```

Trigger this from an `afterUpdate` hook in your collection config:

```ts
// collections/posts.ts
export const Posts = defineCollection({
  slug: 'posts',
  hooks: {
    afterUpdate: [
      async ({ doc }) => {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
          method: 'POST',
          body: JSON.stringify({ path: `/blog/${doc.slug}` }),
        })
      },
    ],
  },
  // ...
})
```

---

## Package Exports

```ts
import { ... } from '@dyrected/next'           // route handler exports: GET, POST, PUT, PATCH, DELETE
import { ... } from '@dyrected/next/server'    // getDyrectedClient — server-side direct client
import { ... } from '@dyrected/next/admin'     // DyrectedAdmin — admin React component
```

---
---

# @dyrected/nuxt

## Installation

```bash
pnpm add @dyrected/nuxt
```

Install your database and storage adapters separately.

```bash
pnpm add @dyrected/db-postgres @dyrected/storage-s3
```

---

## Config File

Create `dyrected.config.ts` at the root of your Nuxt project. Identical to the Next.js config — same `defineConfig`, same adapters, same collections and globals.

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core'
import { postgresAdapter } from '@dyrected/db-postgres'
import { localAdapter } from '@dyrected/storage-local'

import { Users } from './collections/users'
import { Posts } from './collections/posts'
import { Pages } from './collections/pages'
import { Images } from './collections/images'
import { Navbar } from './globals/navbar'
import { Footer } from './globals/footer'

export default defineConfig({
  collections: [Users, Posts, Pages, Images],
  globals: [Navbar, Footer],

  db: postgresAdapter({
    url: process.env.DATABASE_URL,
  }),

  storage: localAdapter({
    directory: './public/uploads',
    serveFrom: '/uploads',
  }),

  cors: {
    origins: [process.env.NUXT_PUBLIC_APP_URL],
  },
})
```

---

## Registering the Module

Add `@dyrected/nuxt` to your `nuxt.config.ts`. The module registers itself into Nitro and mounts the Dyrected API automatically.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],

  dyrected: {
    apiPath: '/api/dyrected',   // where the API is mounted (default: /api/dyrected)
  },

  runtimeConfig: {
    dyrectedJwtSecret: process.env.JWT_SECRET,
    dyrectedEncryptionKey: process.env.ENCRYPTION_KEY,
    dyrectedDatabaseUrl: process.env.DATABASE_URL,
    public: {
      dyrectedApiKey: process.env.NUXT_PUBLIC_DYRECTED_API_KEY,
      dyrectedApiPath: '/api/dyrected',
    },
  },
})
```

The module does three things at startup: reads `dyrected.config.ts`, mounts the Dyrected Hono app into Nitro at `apiPath`, and makes the server client available via auto-imported composables.

---

## Mounting the Admin

Create a catch-all page at the path you want the admin to live. Nuxt does not need a special file convention — any `[[...route]].vue` page works.

```vue
<!-- pages/cms/[[...route]].vue -->
<template>
  <DyrectedAdmin api-path="/api/dyrected" />
</template>

<script setup lang="ts">
import { DyrectedAdmin } from '@dyrected/nuxt/admin'
</script>
```

Change the folder from `cms` to any path you prefer.

### Protecting the Admin Route

Use Nuxt route middleware to protect the admin path:

```ts
// middleware/admin-auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const { token } = useDyrectedAuth()

  if (to.path.startsWith('/cms') && !token.value) {
    return navigateTo('/login')
  }
})
```

Or protect it in the page itself using `definePageMeta`:

```vue
<!-- pages/cms/[[...route]].vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'admin-auth',
})
</script>

<template>
  <DyrectedAdmin api-path="/api/dyrected" />
</template>
```

---

## Server-Side Data Fetching

The module auto-imports `useDyrectedServer()` — a composable that returns the direct in-process client. Use it in `useAsyncData`, server routes, and Nitro event handlers.

### In Pages with `useAsyncData`

```vue
<!-- pages/blog/index.vue -->
<script setup lang="ts">
const { data: posts } = await useAsyncData('posts', () => {
  const dyrected = useDyrectedServer()
  return dyrected.collections.find('posts', {
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 10,
  })
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

### In Dynamic Routes

```vue
<!-- pages/blog/[slug].vue -->
<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(`post-${route.params.slug}`, () => {
  const dyrected = useDyrectedServer()
  return dyrected.collections.findBy('posts', {
    field: 'slug',
    value: route.params.slug as string,
  })
})

if (!post.value) throw createError({ statusCode: 404 })

useSeoMeta({
  title: post.value.title,
  description: post.value.excerpt,
  ogImage: post.value.coverImage?.url,
})
</script>

<template>
  <article>{{ post?.title }}</article>
</template>
```

### In Nitro Server Routes

```ts
// server/api/featured-posts.get.ts
export default defineEventHandler(async (event) => {
  const dyrected = useDyrectedServer()

  return dyrected.collections.find('posts', {
    where: {
      and: [
        { status: { equals: 'published' } },
        { featured: { equals: true } },
      ],
    },
    limit: 5,
  })
})
```

### Auth-Aware Server Fetching

Pass the event into `useDyrectedServer()` to make access-controlled requests on behalf of the current user. Access rules run exactly as they do over HTTP.

```vue
<script setup lang="ts">
// useRequestEvent() gives access to the current H3 event
const event = useRequestEvent()

const { data: drafts } = await useAsyncData('drafts', () => {
  const dyrected = useDyrectedServer({ event })
  return dyrected.collections.find('posts', {
    where: { status: { equals: 'draft' } },
  })
})
</script>
```

---

## Client-Side Data Fetching

For client-side interactions — form submissions, auth flows, mutations — use the auto-imported `useDyrectedClient()` composable. It returns the standard `@dyrected/sdk` HTTP client configured for the current app.

```vue
<!-- components/ContactForm.vue -->
<script setup lang="ts">
const status = ref<'idle' | 'loading' | 'done'>('idle')

async function handleSubmit(e: Event) {
  e.preventDefault()
  status.value = 'loading'

  const form = e.target as HTMLFormElement
  const data = Object.fromEntries(new FormData(form))

  const dyrected = useDyrectedClient()

  await dyrected.collections.create('contact-submissions', {
    name: data.name,
    email: data.email,
    message: data.message,
  })

  status.value = 'done'
}
</script>

<template>
  <form @submit="handleSubmit">
    <input name="name" />
    <input name="email" type="email" />
    <textarea name="message" />
    <button type="submit" :disabled="status === 'loading'">
      {{ status === 'loading' ? 'Sending...' : 'Send' }}
    </button>
    <p v-if="status === 'done'">Message sent.</p>
  </form>
</template>
```

---

## Auth Composable

The module auto-imports `useDyrectedAuth()` — a thin wrapper around the SDK auth methods that keeps token state in a Nuxt composable.

```vue
<script setup lang="ts">
const { login, logout, user, token } = useDyrectedAuth()

async function handleLogin() {
  await login('users', {
    email: 'admin@example.com',
    password: 'securepassword',
  })
}
</script>

<template>
  <div v-if="user">
    Logged in as {{ user.email }}
    <button @click="logout('users')">Log out</button>
  </div>
  <button v-else @click="handleLogin">Log in</button>
</template>
```

`token` is a `ref<string | null>` — reactive, SSR-safe, stored in a cookie so it survives page reloads and is available on the server on the next request.

---

## TypeScript Setup

Generate types from your schema and pass them to both composables.

```bash
pnpm dyrected generate:types
```

The module picks up `dyrected.types.ts` automatically if it is present in the project root. Both `useDyrectedServer()` and `useDyrectedClient()` become fully typed — no manual generic required.

If you need to be explicit:

```ts
import type { DyrectedTypes } from '~/dyrected.types'

const dyrected = useDyrectedServer<DyrectedTypes>()
const dyrected = useDyrectedClient<DyrectedTypes>()
```

---

## Environment Variables

```env
# Required
DATABASE_URL=postgres://user:pass@host:5432/myapp
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-aes-256-key

# Required for client-side composable
NUXT_PUBLIC_DYRECTED_API_KEY=local-self-hosted

# Optional
REDIS_URL=redis://localhost:6379
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Caching

Nuxt's data fetching layer (`useAsyncData`, `useFetch`) handles caching automatically using the key you provide. For fine-grained cache invalidation on content changes, trigger revalidation from a collection hook.

### Advanced Cache Invalidation

For large sites, you should invalidate by specific keys or tags.

```ts
// collections/posts.ts
export const Posts = defineCollection({
  slug: 'posts',
  hooks: {
    afterUpdate: [
      async ({ doc }) => {
        // clear Nuxt's payload cache for this post and the blog index
        await $fetch('/api/revalidate', {
          method: 'POST',
          body: { 
            keys: [`post-${doc.slug}`, 'all-posts'] 
          },
        })
      },
    ],
  },
})
```

```ts
// server/api/revalidate.post.ts
export default defineEventHandler(async (event) => {
  const { keys } = await readBody(event)
  const storage = useStorage('cache')
  
  for (const key of keys) {
    await storage.removeItem(key)
  }
  
  return { revalidated: true }
})
```

---

## Module Auto-Imports Summary

`@dyrected/nuxt` auto-imports the following into every component and composable without explicit imports:

| Export | Type | Use |
|---|---|---|
| `useDyrectedServer()` | Composable | Direct in-process client for server-side fetching |
| `useDyrectedClient()` | Composable | HTTP SDK client for client-side interactions |
| `useDyrectedAuth()` | Composable | Auth state and methods (login, logout, user, token) |
| `DyrectedAdmin` | Component | The admin UI component |

---

## Package Exports

```ts
import { ... } from '@dyrected/nuxt'           // Nuxt module (nuxt.config.ts only)
import { ... } from '@dyrected/nuxt/server'    // useDyrectedServer — if you need to import manually
import { ... } from '@dyrected/nuxt/client'    // useDyrectedClient — if you need to import manually
import { ... } from '@dyrected/nuxt/admin'     // DyrectedAdmin component
```

---

---

## Comparison: Next.js vs Nuxt

| | `@dyrected/next` | `@dyrected/nuxt` |
|---|---|---|
| API mounting | Catch-all route handler file | Module auto-mounts into Nitro |
| Server client | `getDyrectedClient()` — manual import | `useDyrectedServer()` — auto-imported |
| Client SDK | `createClient()` from `@dyrected/sdk` | `useDyrectedClient()` — auto-imported |
| Auth state | Manual — use your own session/cookie | `useDyrectedAuth()` — reactive, SSR-safe |
| Admin mounting | `<DyrectedAdmin>` in a catch-all page | `<DyrectedAdmin>` in a catch-all page |
| Admin protection | Middleware or layout auth check | Route middleware or `definePageMeta` |
| TypeScript | Manual generic on `getDyrectedClient<T>()` | Auto-picked up from `dyrected.types.ts` |
| Caching | Next.js fetch cache + `revalidatePath` | `useAsyncData` key + storage invalidation |
| Config file | `dyrected.config.ts` at project root | `dyrected.config.ts` at project root |

---

*This document reflects the v1 adapter targets for `@dyrected/next` and `@dyrected/nuxt`.*
