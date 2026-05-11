---
title: Vercel Deployment
description: Deploying a Dyrected-powered Next.js app to Vercel.
---

Next.js apps using Dyrected deploy to Vercel with no special configuration. The Hono router runs inside a standard serverless function via the catch-all API route.

---

## Prerequisites

- A PostgreSQL database reachable from Vercel (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app))
- **Do not use SQLite** — the Vercel filesystem is ephemeral and not writable in serverless functions

---

## Environment variables

Set these in your Vercel project under **Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DYRECTED_JWT_SECRET` | ✅ | Secret used to sign JWTs. Must be the same across all deployments. |
| `DYRECTED_API_KEY` | ✅ | Server-side Site API Key. Never expose to the browser. |
| `NEXT_PUBLIC_DYRECTED_URL` | ✅ | Full URL to the Dyrected API, e.g. `https://mysite.com/api/dyrected` |
| `NEXT_PUBLIC_DYRECTED_API_KEY` | | Public API key for client-side reads. Safe to expose — access is controlled by your `access` functions. |
| `NEXT_PUBLIC_SITE_ID` | Cloud mode | Site ID sent as `x-site-id` on requests to Cloud. |
| `REVALIDATE_SECRET` | ISR | Secret for webhook-triggered ISR revalidation. |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | S3 storage | Required if using `@dyrected/storage-s3`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary | Required if using `@dyrected/storage-cloudinary`. |

---

## Connection pooling

Vercel serverless functions are short-lived and can spawn many instances simultaneously. To avoid exhausting your PostgreSQL connection limit, set `max: 1` in your adapter config and use a connection pooler like [PgBouncer](https://www.pgbouncer.org/) or Neon's built-in pooling:

```ts
// dyrected.config.ts
import { PostgresAdapter } from '@dyrected/db-postgres'

export default defineConfig({
  db: new PostgresAdapter({
    url: process.env.DATABASE_URL!,
    max: 1,  // one connection per function instance
  }),
})
```

---

## ISR cache revalidation

When content changes in the Admin UI, revalidate affected Next.js pages using an `afterChange` hook:

```ts
// dyrected.config.ts
import { revalidatePath } from 'next/cache'

{
  slug: 'posts',
  hooks: {
    afterChange: [
      async ({ doc }) => {
        if (doc.status === 'published') {
          revalidatePath('/blog')
          revalidatePath(`/blog/${doc.slug}`)
        }
      },
    ],
  },
}
```

Or trigger revalidation via a webhook endpoint (useful for Cloud mode where the backend is separate):

```ts
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  const { path } = await req.json()
  revalidatePath(path)
  return Response.json({ revalidated: true })
}
```

---

## Edge runtime

The Dyrected Hono router is compatible with the Vercel Edge Runtime for lower latency. Update your catch-all route:

```ts
// app/api/dyrected/[...route]/route.ts
import { createApp } from '@dyrected/core'
import config from '@/dyrected.config'

export const runtime = 'edge'

const app = createApp(config)

export const GET    = app.fetch
export const POST   = app.fetch
export const PATCH  = app.fetch
export const DELETE = app.fetch
```

> **Edge limitations:** The Edge Runtime does not support `better-sqlite3`. Use `@dyrected/db-postgres` with a Neon serverless driver, or keep the default Node.js runtime.

---

## Serverless function size

If you hit Vercel's 50 MB function size limit, exclude heavy optional dependencies from the bundle in `next.config.ts`:

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'better-sqlite3',
      'sharp',
    ],
  },
}

export default nextConfig
```
