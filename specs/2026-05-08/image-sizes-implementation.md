# `imageSizes` — Implementation Spec

## Status

**Type declared ✅ — Not implemented ❌**

`imageSizes` is typed in `packages/core/src/types/index.ts` and fully documented in `docs/core/upload.md`.  
The upload controller (`packages/core/src/controllers/collection.controller.ts`) currently ignores the config entirely — it uploads one file and returns one URL.

This document describes exactly what needs to be built.

---

## What the Feature Does

When a collection has `upload: { imageSizes: [...] }`, every image upload should:

1. Upload the **original** file unchanged.
2. For each entry in `imageSizes`, use **sharp** to resize/crop the buffer.
3. Upload each resized variant to the storage adapter under a derived filename.
4. Return all variant URLs nested under a `sizes` key in the API response.

### Expected API Response

```json
{
  "id": "abc123",
  "filename": "hero.jpg",
  "url": "https://cdn.example.com/media/hero.jpg",
  "mimeType": "image/jpeg",
  "filesize": 982345,
  "width": 2400,
  "height": 1600,
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

## Files to Change

### 1. `packages/core/package.json` — Add `sharp`

```json
"dependencies": {
  "sharp": "^0.33.0"
}
```

`sharp` is a native Node.js addon. It must be a runtime dependency, not devDependency.

> [!NOTE]
> `sharp` has platform-specific binaries. It works on Node, Bun, and Deno (via node compat). It does **not** work in Cloudflare Workers or edge runtimes. If Dyrected ever targets edge, image processing must be offloaded to a queue (already available via BullMQ in `apps/cloud`).

---

### 2. `packages/core/src/types/index.ts` — Extend `UploadConfig`

The current type is missing `fit` and `withoutEnlargement`:

```ts
// CURRENT
export interface UploadConfig {
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  imageSizes?: {
    name: string;
    width: number;
    height: number;
    crop?: string;
  }[];
}

// UPDATED
export interface ImageSize {
  name: string;
  width?: number;
  height?: number;
  crop?: 'center' | 'top' | 'right' | 'bottom' | 'left';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  withoutEnlargement?: boolean;
}

export interface UploadConfig {
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  imageSizes?: ImageSize[];
  adminThumbnail?: string; // name of the imageSizes entry to use in the admin grid
}
```

Also extend `FileData` to include `sizes`:

```ts
export interface FileData {
  filename: string;
  filesize?: number;
  mimeType: string;
  url: string;
  width?: number;
  height?: number;
  sizes?: Record<string, {
    url: string;
    width: number;
    height: number;
    filesize: number;
  }>;
  type?: 'upload' | 'external';
  provider?: string;
  provider_metadata?: any;
  [key: string]: any;
}
```

---

### 3. `packages/core/src/services/image-resize.service.ts` — New File

Extract all sharp logic into a dedicated service to keep the controller clean.

```ts
import sharp from 'sharp';
import type { ImageSize } from '../types/index.js';
import type { StorageAdapter, FileData } from '../types/index.js';

export interface ResizeResult {
  name: string;
  url: string;
  width: number;
  height: number;
  filesize: number;
}

export class ImageResizeService {
  /**
   * Returns true if the file is an image that sharp can process.
   */
  static isResizable(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff'].includes(mimeType);
  }

  /**
   * Generates all imageSizes variants for a given image buffer.
   * Uploads each variant via the storage adapter and returns metadata.
   */
  static async generateSizes(args: {
    originalFilename: string;
    buffer: Buffer;
    mimeType: string;
    sizes: ImageSize[];
    storage: StorageAdapter;
    prefix?: string;
  }): Promise<Record<string, ResizeResult>> {
    const { originalFilename, buffer, mimeType, sizes, storage, prefix } = args;
    const results: Record<string, ResizeResult> = {};

    // Derive the base name without extension for naming variants
    const ext = originalFilename.split('.').pop() ?? 'jpg';
    const base = originalFilename.replace(/\.[^.]+$/, '');

    for (const size of sizes) {
      const variantFilename = `${base}-${size.name}.${ext}`;

      // Build sharp pipeline
      let pipeline = sharp(buffer);

      if (size.width || size.height) {
        pipeline = pipeline.resize({
          width: size.width,
          height: size.height,
          fit: size.fit ?? 'cover',
          position: size.crop ?? 'center',
          withoutEnlargement: size.withoutEnlargement ?? true,
        });
      }

      const resizedBuffer = await pipeline.toBuffer({ resolveWithObject: true });

      // Upload the variant
      const fileData = await storage.upload({
        filename: variantFilename,
        buffer: resizedBuffer.data,
        mimeType,
        prefix,
      });

      results[size.name] = {
        name: size.name,
        url: fileData.url,
        width: resizedBuffer.info.width,
        height: resizedBuffer.info.height,
        filesize: resizedBuffer.info.size,
      };
    }

    return results;
  }
}
```

---

### 4. `packages/core/src/controllers/collection.controller.ts` — Update `upload()`

The `upload()` method needs to:

1. Detect if the collection has `imageSizes` configured.
2. Call `ImageResizeService.generateSizes()` if the uploaded file is a resizable image.
3. Merge the resulting `sizes` map into the saved document.

```ts
// Add import at the top
import { ImageResizeService } from '../services/image-resize.service.js';

