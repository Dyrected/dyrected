---
title: SDK (Framework-Agnostic)
description: Using @dyrected/sdk in vanilla JS, SvelteKit, Astro, and any other environment.
---

`@dyrected/sdk` works anywhere JavaScript runs — Node.js, the browser, edge runtimes, and any framework. This guide covers setup patterns for environments outside of Next.js and Nuxt (which have their own integration guides).

For the full method reference see [SDK Reference](/docs/reference/sdk).

---

## Installation

```bash
pnpm add @dyrected/sdk
# or
npm install @dyrected/sdk
```

---

## Creating a client

```ts
import { createClient } from '@dyrected/sdk'

export const cms = createClient({
  baseUrl: 'https://your-site.com/api/dyrected',
  apiKey: process.env.DYRECTED_API_KEY,
  siteId: process.env.DYRECTED_SITE_ID,  // Cloud mode only
})
```

Create the client once and export it — import it wherever you need data. The client is stateless and safe to share across requests in server environments.

---

## SvelteKit

### Fetching data in a `+page.server.ts`

```ts
// src/routes/blog/+page.server.ts
import { cms } from '$lib/cms'

export async function load() {
  const { docs: posts } = await cms.collection('posts').find({
    where: { status: { equals: 'published' } },
    sort: '-createdAt',
    depth: 1,
  })
  return { posts }
}
```

### Fetching a single document

```ts
// src/routes/blog/[slug]/+page.server.ts
import { cms } from '$lib/cms'
import { error } from '@sveltejs/kit'

export async function load({ params }) {
  const { docs } = await cms.collection('posts').find({
    where: { slug: { equals: params.slug } },
    depth: 1,
  })
  if (!docs[0]) error(404)
  return { post: docs[0] }
}
```

### Mutating data in a form action

```ts
// src/routes/contact/+page.server.ts
import { cms } from '$lib/cms'

export const actions = {
  default: async ({ request }) => {
    const data = Object.fromEntries(await request.formData())
    await cms.collection('inquiries').create(data)
    return { success: true }
  },
}
```

### Globals

```ts
const settings = await cms.global('site-settings').get()
```

---

## Astro

### In a `.astro` component (SSR or static)

```astro
---
// src/pages/blog/index.astro
import { cms } from '../lib/cms'

const { docs: posts } = await cms.collection('posts').find({
  where: { status: { equals: 'published' } },
  sort: '-createdAt',
})
---

<ul>
  {posts.map(post => <li>{post.title}</li>)}
</ul>
```

### In an API route

```ts
// src/pages/api/revalidate.ts
import type { APIRoute } from 'astro'
import { cms } from '../../lib/cms'

export const GET: APIRoute = async () => {
  const { docs } = await cms.collection('posts').find({ limit: 5 })
  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

---

## Vanilla Node.js / scripts

```ts
import { createClient } from '@dyrected/sdk'

const cms = createClient({
  baseUrl: process.env.DYRECTED_URL!,
  apiKey: process.env.DYRECTED_API_KEY!,
})

// Seed script example
const existing = await cms.collection('posts').find({ limit: 1 })
if (existing.total === 0) {
  await cms.collection('posts').create({
    title: 'Hello World',
    status: 'published',
  })
  console.log('Seeded initial post.')
}
```

---

## Browser / client-side

The SDK works in the browser. Use a public API key (one whose collection access functions allow public reads) and never expose server-side keys.

```ts
import { createClient } from '@dyrected/sdk'

const cms = createClient({
  baseUrl: 'https://your-site.com/api/dyrected',
  apiKey: import.meta.env.PUBLIC_DYRECTED_API_KEY,
})

// e.g. in a React component, Vue setup, or Svelte script
const { docs } = await cms.collection('posts').find({ limit: 5 })
```

---

## Authentication

Auth methods are available on any collection with `auth: true`.

```ts
// Login
const { token, user } = await cms.collection('users').login('user@example.com', 'password')
cms.setToken(token)

// Fetch current user
const me = await cms.collection('users').me()

// Logout
await cms.collection('users').logout()
cms.clearToken()
```

For invite-based registration:

```ts
// Send invite (requires authenticated token)
await cms.collection('users').invite('newuser@example.com')

// Accept invite and create account
const { token, user } = await cms.collection('users').acceptInvite(inviteToken, 'newpassword', {
  name: 'Jane Doe',
})
cms.setToken(token)
```

---

## TypeScript

Pass your document type as a generic for fully typed responses:

```ts
interface Post {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  createdAt: string
}

const { docs } = await cms.collection<Post>('posts').find()
// docs is Post[]
```

---

## Error handling

The SDK throws `DyrectedError` on non-2xx responses:

```ts
import { DyrectedError } from '@dyrected/sdk'

try {
  await cms.collection('posts').findOne('bad-id')
} catch (err) {
  if (err instanceof DyrectedError) {
    console.log(err.statusCode) // 404
    console.log(err.message)
    console.log(err.errors)    // validation errors on 400
  }
}
```
