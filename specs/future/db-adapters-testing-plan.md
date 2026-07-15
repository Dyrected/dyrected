# Dyrected CMS - Database Adapters Robustness and Testing Plan

To guarantee that Dyrected CMS remains stable and database adapters (PostgreSQL, MySQL, SQLite, MongoDB) never experience silent regressions, we must establish a comprehensive, automated test suite specifically targeting database adapter behaviors.

This document outlines the testing strategy, testing architecture, and exact automated verification procedures for all Dyrected database adapters.

---

## 1. Goal & Objectives

- **Zero Client Regressions:** Detect and resolve connection, transaction, schema synchronization, and query nesting issues before code hits production.
- **Unified Adapter Compliance:** Ensure all supported database engines behave identically for complex queries, relationship resolution, bulk deletions, and raw transactions.
- **Automated Matrix Testing:** Standardize local and CI test execution against live, containerized instances of all database types.

---

## 2. Testing Scope

Every adapter must be validated against the following core functionalities:

1. **Database Auto-Creation / Ephemeral Handshake:**
   - Verify database creation on startup if the database specified in the connection string does not exist.
   - Verify proper error message formatting and diagnostics for unreachable hosts or bad credentials.
2. **Schema & Table Initialization:**
   - Synchronize complex schemas including row fields, block fields, image picker relationships, and join fields.
   - Verify indexes are created automatically and behave correctly on unique constraints.
3. **CRUD Operations:**
   - Create, read, update, delete operations across all field types.
   - Handling of null values, default values, and unique constraints.
4. **Advanced Querying & Parameter Binding:**
   - Deep nested SQL where queries, compound logical operators, and casing.
5. **Pagination & Limits:**
   - Validate sorting order (`sort: "-createdAt"`, etc.).
   - Verify pagination bounds (`limit`, `page`, `totalPages`, `hasNextPage`, `hasPrevPage`).
6. **Transaction Safety:**
   - Verify atomic rollbacks when parent-child document transactions fail.

---

## 3. Query, Filtering, and Depth Specifications to Verify

To pass compliance testing, database adapters must behave identically under the following technical specifications.

### 3.1 Field Operators & Filtering
Every adapter must support these operators across all field types:
* `equals` / `not_equals`
* `in` / `not_in` (expects array of values)
* `contains` / `not_contains` (substring search)
* `greater_than` / `less_than`
* `greater_than_equal` / `less_than_equal`

For object or JSON fields, filtering must support dot-notation matching:
```typescript
where: {
  'seo.metaTitle': { equals: 'Launch Day' }
}
```
* **PostgreSQL:** Compiled to JSONB path queries (e.g. `seo->>'metaTitle' = 'Launch Day'`).
* **MySQL:** Compiled to JSON path queries (e.g. `JSON_EXTRACT(seo, '$.metaTitle') = 'Launch Day'`).
* **MongoDB:** Native nested field matching (`{ 'seo.metaTitle': 'Launch Day' }`).

### 3.2 Logical Operators Casing (`AND` / `OR`)
Logical query grouping operators must be written in capital letters: `AND` and `OR` (not lowercase `and` / `or`).
* **SQL Adapters:** Compile `AND` arrays to `AND (...)` clauses and `OR` arrays to `OR (...)` clauses recursively, maintaining correct parenthetical grouping.
* **MongoDB Adapter:** Map `AND` to `$and` arrays and `OR` to `$or` arrays.

Example:
```typescript
where: {
  AND: [
    { status: { equals: 'published' } },
    {
      OR: [
        { category: { equals: 'news' } },
        { featured: { equals: true } }
      ]
    }
  ]
}
```

### 3.3 Relationship Depth Resolution
When a query contains a `depth` parameter, the database adapter must resolve relationship ID strings into their corresponding document objects:
* **`depth: 0`:** Return only the raw relationship key (string ID or array of string IDs).
* **`depth: 1`:** Resolve the immediate relationship ID to its document object. Sibling/nested relationships inside that resolved object remain string IDs.
* **`depth: N`:** Recursively resolve child relationships up to `N` levels deep.

