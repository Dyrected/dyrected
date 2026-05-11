---
title: Quickstart
description: Add Dyrected to an existing Next.js or Nuxt app in under 5 minutes.
---

## 1. Install

```bash
pnpm add @dyrected/core @dyrected/db-sqlite
```

Use `@dyrected/db-postgres` instead of `@dyrected/db-sqlite` for production. See [Database Adapters](/docs/adapters/databases).

---

## 2. Create your config

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core'
import { SqliteAdapter } from '@dyrected/db-sqlite'

export default defineConfig({
  db: new SqliteAdapter({ filename: './dyrected.db' }),
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title',   type: 'text',     required: true },
        { name: 'slug',    type: 'text',     required: true },
        { name: 'content', type: 'richtext' },
        { name: 'status',  type: 'select',   options: ['draft', 'published'], defaultValue: 'draft' },
      ],
    },
  ],
})
```

---

## 3. Mount the router

### Next.js

```ts
// app/api/dyrected/[...route]/route.ts
import { createApp } from '@dyrected/core'
import config from '@/dyrected.config'

const app = createApp(config)

export const GET    = app.fetch
export const POST   = app.fetch
export const PATCH  = app.fetch
export const DELETE = app.fetch
```

### Nuxt

```ts
// nuxt.config.ts
import config from './dyrected.config'

export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    ...config,
    apiBase: '/api/dyrected',
  },
})
```

---

## 4. Set environment variables

```bash
# .env.local
DYRECTED_JWT_SECRET=a-long-random-secret
DYRECTED_API_KEY=your-api-key
```

---

## 5. Run your app

```bash
pnpm dev
```

Your API is live at `/api/dyrected`. Fetch your posts:

```bash
curl http://localhost:3000/api/dyrected/collections/posts \
  -H "x-api-key: your-api-key"
```

---

## Next steps

- [Mount the Admin UI](/docs/admin/overview) — let editors manage content at `/admin`
- [Building a Blog](/docs/guides/building-a-blog) — full walkthrough with frontend pages
- [Adding Authentication](/docs/guides/adding-authentication) — add a users collection with login
- [Deploy to Vercel](/docs/deployment/vercel) — go to production

---

## Using AI to scaffold

If you want to generate a full config from a prompt, paste this into Claude, Cursor, or ChatGPT:

```
Set up Dyrected in my Next.js App Router project. Install @dyrected/core and
@dyrected/db-postgres. Create a dyrected.config.ts with two collections:
Posts (title, slug, richtext content, status select) and Authors (name, bio,
avatar upload). Mount the Hono router at app/api/dyrected/[...route]/route.ts.
```
