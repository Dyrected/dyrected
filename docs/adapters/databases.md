---
title: Database Adapters
description: Connect Dyrected to your preferred database.
---

Dyrected is database-agnostic. You can choose the adapter that best fits your infrastructure.

## Supported Databases

### 1. PostgreSQL (Recommended)
The `@dyrected/db-postgres` adapter is the recommended choice for production environments. It uses standard SQL and supports advanced features like full-text search.

```typescript
import { PostgresAdapter } from '@dyrected/db-postgres';

export default defineConfig({
  db: new PostgresAdapter({
    url: process.env.DATABASE_URL,
  }),
});
```

### 2. SQLite
Great for local development or small, edge-deployed applications.

```typescript
import { SqliteAdapter } from '@dyrected/db-sqlite';

export default defineConfig({
  db: new SqliteAdapter({
    filename: 'dyrected.db',
  }),
});
```

### 3. MongoDB
If you prefer a document-based database, use the `@dyrected/db-mongodb` adapter.

```typescript
import { MongoAdapter } from '@dyrected/db-mongodb';

export default defineConfig({
  db: new MongoAdapter({
    url: process.env.MONGODB_URI,
  }),
});
```

## Writing Your Own Adapter

You can implement the `DatabaseAdapter` interface to support any database.

```typescript
import { DatabaseAdapter } from '@dyrected/core';

class MyCustomAdapter implements DatabaseAdapter {
  // Implement find, findOne, create, update, delete, etc.
}
```
