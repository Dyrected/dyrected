---
title: Live Preview
description: See content changes in real time while editing in the Admin UI.
---

Live preview lets editors see their changes rendered in your actual frontend as they type — without publishing. This guide wires up live preview end-to-end in a Next.js app.

---

## How it works

1. The Admin UI renders your frontend in an iframe
2. As the editor types, the Admin UI sends the draft document data to the iframe via `postMessage`
3. Your frontend receives the message and re-renders with the draft data

No polling, no extra API calls — just a direct message between the Admin iframe and your page.

---

## 1. Configure live preview on the collection

```ts
// dyrected.config.ts
{
  slug: 'posts',
  admin: {
    livePreview: {
      url: ({ doc }) =>
        `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${doc.slug}/preview`,
    },
  },
  fields: [...],
}
```

The `url` function receives the current draft document and returns the URL the Admin UI loads in the iframe. The URL can be relative (used as-is) or constructed from the doc's fields.

---

## 2. Create the preview route in Next.js

The preview page renders the draft document passed via `postMessage`. It doesn't need to fetch from the API — the data arrives through the message.

```tsx
// app/blog/[slug]/preview/page.tsx
'use client'
import { useEffect, useState } from 'react'

export default function PostPreviewPage() {
  const [post, setPost] = useState<any>(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'dyrected:preview') {
        setPost(event.data.doc)
      }
    }
    window.addEventListener('message', handleMessage)

    // Tell the Admin UI this page is ready to receive messages
    window.parent.postMessage({ type: 'dyrected:preview:ready' }, '*')

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!post) {
    return <div className="p-8 text-muted">Waiting for preview data…</div>
  }

  return (
    <article className="prose mx-auto py-12 px-4">
      <h1>{post.title}</h1>
      {post.content && <div dangerouslySetInnerHTML={{ __html: post.content }} />}
    </article>
  )
}
```

---

## 3. Use the React hook (optional)

If you prefer a hook over raw `useEffect`, Dyrected ships a `useLivePreview` hook:

```tsx
'use client'
import { useLivePreview } from '@dyrected/next/live-preview'

export default function PostPreviewPage({ initialData }: { initialData: any }) {
  const { data: post } = useLivePreview({
    initialData,
    serverURL: process.env.NEXT_PUBLIC_DYRECTED_URL!,
    depth: 1,
  })

  return (
    <article className="prose mx-auto py-12 px-4">
      <h1>{post.title}</h1>
    </article>
  )
}
```

Pass `initialData` from a server component so the preview page has something to show before the first postMessage arrives:

```tsx
// app/blog/[slug]/preview/page.tsx (server component wrapper)
export default async function PreviewPageWrapper({ params }: any) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/posts?where[slug][equals]=${params.slug}&depth=1`,
    { headers: { 'x-api-key': process.env.DYRECTED_API_KEY! }, cache: 'no-store' }
  )
  const { docs } = await res.json()

  return <PostPreviewPage initialData={docs[0] ?? {}} />
}
```

---

## 4. Use the Nuxt composable

```vue
<!-- pages/blog/[slug]/preview.vue -->
<script setup lang="ts">
const { data: post } = useDyrectedLivePreview({
  depth: 1,
})
</script>

<template>
  <article v-if="post" class="prose mx-auto py-12">
    <h1>{{ post.title }}</h1>
  </article>
  <div v-else>Waiting for preview data…</div>
</template>
```

---

## 5. Secure the preview route

The preview URL should not be accessible to the public. Protect it with a middleware check that verifies the request came from the Admin UI:

```ts
// middleware.ts
export function middleware(req: NextRequest) {
  const referer = req.headers.get('referer') ?? ''
  const isPreview = req.nextUrl.pathname.includes('/preview')
  const fromAdmin = referer.includes(process.env.NEXT_PUBLIC_ADMIN_URL ?? '/admin')

  if (isPreview && !fromAdmin) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}
```

---

## Testing

1. Open the Admin UI and edit a post
2. Click the **Preview** button in the top-right
3. The preview pane opens with your frontend loaded in an iframe
4. Edit the title — it updates in the preview in real time

See [Live Preview reference](/docs/features/live-preview) for the full config options.
