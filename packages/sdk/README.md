# @dyrected/sdk

The universal JavaScript client for Dyrected. It provides a simple, type-safe way to fetch and manage content from any Dyrected instance (Core or Cloud).

## Features

- **Universal Compatibility**: Works in browser, Node.js, and edge runtimes.
- **Type-Safe**: Full TypeScript support with generated types.
- **Fluent API**: Intuitive chainable methods for filtering and sorting.
- **Lightweight**: Zero dependencies (uses native `fetch`).

## Installation

```bash
pnpm add @dyrected/sdk
```

## Usage

```ts
import { Dyrected } from '@dyrected/sdk';

const dyrected = new Dyrected({
  baseUrl: 'https://api.dyrected.cloud',
  apiKey: 'your-api-key'
});

const { docs: posts } = await dyrected.collection('posts').find({
  where: {
    status: 'published'
  },
  sort: '-createdAt'
});
```
