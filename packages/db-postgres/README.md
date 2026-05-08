# @dyrected/db-postgres

The official PostgreSQL adapter for Dyrected. It provides a robust, high-performance database layer with built-in support for multi-tenancy via Postgres schemas.

## Features

- **Multi-Schema Isolation**: Automatically handles workspace-level data isolation using Postgres schemas.
- **Full PgBouncer Compatibility**: Uses schema-qualified table names for reliable connection pooling.
- **Dynamic Table Provisioning**: Automatically creates and modifies tables based on your collection definitions.
- **Type-Safe Queries**: Fully integrated with the Dyrected query engine.

## Installation

```bash
pnpm add @dyrected/db-postgres
```

## Usage

```ts
import { postgresAdapter } from '@dyrected/db-postgres';

export default defineConfig({
  db: postgresAdapter({
    url: process.env.DATABASE_URL,
    // Optional schema configuration
    schemaName: 'public' 
  }),
});
```
