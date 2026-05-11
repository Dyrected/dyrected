---
title: Configuring Storage
description: Step-by-step setup for S3, Cloudflare R2, DigitalOcean Spaces, and Cloudinary.
---

This guide walks through setting up each storage provider from scratch — creating the bucket, configuring CORS, setting env vars, and wiring up the adapter.

---

## AWS S3

### 1. Create a bucket

1. Go to the [S3 console](https://s3.console.aws.amazon.com) → **Create bucket**
2. Choose a region close to your users
3. Uncheck **Block all public access** (uploads need to be publicly readable)
4. Leave everything else as default → **Create bucket**

### 2. Set a bucket policy for public reads

In your bucket → **Permissions** → **Bucket policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

### 3. Create an IAM user

1. IAM → **Users** → **Create user**
2. Attach the **AmazonS3FullAccess** policy (or a scoped policy for your bucket only)
3. Go to **Security credentials** → **Create access key** → select **Application running outside AWS**
4. Save the Access Key ID and Secret Access Key

### 4. Configure CORS

In your bucket → **Permissions** → **Cross-origin resource sharing (CORS)**:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 5. Add env vars and configure the adapter

```bash
S3_BUCKET=your-bucket-name
S3_REGION=eu-west-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
```

```ts
import { S3Storage } from '@dyrected/storage-s3'

export default defineConfig({
  storage: new S3Storage({
    bucket:    process.env.S3_BUCKET!,
    region:    process.env.S3_REGION!,
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  }),
})
```

---

## Cloudflare R2

R2 has no egress fees and is S3-compatible. Recommended for most new projects.

### 1. Create a bucket

1. Cloudflare dashboard → **R2** → **Create bucket**
2. Choose a location hint (optional)

### 2. Enable public access

In your bucket → **Settings** → **Public access** → **Allow access**. Copy the public bucket URL (e.g. `https://pub-xxxx.r2.dev`).

Or set up a custom domain: **Settings** → **Custom domains** → connect your domain.

### 3. Create an API token

R2 → **Manage R2 API tokens** → **Create API token**
- Permissions: **Object Read & Write**
- Scope: your bucket

Copy the Access Key ID, Secret Access Key, and your Account ID.

### 4. Add env vars and configure the adapter

```bash
CF_ACCOUNT_ID=abc123
R2_BUCKET=my-bucket
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_PUBLIC_URL=https://pub-xxxx.r2.dev   # or your custom domain
```

```ts
new S3Storage({
  bucket:   process.env.R2_BUCKET!,
  region:   'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  cdnUrl: process.env.R2_PUBLIC_URL,
})
```

---

## DigitalOcean Spaces

Spaces is S3-compatible and includes a built-in CDN.

### 1. Create a Space

1. DigitalOcean → **Spaces** → **Create a Space**
2. Choose a region, enable CDN if you want it
3. Set **File Listing** to **Restricted**

### 2. Create an access key

**API** → **Spaces access keys** → **Generate New Key**

### 3. Add env vars and configure the adapter

```bash
DO_SPACES_BUCKET=my-space
DO_SPACES_REGION=nyc3
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
# CDN endpoint (if enabled):
DO_SPACES_CDN=https://my-space.nyc3.cdn.digitaloceanspaces.com
```

```ts
new S3Storage({
  bucket:   process.env.DO_SPACES_BUCKET!,
  region:   process.env.DO_SPACES_REGION!,
  endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  credentials: {
    accessKeyId:     process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  cdnUrl: process.env.DO_SPACES_CDN,
})
```

---

## Cloudinary

Best for projects that need image transformations (crop, resize, format conversion) on the fly rather than pre-generating fixed sizes.

### 1. Create a Cloudinary account

Sign up at [cloudinary.com](https://cloudinary.com). Find your **Cloud name**, **API Key**, and **API Secret** on the dashboard.

### 2. Add env vars and configure the adapter

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

```ts
import { CloudinaryStorage } from '@dyrected/storage-cloudinary'

export default defineConfig({
  storage: new CloudinaryStorage({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey:    process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
    folder:    'my-project',
  }),
})
```

### 3. Using Cloudinary transformations

With Cloudinary, skip `imageSizes` in your upload config. Instead, apply transformations at the URL level in your frontend:

```ts
// Original URL from API:
// https://res.cloudinary.com/my-cloud/image/upload/v123/hero.jpg

// Apply a transformation:
const thumbnailUrl = doc.url.replace(
  '/upload/',
  '/upload/w_300,h_300,c_fill,f_auto,q_auto/'
)
```

---

## Testing your setup

After configuring, test with a direct upload:

```bash
curl -X POST https://yoursite.com/api/dyrected/collections/media \
  -H "x-api-key: your-api-key" \
  -F "file=@test-image.jpg" \
  -F "alt=Test upload"
```

A successful response includes a `url` field pointing to your storage provider. If the URL resolves in the browser, the setup is working correctly.
