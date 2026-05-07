# Dyrected SDK

The SDK is the bridge between a website and its Dyrected content. It is installed on the website — not on the CMS. Every site that pulls content from Dyrected uses it.

The SDK is framework-agnostic. It has no dependency on React, Vue, or any other UI framework. It returns plain typed data from plain async functions. If you want reactive wrappers for a specific framework, those are thin layers you build on top — the SDK itself never assumes a rendering context.

---

## Installation

```bash
pnpm add @dyrected/sdk
```

---

## Initialisation

Create one SDK instance per site and export it. Import it wherever you need content.

```ts
// lib/dyrected.ts
import { createClient } from '@dyrected/sdk'

export const dyrected = createClient({
  apiUrl: process.env.DYRECTED_API_URL,   // e.g. https://api.dyrected.com
  apiKey: process.env.DYRECTED_API_KEY,   // x-api-key sent on every request
})
```

In self-hosted mode, `apiUrl` points at your own server. In cloud mode, it points at `https://api.dyrected.com`. The SDK does not know or care which — it just sends requests.

### Config Options

```ts
interface ClientConfig {
  apiUrl: string           // Base URL of the Dyrected backend
  apiKey: string           // Site API key — attached as x-api-key header
  token?: string           // Optional initial auth token (SSR use cases)
  defaultLocale?: string   // Default locale for localised content
  fetch?: typeof fetch     // Custom fetch implementation (e.g. for edge runtimes)
  debug?: boolean          // Log requests and responses to console
}
```

---

## Collections

### `dyrected.collections.find()`

Fetch a paginated, filterable, sortable list of documents from a collection.

```ts
const posts = await dyrected.collections.find('posts', {
  where: {
    status: { equals: 'published' },
  },
  sort: '-publishedAt',
  limit: 10,
  page: 1,
  depth: 1,   // how many levels of relationships to populate
})
```

**Returns:**

```ts
{
  docs: Post[]
  totalDocs: number
  totalPages: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}
```

### `dyrected.collections.findOne()`

Fetch a single document by ID.

```ts
const post = await dyrected.collections.findOne('posts', '64a1f...', {
  depth: 2,
})
```

### `dyrected.collections.findBy()`

Fetch a single document by a field value. Useful for slug-based routing.

```ts
const post = await dyrected.collections.findBy('posts', {
  field: 'slug',
  value: 'my-post-slug',
  depth: 1,
})
```

### `dyrected.collections.create()`

Create a new document. Requires the user to be authenticated unless the collection allows public creation.

```ts
const submission = await dyrected.collections.create('contact-submissions', {
  name: 'Jane Smith',
  email: 'jane@example.com',
  message: 'Hello from the contact form.',
})
```

### `dyrected.collections.update()`

Update an existing document by ID.

```ts
const updated = await dyrected.collections.update('posts', '64a1f...', {
  title: 'Updated title',
})
```

### `dyrected.collections.delete()`

Delete a document by ID.

```ts
await dyrected.collections.delete('posts', '64a1f...')
```

### `dyrected.collections.updateMany()`

Update multiple documents matching a criteria.

```ts
await dyrected.collections.updateMany('posts', 
  { status: 'published' }, 
  { where: { status: { equals: 'draft' } } }
)
```

### `dyrected.collections.deleteMany()`

Delete multiple documents matching a criteria.

```ts
await dyrected.collections.deleteMany('posts', {
  where: { status: { equals: 'archived' } }
})
```

---

## Where Clauses

All `find()` calls accept a `where` object for filtering. Operators mirror what the backend supports.

```ts
// equality
where: { status: { equals: 'published' } }

// inequality
where: { status: { not_equals: 'draft' } }

// comparison
where: { publishedAt: { greater_than: '2024-01-01' } }
where: { views: { less_than_or_equal: 1000 } }

// existence
where: { coverImage: { exists: true } }

// containment (array fields or multi-select)
where: { tags: { in: ['design', 'development'] } }
where: { tags: { not_in: ['archived'] } }

// text search
where: { title: { like: 'headless' } }   // case-insensitive contains

// AND / OR
where: {
  and: [
    { status: { equals: 'published' } },
    { publishedAt: { less_than_or_equal: new Date().toISOString() } },
  ]
}

where: {
  or: [
    { author: { equals: 'user-id-a' } },
    { author: { equals: 'user-id-b' } },
  ]
}
```

---

## Globals

