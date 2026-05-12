# Getting Started with Dyrected (Embedded)

This guide walks you through installing Dyrected directly inside your Next.js or Nuxt application. In embedded mode, your CMS and your website share the same codebase, deployment, and database.

---

## Prerequisites

Before you begin, ensure you have:

- A Next.js (App Router) or Nuxt 3 project.
- A supported database (PostgreSQL is recommended for production).
- A storage provider (S3, Backblaze B2, or Local Filesystem).

---

## 1. Next.js Installation

### Step A: Install Dependencies

```bash
pnpm add @dyrected/next @dyrected/db-postgres @dyrected/storage-local
```

### Step B: Create Configuration

Create `dyrected.config.ts` in your project root.

```ts
import { defineConfig } from "@dyrected/core";
import { PostgresAdapter } from "@dyrected/db-postgres";
import { LocalStorageAdapter } from "@dyrected/storage-local";

export default defineConfig({
  collections: [], // Add your collections here
  globals: [], // Add your globals here
  db: new PostgresAdapter({ url: process.env.DATABASE_URL }),
  storage: new LocalStorageAdapter({
    uploadDir: "./public/uploads",
    staticUrlPrefix: "/uploads",
  }),
});
```

### Step C: Mount the API

Create `app/dyrected/[...route]/route.ts` to handle CMS requests.

```ts
export { GET, POST, PUT, PATCH, DELETE } from "@dyrected/next";
```

### Step D: Mount the Admin UI

Create `app/admin/[[...path]]/page.tsx` to serve the editor.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { AdminUI } from "@dyrected/admin";

export default function AdminPage() {
  const router = useRouter();

  return (
    <AdminUI
      baseUrl={process.env.NEXT_PUBLIC_DYRECTED_BASE_URL}
      apiKey={process.env.NEXT_PUBLIC_DYRECTED_API_KEY}
      basename="/admin"
      onNavigate={(path) => router.push("/admin" + path)}
    />
  );
}
```

---

## 2. Nuxt Installation

### Step A: Install Dependencies

```bash
pnpm add @dyrected/nuxt @dyrected/db-postgres @dyrected/storage-local
```

### Step B: Create Configuration

Create `dyrected.config.ts` in your project root (same format as Next.js).

### Step C: Register the Module

Update your `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
  runtimeConfig: {
    public: {
      dyrectedApiKey: process.env.NUXT_PUBLIC_DYRECTED_API_KEY,
    },
  },
});
```

### Step D: Setup the Admin Page

Create `pages/admin/[...path].vue`.

```vue
<template>
  <AdminUI
    :base-url="config.public.dyrectedBaseUrl"
    :api-key="config.public.dyrectedApiKey"
    basename="/admin"
    @navigate="(path) => navigateTo('/admin' + path)"
  />
</template>

<script setup lang="ts">
import { AdminUI } from "@dyrected/admin";
const config = useRuntimeConfig();
</script>
```

---

## 3. Environment Variables

Create a `.env` file with your secrets.

```env
DATABASE_URL=postgres://user:pass@localhost:5432/dyrected
JWT_SECRET=your-32-character-secret
ENCRYPTION_KEY=your-aes-256-key

# For Next.js client-side
NEXT_PUBLIC_DYRECTED_API_KEY=local-dev

# For Nuxt client-side
NUXT_PUBLIC_DYRECTED_API_KEY=local-dev

# For Cloud Platform (Production)
DYRECTED_LICENSE_KEY=your-license-key
# LICENSE_SERVER_URL=https://license.dyrected.com
```

---

## 4. Generate Types

Once you've defined your collections, generate TypeScript types for full end-to-end safety.

```bash
pnpm dyrected generate:types
```

### Usage

```ts
// Next.js (Server Component)
import { dyrected } from "@/lib/dyrected";
const { docs: posts } = await dyrected.collection("posts").find();

// Nuxt (Composable)
const dyrected = useDyrected();
const { data: posts } = await useAsyncData("posts", () => dyrected.collection("posts").find());
```
