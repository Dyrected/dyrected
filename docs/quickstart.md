---
title: Quickstart
description: Get up and running with Dyrected in under 2 minutes.
---

There are two ways to get started with Dyrected: using our **AI-First Cloud Setup** (recommended) or manual installation.

## 🚀 AI Cloud Setup (Recommended)

Copy and paste the following prompt into your favorite AI assistant (ChatGPT, Claude, or Cursor) to instantly scaffold a fully-featured Dyrected project.

<Snippet name="ai-prompt">
  "I want to build a modern web application using Dyrected. Please help me initialize a new Next.js project, install @dyrected/core, and configure it to use Dyrected Cloud for database and media storage. Generate a dyrected.config.ts file with two collections: 'Posts' (with title, slug, content, and author) and 'Authors' (with name, bio, and avatar). Finally, set up the Hono router integration in my App Router."
</Snippet>

---

## 🛠 Manual Setup

If you prefer to set things up yourself, follow these steps:

### 1. Install Dependencies

Add the core package and your preferred database adapter to your project.

```bash
pnpm add @dyrected/core @dyrected/db-postgres
```

### 2. Configure Dyrected

Create a `dyrected.config.ts` file in your root directory.

```typescript
import { defineConfig } from '@dyrected/core';
import { PostgresAdapter } from '@dyrected/db-postgres';

export default defineConfig({
  db: new PostgresAdapter({
    url: process.env.DATABASE_URL,
  }),
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText' },
      ],
    },
  ],
});
```

### 3. Initialize the Router

In your Next.js project, create a catch-all route at `app/api/dyrected/[...route]/route.ts`.

```typescript
import { createApp } from '@dyrected/core';
import config from '@/dyrected.config';

const app = createApp(config);

export const GET = app.fetch;
export const POST = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
```

Now, navigate to `/api/docs` to see your interactive documentation!