### `dyrected.globals.get()`

Fetch the single instance of a global.

```ts
const navbar = await dyrected.globals.get('navbar', { depth: 1 })
const footer = await dyrected.globals.get('footer')
const settings = await dyrected.globals.get('site-settings')
```

### `dyrected.globals.update()`

Update a global. Requires authentication.

```ts
const updated = await dyrected.globals.update('site-settings', {
  maintenanceMode: true,
})
```

---

## Auth

The SDK manages authentication state internally. Tokens are stored in memory. On the server (SSR / RSC) you pass the token directly in config or per-request. On the client, the SDK handles refresh automatically.

### `dyrected.auth.login()`

```ts
const result = await dyrected.auth.login('users', {
  email: 'admin@example.com',
  password: 'securepassword',
})

// result.token    — access token (15 min)
// result.user     — the authenticated user document
```

The collection slug (`'users'`) matches the auth collection defined in your backend config. If you have multiple auth collections (`users`, `admins`), you call login against whichever is appropriate.

### `dyrected.auth.logout()`

```ts
await dyrected.auth.logout('users')
```

Invalidates the refresh token on the server and clears the token from the SDK instance.

### `dyrected.auth.me()`

Fetch the currently authenticated user.

```ts
const user = await dyrected.auth.me('users')
```

Returns `null` if no valid session exists.

### `dyrected.auth.refresh()`

Manually refresh the access token. The SDK calls this automatically when a request returns `401` — you rarely need to call it yourself.

```ts
const token = await dyrected.auth.refresh('users')
```

### `dyrected.auth.forgotPassword()`

```ts
await dyrected.auth.forgotPassword('users', { email: 'admin@example.com' })
```

### `dyrected.auth.resetPassword()`

```ts
await dyrected.auth.resetPassword('users', {
  token: 'reset-token-from-email',
  password: 'newpassword123',
})
```

### Passing Auth Tokens in SSR

When rendering on the server, you can forward a token from a cookie or session into a per-request client:

```ts
// Next.js server component
import { createClient } from '@dyrected/sdk'
import { cookies } from 'next/headers'

const dyrected = createClient({
  apiUrl: process.env.DYRECTED_API_URL,
  apiKey: process.env.DYRECTED_API_KEY,
  token: cookies().get('dyrected_token')?.value,
})

const drafts = await dyrected.collections.find('posts', {
  where: { status: { equals: 'draft' } },
})
```

---

## Media and File Uploads

Upload a file to an upload collection.

### `dyrected.collections.upload()`

```ts
const image = await dyrected.collections.upload('images', {
  file: fileFromInput,       // File | Blob | Buffer
  data: {
    alt: 'A descriptive alt text',
  },
})

// image.url        — full public URL
// image.sizes      — generated image sizes if configured on the collection
// image.filename   — stored filename
// image.mimeType
// image.filesize
// image.width
// image.height
```

---

## Workspaces and Sites (Cloud Only)

These methods are only available when the SDK is initialised with a workspace-level token (i.e. an admin user token, not a site-level API key). They are intended for building dashboard tooling, not for content delivery on public sites.

### `dyrected.workspaces.list()`

```ts
const workspaces = await dyrected.workspaces.list()
```

### `dyrected.workspaces.create()`

```ts
const workspace = await dyrected.workspaces.create({ name: 'Client A' })
```

### `dyrected.sites.list()`

```ts
const sites = await dyrected.sites.list(workspaceId)
```

### `dyrected.sites.create()`

```ts
const site = await dyrected.sites.create(workspaceId, {
  name: 'clienta.com',
  slug: 'clienta',
})
```

### `dyrected.sites.createApiKey()`

```ts
const { key } = await dyrected.sites.createApiKey(workspaceId, siteId)
```

---

## TypeScript

The SDK is fully typed. When you define your collections and globals in `dyrected.config.ts`, the CLI can generate TypeScript types from your schema.

```bash
pnpm dyrected generate:types
```

This produces a `dyrected.types.ts` file in your project root. Pass it to `createClient` as a generic to get end-to-end type safety across all SDK calls.

```ts
import { createClient } from '@dyrected/sdk'
import type { DyrectedTypes } from './dyrected.types'

export const dyrected = createClient<DyrectedTypes>({
  apiUrl: process.env.DYRECTED_API_URL,
  apiKey: process.env.DYRECTED_API_KEY,
})

// now fully typed:
const posts = await dyrected.collections.find('posts')
// posts.docs → Post[]   ← inferred from your schema, not manually written
```

