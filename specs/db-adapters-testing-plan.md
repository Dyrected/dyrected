# Dyrected CMS - Database Adapters Robustness and Testing Plan

To guarantee that Dyrected CMS remains stable and database adapters (PostgreSQL, MySQL, SQLite) never experience silent regressions, we must establish a comprehensive, automated test suite specifically targeting database adapter behaviors.

This document outlines the testing strategy, testing architecture, and exact automated verification procedures for all Dyrected database adapters.

---

## 1. Goal & Objectives

- **Zero Client Regressions:** Detect and resolve connection, transaction, schema synchronization, and query nesting issues before code hits production.
- **Unified Adapter Compliance:** Ensure all three supported database engines behave identically for complex queries, relationship resolution, bulk deletions, and raw transactions.
- **Automated Matrix Testing:** Standardize local and CI test execution against live, containerized instances of all three database types.

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
   - Deep nested SQL where queries (e.g. `where: { status: { equals: 'published' } }`).
   - Compound logical operators (`OR`, `AND`, `NOT`).
   - Exact, prefix, suffix, and contains substring search matching.
5. **Pagination & Limits:**
   - Validate sorting order (`sort: "-createdAt"`, etc.).
   - Verify pagination bounds (`limit`, `page`, `totalPages`, `hasNextPage`, `hasPrevPage`).
6. **Transaction Safety:**
   - Verify atomic rollbacks when parent-child document transactions fail.

---

## 3. Test Suite Architecture

We will implement a unified integration test runner in the workspace root or inside a dedicated `packages/db-test` suite.

### Unified Test Interface
A single, runner-independent test suite parameterized by the adapter instance:

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

    // ... additional test specs
  });
}
```

---

## 4. Local Matrix Environments

To allow developers to run tests locally with zero setup friction:

- **SQLite:** In-memory or temporary local file.
- **Docker Compose:** Maintain a standard `docker-compose.test.yml` in the repository root to spin up MySQL and PostgreSQL instances instantly:

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
```

---

## 5. Verification Commands

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

## 6. Maintenance & Enforcement

- **Mandatory Changeset Integration:** Any modification to a database adapter package MUST include a changeset referencing this test plan and confirming that the full matrix compliance suite passes.
- **Fail-Fast CI Pipeline:** The test suite will execute automatically on every pull request, preventing merge if any database adapter fails basic compatibility tests.
