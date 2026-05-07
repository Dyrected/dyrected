---
title: Next.js Integration
description: How to use Dyrected inside your Next.js application.
---

Dyrected is built to work seamlessly with the Next.js App Router.

## API Route Setup

The most common way to integrate Dyrected is by creating a single catch-all API route that handles all Dyrected requests (Admin UI, REST API, etc.).

Create the file at `app/api/dyrected/[...route]/route.ts`:

```typescript
import { createApp } from '@dyrected/core';
import config from '@/dyrected.config';

const app = createApp(config);

export const GET = app.fetch;
export const POST = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
```

## Data Fetching

Since Dyrected runs inside your app, you can fetch data directly in your Server Components using the `baseDb` adapter.

```tsx
import config from '@/dyrected.config';

export default async function BlogPage() {
  const { docs: posts } = await config.db.find({
    collection: 'posts',
    limit: 10
  });

  return (
    <div>
      {posts.map(post => (
        <h1 key={post.id}>{post.title}</h1>
      ))}
    </div>
  );
}
```

## Middleware & Auth

If you want to protect your Dyrected endpoints, you can wrap the catch-all route with your own authentication logic or use Dyrected's built-in `auth` field on collections.
