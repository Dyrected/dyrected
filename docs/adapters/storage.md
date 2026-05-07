---
title: Storage Adapters
description: Complete guide to configuring file storage, upload options, and image resizing.
---

Dyrected delegates file storage to a **storage adapter**. The adapter determines where uploaded files are stored and how their public URLs are resolved. You configure one adapter globally and it is used by all upload-enabled collections.

---

## Local File System

Stores files on the server's local disk. Best for development and single-server deployments. **Not suitable** for serverless (Vercel, Cloudflare Workers) because the filesystem is ephemeral.

```ts
import { LocalStorage } from '@dyrected/storage-local'

export default defineConfig({
  storage: new LocalStorage({
    path: './public/uploads',   // Directory to write files to
    baseUrl: '/uploads',        // Public URL prefix
  }),
})
```

Files are served as static assets by your framework's public directory. The `url` on a media document will be `/uploads/filename.jpg`.

---

## AWS S3 (and S3-Compatible Services)

Use for production and serverless environments. Compatible with **AWS S3**, **DigitalOcean Spaces**, **Backblaze B2**, **MinIO**, **Cloudflare R2**, and any other S3-compatible API.

```ts
import { S3Storage } from '@dyrected/storage-s3'

export default defineConfig({
  storage: new S3Storage({
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    // Optional: custom endpoint for non-AWS S3-compatible providers
    endpoint: process.env.S3_ENDPOINT,      // e.g. 'https://nyc3.digitaloceanspaces.com'
    forcePathStyle: false,                  // Set true for MinIO
    // Optional: CDN URL prefix — if set, this is used for `url` instead of the S3 URL
    cdnUrl: process.env.CDN_URL,            // e.g. 'https://cdn.mysite.com'
    // Optional: ACL for uploaded objects
    acl: 'public-read',                     // default: 'public-read'
  }),
})
```

### DigitalOcean Spaces example

```ts
new S3Storage({
  bucket: 'my-space',
  region: 'nyc3',
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  cdnUrl: 'https://my-space.nyc3.cdn.digitaloceanspaces.com',
})
```

### Cloudflare R2 example

```ts
new S3Storage({
  bucket: 'my-r2-bucket',
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  cdnUrl: process.env.R2_PUBLIC_DOMAIN,   // Your custom R2 public domain
})
```

---

## Cloudinary

For advanced image optimisation, transformations, and CDN delivery.

```ts
import { CloudinaryStorage } from '@dyrected/storage-cloudinary'

export default defineConfig({
  storage: new CloudinaryStorage({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey:    process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
    folder: 'my-project',       // Optional: upload into a specific folder
    // Optional: default transformation applied to all uploaded images
    transformation: { quality: 'auto', fetch_format: 'auto' },
  }),
})
```

With Cloudinary, image `imageSizes` in your upload config are ignored — use Cloudinary URL transformations instead:

```ts
// In your frontend, use the Cloudinary URL transformation API
const thumbnailUrl = doc.url.replace('/upload/', '/upload/w_300,h_300,c_fill/')
```

---

## Writing a Custom Adapter

Implement the `StorageAdapter` interface to support any storage backend:

```ts
import type { StorageAdapter } from '@dyrected/core'

class MyCustomStorage implements StorageAdapter {
  async upload(file: Buffer, options: {
    filename: string
    mimeType: string
    size: number
  }): Promise<{ url: string; filename: string }> {
    // Upload the file and return its public URL
    const url = await myUploadService.put(options.filename, file)
    return { url, filename: options.filename }
  }

  async delete(filename: string): Promise<void> {
    await myUploadService.remove(filename)
  }
}

export default defineConfig({
  storage: new MyCustomStorage(),
})
```

---

## How `url` is Resolved

Always use `doc.url` from the API response — never hand-assemble paths:

| Adapter | `url` value |
|---|---|
| `LocalStorage` | `/uploads/image.jpg` |
| `S3Storage` (no CDN) | `https://bucket.s3.region.amazonaws.com/image.jpg` |
| `S3Storage` (with `cdnUrl`) | `https://cdn.mysite.com/image.jpg` |
| `CloudinaryStorage` | `https://res.cloudinary.com/cloud-name/image/upload/image.jpg` |

For image sizes, each size's `url` is also pre-resolved:

```json
{
  "url": "https://cdn.mysite.com/hero.jpg",
  "sizes": {
    "thumbnail": { "url": "https://cdn.mysite.com/hero-thumbnail.jpg" }
  }
}
```

---

## Upload Config Reference

Configure the upload behaviour per collection (see also [Upload Collections](/docs/core/upload)):

```ts
{
  slug: 'media',
  upload: {
    allowedMimeTypes: ['image/*', 'application/pdf'],
    maxFileSize: 10_000_000,
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300, crop: 'center' },
      { name: 'card',      width: 800, height: 450 },
      { name: 'hero',      width: 1920 },
    ],
    adminThumbnail: 'thumbnail',
  },
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `allowedMimeTypes` | `string[]` | all | Allowed MIME type patterns. Supports `image/*` globs. |
| `maxFileSize` | `number` | `7_000_000` | Max upload size in bytes |
| `imageSizes` | `ImageSize[]` | `[]` | Resize configurations (see below) |
| `adminThumbnail` | `string` | original | Which `imageSizes` entry to use in the Admin media grid |

### `ImageSize` options

| Option | Type | Description |
|---|---|---|
| `name` | `string` | Unique identifier used in the API response |
| `width` | `number` | Target width in pixels |
| `height` | `number` | Target height in pixels (optional) |
| `crop` | `string` | Crop position: `'center'`, `'top'`, `'bottom'`, `'left'`, `'right'` |
| `fit` | `string` | sharp fit: `'cover'`, `'contain'`, `'fill'`, `'inside'`, `'outside'` |
| `withoutEnlargement` | `boolean` | Don't upscale images smaller than the target (default: `true`) |
| `formatOptions` | `object` | sharp format options, e.g. `{ jpeg: { quality: 85 } }` |
