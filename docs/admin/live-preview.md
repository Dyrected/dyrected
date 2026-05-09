---
title: Live Preview
description: Enable real-time content preview in your storefront while editing in the Admin UI.
---

Live Preview lets content editors see exactly how their changes will look on the frontend *before* saving. As they type, the Admin UI sends the current draft values to a preview iframe — the storefront re-renders instantly.

---

## How It Works

```
Admin UI (Editor)
  │
  │  form.watch() → debounce 400ms
  │
  ├─ postMessage({ type: 'dyrected-live-preview', data: formValues })
  │        │
  │        ▼
  │   Preview iframe (your storefront)
  │     window.addEventListener('message', handler)
  │     merge data into local state → re-render
  │
  └─ (or token mode: POST /api/preview-token → GET /api/preview-data)
```

### Handshake
To ensure the Admin UI doesn't send data before the iframe is ready, the iframe should emit:
`window.parent.postMessage({ type: 'dyrected-live-preview-ready' }, '*')`

The Admin UI will then respond by sending the initial document data.

---

## Step 1 — Enable on a Collection

Add `admin.previewUrl` to any collection. This tells the Admin UI to show a split-pane preview panel on the Edit page:

```ts
// dyrected.config.ts
{
  slug: 'posts',
  admin: {
    previewUrl: (doc, { locale }) => {
      if (!doc?.slug) return null
      return `${process.env.SITE_URL}/posts/${doc.slug}?preview=true`
    },
    previewMode: 'postMessage',  // default
  },
  fields: [...],
}
```

### `previewUrl`

| Type | Description |
|---|---|
| `string` | A static URL. The iframe always loads this URL. |
| `(doc, { locale }) => string \| null` | A function called with the current document values. Return `null` to hide the preview pane. |

### `previewMode`

| Value | Description |
|---|---|
| `'postMessage'` | The Admin sends draft data directly to the iframe via `postMessage`. No server round-trip. Works for same-origin and CORS-enabled URLs. |
| `'token'` | The Admin generates a signed preview token and navigates the iframe to a token-authenticated URL. Suitable for statically generated sites where `postMessage` is impractical. |

---

## Step 2 — Add the hook to your frontend

### React / Next.js — `useLivePreview`

Install:

```bash
pnpm add @dyrected/react
```

Use on your preview page (must be a **client component**):

```tsx
// app/posts/[slug]/preview/page.tsx
'use client'
import { useLivePreview } from '@dyrected/react'

interface Props {
  initialPost: Post
}

export default function PostPreview({ initialPost }: Props) {
  const { data: post, isLive } = useLivePreview<Post>({
    initialData: initialPost,
    serverURL: process.env.NEXT_PUBLIC_CMS_ADMIN_URL!,
    // ^ Must match the origin of your Admin UI
  })

  return (
    <article>
      {isLive && (
        <div className="preview-banner">
          ✦ Preview Mode — changes appear in real-time
        </div>
      )}
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.body }} />
    </article>
  )
}
```

**Hook API:**

```ts
const { data, isLive } = useLivePreview<T>({
  initialData: T,     // The server-fetched data to show until the first preview message arrives
  serverURL: string,  // The origin of the Admin UI (used to validate postMessage origin)
  depth?: number,     // (future) Relationship population depth
})
```

| Return | Type | Description |
|---|---|---|
| `data` | `T` | The live draft data. Starts as `initialData`, updates on each `postMessage`. |
| `isLive` | `boolean` | `true` once the first preview message has been received. |

---

### Vue / Nuxt — `useLivePreview`

The composable is auto-imported by `@dyrected/nuxt`. No separate install needed.

```vue
<!-- pages/posts/[slug]/preview.vue -->
<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

// Fetch initial data server-side
const { data: initialPost } = await useDyrected<Post>('posts').find({
  where: { slug: { equals: route.params.slug } },
  depth: 1,
})

// Enable live preview (client-side only)
const { data: post, isLive } = useLivePreview({
  initialData: initialPost.value?.docs?.[0],
  serverURL: config.public.cmsAdminUrl,
})
</script>

<template>
  <article>
    <div v-if="isLive" class="preview-banner">
      ✦ Preview Mode
    </div>
    <h1>{{ post?.title }}</h1>
  </article>
</template>
```

**Composable API:**

```ts
const { data, isLive } = useLivePreview<T>({
  initialData: T,
  serverURL: string,
})
```

| Return | Type | Description |
|---|---|---|
| `data` | `Ref<T>` | Reactive live data |
| `isLive` | `Ref<boolean>` | `true` once the first message is received |

---

## Token Mode (for Static Sites)

Use `previewMode: 'token'` when your frontend is statically generated and cannot easily receive `postMessage` from the Admin. In this mode, the Admin:

1. Issues a short-lived signed JWT stored temporarily on the server
2. Navigates the iframe to your preview URL with `?token=<jwt>`
3. Your frontend fetches the draft data from `/api/preview-data?token=<jwt>`

### Backend requirements

Token mode requires **Redis** in your Dyrected config for token storage:

```ts
// dyrected.config.ts
export default defineConfig({
  redis: {
    url: process.env.REDIS_URL,
  },
  ...
})
```

### Frontend token consumption (Next.js)

```ts
// app/api/preview/route.ts
import { createClient } from '@dyrected/sdk'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 400 })

  const client = createClient({ baseUrl: process.env.DYRECTED_URL! })
  const previewData = await client.getPreviewData(token)

  // Enable Next.js draft mode and redirect to the preview page
  const response = NextResponse.redirect(`/posts/${previewData.data.slug}`)
  // Store previewData in a cookie for the page to read
  response.cookies.set('preview-data', JSON.stringify(previewData.data))
  return response
}
```

---

## Preview URL Best Practices

- Make the preview URL distinct from the live URL (e.g., `/posts/my-slug?preview=true` or `/preview/posts/my-slug`) so you can conditionally render the `useLivePreview` hook only on preview pages.
- Use an environment variable for the site URL so it works across local, staging, and production.
- Return `null` from `previewUrl` when required fields (like `slug`) are empty to avoid showing a broken iframe.

```ts
previewUrl: (doc) => {
  if (!doc?.slug) return null
  const base = process.env.NODE_ENV === 'production'
    ? 'https://mysite.com'
    : 'http://localhost:3000'
  return `${base}/posts/${doc.slug}?preview=true`
}
```
