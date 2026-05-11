---
title: Railway Deployment
description: Deploy a self-hosted Dyrected app to Railway with a managed Postgres database.
---

Railway is a good fit for self-hosted Dyrected deployments — it provides a managed Postgres database, automatic deploys from GitHub, and persistent volumes if you need local file storage.

---

## Prerequisites

- A Railway account at [railway.app](https://railway.app)
- Your Dyrected app in a GitHub repo (Next.js or Nuxt)
- Postgres adapter configured: `@dyrected/db-postgres`

---

## 1. Create a new Railway project

1. Go to the Railway dashboard → **New Project**
2. Select **Deploy from GitHub repo** and connect your repo
3. Railway detects the framework and sets up the build automatically

---

## 2. Add a Postgres database

1. Inside your project, click **New** → **Database** → **Add PostgreSQL**
2. Railway provisions a Postgres instance and injects `DATABASE_URL` into your app's environment automatically

---

## 3. Set environment variables

Go to your service → **Variables** and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-set by Railway when you add Postgres |
| `DYRECTED_JWT_SECRET` | A long random string (32+ chars) |
| `DYRECTED_API_KEY` | Your server-side API key |
| `NEXT_PUBLIC_DYRECTED_URL` | `https://your-app.up.railway.app/api/dyrected` |

For file uploads, also add your S3 or Cloudinary credentials — Railway's filesystem is ephemeral, so `LocalStorage` won't persist between deploys.

---

## 4. Configure your app for production

Make sure your Next.js config handles the `DATABASE_URL` Railway provides:

```ts
// dyrected.config.ts
import { PostgresAdapter } from '@dyrected/db-postgres'

export default defineConfig({
  db: new PostgresAdapter({
    url: process.env.DATABASE_URL!,
  }),
  // ...
})
```

---

## 5. Deploy

Railway automatically deploys on every push to your connected branch. To trigger a manual deploy: **Deployments** → **Deploy Now**.

Watch the build logs — the first deploy runs database migrations automatically when `createApp(config)` initialises.

---

## 6. Custom domain

1. Go to your service → **Settings** → **Domains**
2. Click **Add Domain** and enter your domain
3. Add the CNAME record Railway provides to your DNS
4. Update `NEXT_PUBLIC_DYRECTED_URL` to use your custom domain

---

## Persistent file uploads

If you need local file storage (not recommended for production), add a Railway volume:

1. Service → **Volumes** → **Add Volume**
2. Mount path: `/app/public/uploads`
3. Set `LocalStorage` path to `./public/uploads` in your config

For anything beyond a single instance, use S3 or Cloudinary — see [Storage Adapters](/docs/adapters/storage).

---

## Health check

Add a health endpoint Railway can ping to verify the app is running:

```ts
// app/api/health/route.ts
export async function GET() {
  return Response.json({ ok: true })
}
```

Then in Railway: **Service Settings** → **Health Check Path** → `/api/health`.
