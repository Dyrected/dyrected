# @dyrected/core

The heart of the Dyrected ecosystem. `@dyrected/core` is a lightweight, Hono-based headless CMS engine designed for high performance and developer flexibility.

## Features

- **Code-First Schema**: Define your content structure in TypeScript.
- **Framework Agnostic**: Pluggable adapters for database, storage, and auth.
- **REST & OpenAPI**: Automatically generates a fully-typed API and Swagger documentation.
- **Embedded or Standalone**: Use it directly inside your Next.js/Nuxt app or as a separate service.

## Installation

```bash
pnpm add @dyrected/core
```

## Basic Usage

```ts
import { defineConfig } from '@dyrected/core';

export default defineConfig({
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText' }
      ]
    }
  ],
  // Add database and storage adapters
});
```

For full documentation, visit [docs.dyrected.com](https://docs.dyrected.com).
