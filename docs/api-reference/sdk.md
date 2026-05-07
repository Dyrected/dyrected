---
title: SDK Reference
description: Using the @dyrected/sdk client in any JavaScript or TypeScript project.
---

`@dyrected/sdk` is a framework-agnostic TypeScript client for the Dyrected REST API. It works in Next.js, Nuxt, SvelteKit, plain Node.js, and browser environments.

---

## Installation

```bash
pnpm add @dyrected/sdk
# or
npm install @dyrected/sdk
```

---

## Creating a Client

```ts
import { createClient } from '@dyrected/sdk'

const client = createClient({
  baseUrl: 'https://your-site.com/api',  // Your Dyrected API base URL
  apiKey: process.env.DYRECTED_API_KEY,  // Site API Key
  siteId: process.env.DYRECTED_SITE_ID,  // Required in Cloud mode
})
```

### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `baseUrl` | `string` | ✅ | Base URL of your Dyrected instance |
| `apiKey` | `string` | | Site API Key. Sent as `x-api-key` header. |
| `siteId` | `string` | | Site ID. Sent as `x-site-id` header. Required in Cloud mode. |
| `token` | `string` | | JWT token for user-authenticated requests. Sent as `Authorization: Bearer` header. |
| `defaultDepth` | `number` | | Default relationship population depth (default: `0`) |
| `fetch` | `typeof fetch` | | Custom `fetch` implementation (e.g., for Node 18 polyfills) |

---

## Collection Methods

All collection methods are accessed via `client.collection(slug)`.

### `.find(options?)`

Returns a paginated list of documents.

```ts
const result = await client.collection('posts').find({
  limit: 10,
  page: 1,
  sort: '-createdAt',
  depth: 1,
  where: {
    status: { equals: 'published' },
  },
})

// result.docs: Post[]
// result.total: number
// result.totalPages: number
// result.hasNextPage: boolean
```

#### Where Operators

```ts
where: {
  title: { like: 'typescript' },         // case-insensitive contains
  price: { greater_than: 100, less_than: 500 },
  status: { in: ['draft', 'published'] },
  publishedAt: { exists: true },
  or: [
    { status: { equals: 'published' } },
    { featured: { equals: true } },
  ],
}
```

---

### `.findOne(id, options?)`

Fetch a single document by ID.

```ts
const post = await client.collection('posts').findOne('abc123', { depth: 2 })
```

---

### `.create(data)`

Create a new document.

```ts
const post = await client.collection('posts').create({
  title: 'Hello World',
  status: 'draft',
  author: 'user-id-here',
})
```

---

### `.update(id, data)`

Partially update a document. Only the fields you pass are changed.

```ts
const updated = await client.collection('posts').update('abc123', {
  status: 'published',
  publishedAt: new Date().toISOString(),
})
```

---

### `.delete(id)`

Delete a document.

```ts
await client.collection('posts').delete('abc123')
```

---

### `.upload(file, data?)`

Upload a file to an upload collection. Accepts a `File` or `Blob` (browser). Node.js support via standard `fetch` + `FormData`.

```ts
// Browser — File from <input type="file">
const mediaDoc = await client.collection('media').upload(file, {
  alt: 'A mountain landscape',
})

// Blob from fetch or canvas
const blob = await fetch('/some-image.jpg').then(r => r.blob())
const mediaDoc = await client.collection('media').upload(blob, {
  alt: 'Fetched image',
})
```

---

## Global Methods

Access globals via `client.global(slug)`.

### `.get(options?)`

```ts
const settings = await client.global('site-settings').get({ depth: 1 })
```

### `.update(data)`

```ts
await client.global('site-settings').update({
  siteName: 'My New Name',
})
```

---

## Auth Methods

> **Note:** Auth collection endpoints are not yet implemented in `@dyrected/core`. These methods are planned — see Phase 13.1 in the implementation plan.

For collections with `auth: true`.

### `.login(email, password)` *(planned)*

```ts
const { token, user } = await client.collection('users').login(
  'user@example.com',
  'my-password'
)
client.setToken(token)
```

### `.me()` *(planned)*

```ts
const user = await client.collection('users').me()
```

### `.logout()` *(planned)*

```ts
await client.collection('users').logout()
client.clearToken()
```

### `.setToken(token)` / `.clearToken()` *(planned)*

```ts
client.setToken(token)
client.clearToken()
```

---

## Schema Methods

### `.getSchemas()`

Returns the full schema definition for all collections and globals.

```ts
const schemas = await client.getSchemas()
// schemas.collections: CollectionSchema[]
// schemas.globals: GlobalSchema[]
```

---

## TypeScript Generics

The SDK is fully typed. Pass your document type as a generic for type-safe responses:

```ts
interface Post {
  id: string
  title: string
  status: 'draft' | 'published'
  author: string | Author  // string at depth=0, Author at depth>=1
  createdAt: string
}

const result = await client.collection<Post>('posts').find({ depth: 1 })
// result.docs is Post[]
```

---

## Error Handling

> **Note:** `DyrectedError` is not yet implemented. The SDK currently throws a generic `Error`. The typed class is planned — see Phase 13.2 in the implementation plan.

```ts
import { DyrectedError } from '@dyrected/sdk'

try {
  const post = await client.collection('posts').findOne('invalid-id')
} catch (err) {
  if (err instanceof DyrectedError) {
    console.log(err.statusCode) // 404
    console.log(err.message)
    console.log(err.errors)     // validation error array (on 400)
  }
}
```

---

## Next.js Usage

```ts
// app/blog/[slug]/page.tsx
import { createClient } from '@dyrected/sdk'

const client = createClient({
  baseUrl: process.env.DYRECTED_URL!,
  apiKey: process.env.DYRECTED_API_KEY!,
})

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const { docs } = await client.collection('posts').find({
    where: { slug: { equals: params.slug } },
    depth: 1,
  })
  const post = docs[0]
  if (!post) notFound()

  return <article>{post.title}</article>
}

// Statically pre-render all post slugs
export async function generateStaticParams() {
  const { docs } = await client.collection('posts').find({
    where: { status: { equals: 'published' } },
    limit: 100,
  })
  return docs.map(p => ({ slug: p.slug }))
}
```

## Nuxt Usage

See [useDyrected composable](/docs/integrations/nuxt) — the Nuxt module wraps this SDK with SSR-aware caching via `useAsyncData`.