Without the generic, all methods return `Record<string, any>`. With it, every collection, every field, every global is typed and autocompleted.

---

## Preview Mode

Preview mode lets editors see unpublished content by visiting the site with a short-lived preview token. The SDK switches into preview mode automatically when a `preview` query param or cookie is detected.

```ts
// initialise with preview support
const dyrected = createClient({
  apiUrl: process.env.DYRECTED_API_URL,
  apiKey: process.env.DYRECTED_API_KEY,
  preview: {
    enabled: true,
    secret: process.env.DYRECTED_PREVIEW_SECRET,
  },
})
```

When in preview mode, `find()` and `findOne()` return draft documents alongside published ones. The preview token is scoped to the site and expires after 15 minutes.

---

## Caching

The SDK does not implement its own cache. It is a thin HTTP client — caching decisions belong to the framework or deployment layer.

For Next.js, use the native `fetch` cache options via the custom fetch config:

```ts
const dyrected = createClient({
  apiUrl: process.env.DYRECTED_API_URL,
  apiKey: process.env.DYRECTED_API_KEY,
  fetch: (url, init) =>
    fetch(url, {
      ...init,
      next: { revalidate: 60 },   // ISR — revalidate every 60 seconds
    }),
})
```

For Nuxt, wrap SDK calls in `useAsyncData` or `useFetch` as you normally would — the SDK returns a plain promise that works with either.

---

## Error Handling

All SDK methods throw a `DyrectedError` on non-2xx responses. The error includes the structured error body from the backend.

```ts
import { DyrectedError } from '@dyrected/sdk'

try {
  const post = await dyrected.collections.findOne('posts', 'bad-id')
} catch (err) {
  if (err instanceof DyrectedError) {
    console.log(err.code)      // e.g. 'NOT_FOUND'
    console.log(err.message)   // human-readable message
    console.log(err.status)    // HTTP status code
    console.log(err.field)     // field name if validation error
  }
}
```

---

## Full Method Reference

### Collections

| Method | Signature | Auth required |
|---|---|---|
| `find` | `(slug, options?) → PaginatedResult<T>` | Optional |
| `findOne` | `(slug, id, options?) → T` | Optional |
| `findBy` | `(slug, { field, value }, options?) → T` | Optional |
| `create` | `(slug, data) → T` | Depends on access rule |
| `update` | `(slug, id, data) → T` | Yes |
| `delete` | `(slug, id) → void` | Yes |
| `upload` | `(slug, { file, data }) → T` | Depends on access rule |

### Globals

| Method | Signature | Auth required |
|---|---|---|
| `get` | `(slug, options?) → T` | Optional |
| `update` | `(slug, data) → T` | Yes |

### Auth

| Method | Signature | Auth required |
|---|---|---|
| `login` | `(collection, { email, password }) → { token, user }` | No |
| `logout` | `(collection) → void` | Yes |
| `me` | `(collection) → User \| null` | Yes |
| `refresh` | `(collection) → string` | No (uses refresh cookie) |
| `forgotPassword` | `(collection, { email }) → void` | No |
| `resetPassword` | `(collection, { token, password }) → void` | No |

### Workspaces (Cloud Only)

| Method | Signature |
|---|---|
| `list` | `() → Workspace[]` |
| `create` | `({ name }) → Workspace` |
| `get` | `(id) → Workspace` |
| `update` | `(id, data) → Workspace` |
| `delete` | `(id) → void` |

### Sites (Cloud Only)

| Method | Signature |
|---|---|
| `list` | `(workspaceId) → Site[]` |
| `create` | `(workspaceId, { name, slug }) → Site` |
| `get` | `(workspaceId, siteId) → Site` |
| `update` | `(workspaceId, siteId, data) → Site` |
| `delete` | `(workspaceId, siteId) → void` |
| `createApiKey` | `(workspaceId, siteId) → { key }` |
| `deleteApiKey` | `(workspaceId, siteId, keyId) → void` |

---

## Package Entry Points

The SDK ships multiple entry points so you only import what you need.

```ts
import { createClient } from '@dyrected/sdk'           // full client
import type { DyrectedTypes } from '@dyrected/sdk'     // type utilities
import { DyrectedError } from '@dyrected/sdk/errors'   // error class only
```

---

*This document reflects the v1 SDK target.*