#### Circular Reference Safety:
* Keep a registry of resolved document IDs during the query lifecycle.
* If a document ID has already been fully resolved in the current resolution path, do not query it again; return the document object or string ID to break the cycle.
* Enforce a hard ceiling cap for resolution depth (maximum limit of `depth: 5`).

#### Graceful Deletion Handling (Broken Relations):
* If a related document has been deleted from its collection, the parent field must resolve to `null` (or omit the missing item in relationship arrays) without failing the parent query.

---

## 4. Test Suite Architecture: Analysis & Design

When choosing between keeping tests **fully isolated within each database adapter package** versus running them in a **single shared compliance package**, we adopt a **Hybrid Parameterized Compliance Pattern**:

1. **Shared Core Compliance Suite (`@dyrected/db-test`):** A shared package defines a reusable test runner function (`runAdapterSuite`) that receives an adapter initializer.
2. **Local Package Invocation:** Each adapter package imports this runner and invokes it within its local environment (e.g. `packages/db-postgres/__tests__/postgres.spec.ts`).
3. **Local Adapter Extensions:** Individual adapter packages remain free to write native tests for engine-specific features (e.g., custom configuration parameters, specific connection error handlers) without cluttering the shared suite.

### Implementation Reference

#### 1. The Shared Compliance Suite

```typescript
// packages/db-test/src/suite.ts
import { DatabaseAdapter } from "@dyrected/core";

export function runAdapterSuite(name: string, createAdapter: () => Promise<DatabaseAdapter>) {
  describe(`Database Adapter Compliance: ${name}`, () => {
    let adapter: DatabaseAdapter;

    beforeAll(async () => {
      adapter = await createAdapter();
      await adapter.sync(testSchemas);
    });

    afterAll(async () => {
      await adapter.destroy();
    });

    it("should handle nested where clause parameters safely", async () => {
      // Create test docs
      await adapter.create("posts", { title: "Draft", status: "draft" });
      await adapter.create("posts", { title: "Published", status: "published" });

      // Run query with parameterized where clause
      const result = await adapter.find("posts", {
        where: { status: { equals: "published" } }
      });

      expect(result.docs).toHaveLength(1);
      expect(result.docs[0].title).toBe("Published");
    });

    // ... additional test specs covering pagination, bulk delete, unique constraints, and transaction safety
  });
}
```

#### 2. Local Invocation Example

```typescript
// packages/db-postgres/__tests__/postgres.spec.ts
import { runAdapterSuite } from "@dyrected/db-test";
import { PostgresAdapter } from "../src";

runAdapterSuite("PostgreSQL", async () => {
  return new PostgresAdapter({
    connectionString: "postgres://test_user:test_password@localhost:54322/dyrected_test"
  });
});

// local postgres-specific assertions
describe("PostgreSQL Adapter Specifics", () => {
  it("should parse custom schema extensions correctly", () => {
    // PG specific edge cases...
  });
});
```

---

## 5. Local Matrix Environments

To allow developers to run tests locally with zero setup friction, maintain a standard `docker-compose.test.yml` in the repository root:

```yaml
version: '3.8'
services:
  test-postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: dyrected_test
    ports:
      - "54322:5432"

  test-mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_USER: test_user
      MYSQL_PASSWORD: test_password
    ports:
      - "33062:3306"
      
  test-mongo:
    image: mongo:6
    ports:
      - "27017:27017"
```

---

## 6. Verification Commands

Developers and CI can execute tests across all adapters with:

```bash
# Start test databases
docker-compose -f docker-compose.test.yml up -d

# Run compliance suites
pnpm --filter @dyrected/db-test test

# Stop test databases
docker-compose -f docker-compose.test.yml down -v
```

---

## 7. Maintenance & Enforcement

- **Mandatory Changeset Integration:** Any modification to a database adapter package MUST include a changeset referencing this test plan and confirming that the full matrix compliance suite passes.
- **Fail-Fast CI Pipeline:** The test suite will execute automatically on every pull request, preventing merge if any database adapter fails basic compatibility tests.