async upload(c: Context<DyrectedContext>) {
  const config = c.get('config');
  const storage = config.storage;
  if (!storage) return c.json({ message: 'Storage not configured' }, 500);

  const formData = await c.req.formData();
  const file = formData.get('file') as any;
  if (!file) return c.json({ message: 'No file uploaded' }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const siteId = c.get('siteId');
  const workspaceId = c.get('workspaceId');
  const prefix = workspaceId ? `${workspaceId}/${siteId}` : siteId;

  // 1. Upload the original file
  const fileData = await storage.upload({
    filename: file.name,
    buffer,
    mimeType: file.type,
    prefix,
  });

  // 2. Generate imageSizes variants (if configured and file is an image)
  const uploadConfig = typeof this.collection.upload === 'object' ? this.collection.upload : null;
  const imageSizes = uploadConfig?.imageSizes;

  let sizes: Record<string, any> | undefined;

  if (imageSizes?.length && ImageResizeService.isResizable(file.type)) {
    sizes = await ImageResizeService.generateSizes({
      originalFilename: file.name,
      buffer,
      mimeType: file.type,
      sizes: imageSizes,
      storage,
      prefix,
    });
  }

  // 3. Extract extra form fields (alt, caption, etc.)
  const otherData: any = {};
  formData.forEach((value, key) => {
    if (key !== 'file' && typeof value === 'string') {
      otherData[key] = value;
    }
  });

  // 4. Save to database, including sizes if generated
  const doc = await config.db!.create({
    collection: this.collection.slug,
    data: {
      ...otherData,
      ...fileData,
      ...(sizes ? { sizes } : {}),
    },
  });

  return c.json(doc, 201);
}
```

---

## Edge Cases to Handle

| Case | Behaviour |
|---|---|
| File is not an image (PDF, video, etc.) | Skip resize entirely — `sizes` will be `undefined` in the response |
| File is smaller than a requested size | Respect `withoutEnlargement: true` (default) — sharp will skip upscaling |
| `height` is omitted from an `imageSizes` entry | sharp handles this: width-only resize preserves aspect ratio with `fit: 'contain'` |
| Storage upload fails for one variant | Should **not** fail the whole request — catch per-variant errors, log, and omit that size from the response |
| `sharp` is not installed | Throw a clear startup error during boot if any collection uses `imageSizes` — fail fast, don't silently skip |

### Graceful variant failure (update to `generateSizes`)

```ts
for (const size of sizes) {
  try {
    // ... resize and upload ...
    results[size.name] = { ... };
  } catch (err) {
    console.error(`[dyrected] Failed to generate image size "${size.name}" for "${originalFilename}":`, err);
    // Omit this size from results — original upload is unaffected
  }
}
```

---

## Cloud / BullMQ Consideration

For large images or high-traffic deployments, generating all variants synchronously in the request will increase response times noticeably.

In `apps/cloud`, the `image-processing` BullMQ queue already exists for this purpose. The cloud upload flow should:

1. Upload the original synchronously → return `201` immediately.
2. Enqueue an `image-processing` job with `{ docId, collectionSlug, siteId, imageSizes }`.
3. The worker picks it up, fetches the original from storage, generates variants, and patches the document with the `sizes` map.

The document will have `sizes: null` (or omitted) until the job completes. The SDK / admin UI should handle this gracefully (e.g., show a "processing" placeholder).

This async path is **cloud-only**. Self-hosted installations process synchronously in the request — acceptable for most use cases.

---

## Checklist

- [ ] Add `sharp` to `packages/core/package.json`
- [ ] Update `UploadConfig` type to include `fit`, `withoutEnlargement`, `adminThumbnail`
- [ ] Update `ImageSize` as a named interface
- [ ] Update `FileData` to include optional `sizes` map
- [ ] Create `packages/core/src/services/image-resize.service.ts`
- [ ] Update `upload()` in `collection.controller.ts` to call `ImageResizeService`
- [ ] Add graceful per-variant error handling
- [ ] Add startup validation: warn if `imageSizes` is configured but `sharp` is not available
- [ ] Write unit tests for `ImageResizeService.generateSizes()` using a test image buffer
- [ ] Cloud: enqueue `image-processing` job instead of processing synchronously

---

*Tracked against: `docs/core/upload.md` § `imageSizes`*
