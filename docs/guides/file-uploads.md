---
title: File Uploads
description: Accept file uploads, store them locally or in S3/Cloudinary, and display images.
---

This guide covers adding an upload collection, configuring a storage adapter, uploading files through the Admin UI or SDK, and rendering images in your frontend.

---

## 1. Configure a storage adapter

### Local (development)

Files are written to `public/uploads` and served from `<origin>/uploads/<filename>`.

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core'
import { LocalStorage } from '@dyrected/storage-local'

export default defineConfig({
  storage: new LocalStorage({ dir: './public/uploads' }),
})
```

### S3-compatible (production)

```ts
import { S3Storage } from '@dyrected/storage-s3'

export default defineConfig({
  storage: new S3Storage({
    bucket:    process.env.S3_BUCKET!,
    region:    process.env.S3_REGION!,
    accessKey: process.env.S3_ACCESS_KEY!,
    secretKey: process.env.S3_SECRET_KEY!,
  }),
})
```

See [Storage Adapters](/adapters/storage) for Cloudinary and all options.

---

## 2. Define an upload collection

```ts
// dyrected.config.ts
import { ImageSizes } from '@dyrected/core'

export default defineConfig({
  collections: [
    {
      slug: 'media',
      upload: {
        mimeTypes:   ['image/jpeg', 'image/png', 'image/webp'],
        maxFileSize: 5 * 1024 * 1024,   // 5 MB
        imageSizes: [
          { name: 'thumbnail', width: 300, height: 300, fit: 'cover' },
          { name: 'card',      width: 800 },
        ],
      },
      fields: [
        { name: 'alt', type: 'text' },
      ],
    },
  ],
})
```

---

## 3. Upload via the Admin UI

The Admin UI automatically renders a file picker for upload collections. Drag-and-drop or click to select a file. Image sizes are generated on the server after upload.

---

## 4. Upload via the SDK

```ts
import { createClient } from '@dyrected/sdk'

const client = createClient({
  baseUrl: '/api/dyrected',
  apiKey: process.env.DYRECTED_API_KEY,
})

async function uploadFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  form.append('alt', file.name)

  const media = await client.collection('media').upload(form)
  return media
}
```

Or upload directly with `fetch`:

```ts
const form = new FormData()
form.append('file', file)

const res = await fetch('/api/dyrected/collections/media', {
  method: 'POST',
  headers: { 'x-api-key': process.env.DYRECTED_API_KEY! },
  body: form,
})
const media = await res.json()
```

---

## 5. Attach media to another collection

Use a `relationship` field to link a media document to another collection:

```ts
{
  slug: 'posts',
  fields: [
    { name: 'title',      type: 'text' },
    { name: 'coverImage', type: 'relationship', relationTo: 'media' },
  ],
}
```

Query with `depth: 1` to inline the media document:

```ts
const { docs } = await client.collection('posts').find({ depth: 1 })
// docs[0].coverImage.url  → full storage URL
// docs[0].coverImage.sizes.thumbnail.url
```

---

## 6. Render images in Next.js

```tsx
import Image from 'next/image'

export default function PostCard({ post }: { post: any }) {
  const cover = post.coverImage
  if (!cover) return null

  return (
    <Image
      src={cover.sizes?.card?.url ?? cover.url}
      alt={cover.alt ?? ''}
      width={800}
      height={450}
    />
  )
}
```

> For `next/image` to allow external domains, add them to `images.remotePatterns` in `next.config.ts`.
