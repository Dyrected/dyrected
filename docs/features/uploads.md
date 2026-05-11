---
title: Upload Collections
description: How to configure file and image uploads in Dyrected collections.
---

Setting `upload: true` on a collection enables file uploads. Dyrected adds storage integration, image resizing, MIME-type validation, and a dedicated Media browser in the Admin UI automatically.

---

## Enabling Uploads

```ts
export const Media = defineCollection({
  slug: 'media',
  upload: true,
  fields: [
    { name: 'alt', type: 'text' },
    { name: 'caption', type: 'textarea' },
  ],
})
```

When `upload: true`, Dyrected automatically adds the following fields to every uploaded document:
- `filename` — original file name
- `mimeType` — detected MIME type (e.g. `image/jpeg`)
- `filesize` — size in bytes
- `width` / `height` — pixel dimensions (images only)
- `url` — the public URL to the file (resolved by your storage adapter)

You do not need to declare these in your `fields` array.

---

## Upload Config Options

Pass an object instead of `true` for full control:

```ts
upload: {
  staticDir: './public/media',       // Local disk path to store files (LocalStorage only)
  staticURL: '/media',               // Public URL prefix for locally stored files
  allowedMimeTypes: ['image/*', 'application/pdf'],  // Allowed types (glob patterns)
  maxFileSize: 10_000_000,           // Max file size in bytes (10 MB)
  imageSizes: [
    { name: 'thumbnail', width: 300, height: 300, crop: 'center' },
    { name: 'card',      width: 800, height: 450, crop: 'center' },
    { name: 'hero',      width: 1920, fit: 'contain' },
  ],
  adminThumbnail: 'thumbnail',      // Which imageSizes entry to use in the Admin grid
}
```

### `allowedMimeTypes`

An array of MIME type patterns. Supports glob wildcards:

```ts
allowedMimeTypes: ['image/*']                        // All images
allowedMimeTypes: ['image/jpeg', 'image/png']        // JPEG and PNG only
allowedMimeTypes: ['image/*', 'video/*', 'application/pdf']  // Mixed
```

Files not matching an allowed type are rejected with `400 Bad Request`.

### `maxFileSize`

Maximum allowed upload size in bytes. Defaults to `7_000_000` (7 MB). Files exceeding this are rejected before reaching your storage adapter.

### `imageSizes`

An array of resize configurations. When an image is uploaded, Dyrected generates each size asynchronously using [sharp](https://sharp.pixelplumbing.com/).

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Unique name used in the API response and as a URL suffix |
| `width` | `number` | Target width in pixels |
| `height` | `number` | Target height in pixels (optional if using `fit: 'contain'`) |
| `crop` | `string` | Crop position: `'center'`, `'top'`, `'left'`, `'right'`, `'bottom'` |
| `fit` | `string` | sharp `fit` strategy: `'cover'`, `'contain'`, `'fill'`, `'inside'`, `'outside'` |
| `withoutEnlargement` | `boolean` | Never upscale smaller images (default: `true`) |

Each generated size is stored alongside the original and returned in the API response:

```json
{
  "id": "abc123",
  "filename": "hero.jpg",
  "url": "https://cdn.example.com/media/hero.jpg",
  "mimeType": "image/jpeg",
  "filesize": 982345,
  "width": 2400,
  "height": 1600,
  "alt": "A mountain landscape",
  "sizes": {
    "thumbnail": {
      "url": "https://cdn.example.com/media/hero-thumbnail.jpg",
      "width": 300,
      "height": 300,
      "filesize": 18200
    },
    "card": {
      "url": "https://cdn.example.com/media/hero-card.jpg",
      "width": 800,
      "height": 450,
      "filesize": 65400
    }
  }
}
```

---

## Upload Endpoints

### `POST /api/collections/media`

Upload a new file. Send as `multipart/form-data`.

```bash
curl -X POST https://mysite.com/api/collections/media \
  -H "x-api-key: your-api-key" \
  -F "file=@/path/to/image.jpg" \
  -F "alt=My image alt text"
```

Additional fields defined in your `fields` array (like `alt`, `caption`) can be included as form fields alongside `file`.

### `GET /api/collections/media`

List all uploaded files. Supports standard `where`, `limit`, `page`, `sort` query parameters.

### `GET /api/collections/media/:id`

Get a single media document by ID, including all generated image sizes.

### `PATCH /api/collections/media/:id`

Update metadata fields (e.g., `alt`, `caption`). Cannot replace the file itself — delete and re-upload to change the file.

### `DELETE /api/collections/media/:id`

Deletes the document and the file (and all generated sizes) from your storage adapter.

---

## Referencing Media in Other Collections

Use a `relationship` field pointing to your upload collection:

```ts
{
  name: 'featuredImage',
  type: 'relationship',
  relationTo: 'media',   // the slug of your upload collection
}
```

When fetched with `depth >= 1`, the relationship is populated with the full media document including `url` and `sizes`.

```json
{
  "title": "My Blog Post",
  "featuredImage": {
    "id": "abc123",
    "url": "https://cdn.example.com/media/hero.jpg",
    "alt": "Hero image",
    "sizes": {
      "thumbnail": { "url": "...", "width": 300, "height": 300 }
    }
  }
}
```

---

## Storage Adapters and URLs

The `url` field returned for each file is resolved by your storage adapter. There is no URL assembly in your application code — always use `doc.url`:

| Adapter | `url` format |
|---|---|
| `LocalStorage` | `/uploads/filename.jpg` (relative, based on `staticURL`) |
| `S3Storage` | `https://bucket.s3.region.amazonaws.com/filename.jpg` |
| `CloudinaryStorage` | `https://res.cloudinary.com/cloud-name/image/upload/filename.jpg` |

See [Storage Adapters](/docs/adapters/storage) for setup details.

---

## Admin UI Media Browser

Upload collections automatically render as a Media Browser in the Admin UI instead of the standard list table:

- **Grid view** of thumbnails (uses `adminThumbnail` size if configured, falls back to original)
- **Drag-and-drop** upload zone — drop files directly onto the page
- **File detail panel** — click any file to see its URL, dimensions, filesize, alt text, and copy the URL
- **Relationship picker integration** — when another collection has a `relationship` field pointing to an upload collection, the picker shows the thumbnail grid instead of a text combobox
