---
title: Storage Providers
description: Handle file and image uploads with ease.
---

Dyrected supports various storage backends for your media files.

## Local File System
The simplest way to handle uploads is storing them locally on your server.

```typescript
import { LocalStorage } from '@dyrected/storage-local';

export default defineConfig({
  storage: new LocalStorage({
    path: './public/uploads',
    baseUrl: '/uploads'
  }),
});
```

## Cloud Storage (S3 Compatible)
Use any S3-compatible service like AWS S3, DigitalOcean Spaces, or Backblaze B2.

```typescript
import { S3Storage } from '@dyrected/storage-s3';

export default defineConfig({
  storage: new S3Storage({
    bucket: 'my-bucket',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY
    }
  }),
});
```

## Cloudinary
For advanced image optimization and transformations, use the Cloudinary provider.

```typescript
import { CloudinaryStorage } from '@dyrected/storage-cloudinary';

export default defineConfig({
  storage: new CloudinaryStorage({
    cloudName: process.env.CLOUDINARY_NAME,
    apiKey: process.env.CLOUDINARY_KEY,
    apiSecret: process.env.CLOUDINARY_SECRET
  }),
});
```
