# Database Migrations & Schema Evolution Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Owner:** Core Architecture & Database Engine Team  
**Scope:** `@dyrected/core`, `@dyrected/cli`, `@dyrected/db-mysql`, `@dyrected/db-postgres`, `@dyrected/db-sqlite`, `@dyrected/db-mongodb`

---

## 1. Executive Summary & Context

Dyrected began as a zero-config, document-first application platform. Its foundational schema engine relies on **Additive Schema Reflection (`db.sync()` / `ensureTable()`)**, which automatically creates missing tables, promotes indexed fields into dedicated physical columns, and establishes composite indexes upon boot.

While additive reflection provides unrivaled velocity during initial prototyping, mission-critical production environments (specifically high-compliance fintech workloads such as `@alajo/invest`) require an **imperative, versioned, audited migration engine**.

### 1.1 Why Additive Reflection Alone is Insufficient

| Challenge | Additive Reflection (`db.sync()`) | Imperative Migration Engine (`dyrected migrate`) |
| :--- | :--- | :--- |
| **Field Additions** | ✅ Creates physical column seamlessly | ✅ Supported via schema definitions |
| **Field Renames** | ❌ Orphan old column, create new empty column | ✅ `RENAME COLUMN` or migrate JSON data |
| **Data Transformations** | ❌ Incapable of inferring business transformation | ✅ Custom JS/TS script running arbitrary data transforms |
| **Currency & Unit Normalization** | ❌ Cannot convert existing Naira amounts to Kobo | ✅ Batched calculation & atomic update |
| **Deduplication for Uniqueness** | ❌ Fails with `ER_DUP_ENTRY` if duplicates exist | ✅ Cleanses/merges duplicate records before adding index |
| **Production Deployments (CI/CD)** | ⚠️ Multi-replica boot race condition & locking | ✅ Dedicated release gate before container rollout |
| **Auditability & Rollback** | ❌ No ledger of when or what changed | ✅ `dyrected_migrations` table + `down()` rollbacks |

This specification defines Dyrected's official migration architecture, ensuring smooth schema evolution from local development through multi-region production clusters.

---

## 2. Core Architectural Philosophy: The Dual Engine Model

Dyrected adopts a **Dual Engine Model**:

```text
                                  Dyrected Application
                                           │
                 ┌─────────────────────────┴─────────────────────────┐
                 ▼                                                   ▼
       Additive Sync Engine                                Imperative Migration Engine
        (Development Velocity)                               (Production Integrity)
                 │                                                   │
  • Runs on local server boot                         • Runs via CI/CD release gate
  • Non-destructive DDL only                          • Versioned files in /migrations
  • Auto-promotes indexed columns                     • Data backfills, transforms, renames
  • Auto-widens VARCHAR lengths                       • Deterministic ledger & rollbacks
  • Zero developer friction                           • Advisory locks for single-worker run
```

1. **Development Mode**: `db.sync()` continues to reflect collection configs automatically so developers can add fields to `collections/*.ts` and immediately use them.
2. **Production Mode**: `config.migrations.autoRun` can be set to `false` in production. Deployments execute `npx dyrected migrate` in their CI/CD release step prior to spinning up application containers.

---

## 3. Migration File API (`@dyrected/core`)

### 3.1 File Structure & Naming Convention

Migration files reside in the project's configured migrations directory (default: `./migrations` or `./src/migrations`):

```text
migrations/
  ├── 20260918120000_create_initial_schema.ts
  ├── 20260918130000_promote_wallet_balance_kobo.ts
  └── 20260918140000_normalize_user_phone_e164.ts
```

Filenames follow the timestamp prefix convention: `YYYYMMDDHHMMSS_<slug>.ts` (or `.js`).

### 3.2 The `defineMigration` API

Migrations are defined using the type-safe helper `defineMigration`:

```ts
import { defineMigration } from '@dyrected/core';

export default defineMigration({
  name: '20260918130000_promote_wallet_balance_kobo',

  /**
   * Execute schema or data transformation.
   */
  async up({ db, sql, adapter, batchCursor }) {
    // 1. High-level transactional Dyrected CRUD
    const wallets = await db.find({
      collection: 'wallets',
      limit: 1000,
    });

    // 2. Or batch cursor for millions of rows without memory exhaustion
    await batchCursor({
      collection: 'wallets',
      batchSize: 500,
      async process(batch) {
        for (const wallet of batch) {
          const naira = Number(wallet.balance || 0);
          const kobo = Math.round(naira * 100);
          await db.update({
            collection: 'wallets',
            id: wallet.id,
            data: { balance_kobo: kobo },
          });
        }
      },
    });

    // 3. Or dialect-safe raw SQL execution when needed
    if (adapter === 'mysql') {
      await sql`ALTER TABLE collection_wallets ADD INDEX idx_wallet_kobo (balance_kobo)`;
    } else if (adapter === 'postgres') {
      await sql`CREATE INDEX IF NOT EXISTS idx_wallet_kobo ON collection_wallets (balance_kobo)`;
    }
  },

  /**
   * Revert changes applied in up().
   */
  async down({ db, sql, adapter }) {
    if (adapter === 'mysql' || adapter === 'postgres') {
      await sql`DROP INDEX idx_wallet_kobo ON collection_wallets`;
    }
  },
});
```

### 3.3 Context Object Reference (`MigrationContext`)

| Property | Type | Description |
| :--- | :--- | :--- |
| `db` | `DatabaseAdapter` | The active database adapter instance (bound to transaction if supported). |
| `sql` | `SqlTag` | Tagged template function for executing parameterized raw SQL queries. |
| `adapter` | `'mysql' \| 'postgres' \| 'sqlite' \| 'mongodb'` | Identifier of the active database dialect. |
| `batchCursor` | `BatchCursorFn` | Utility function to paginate over massive datasets without high memory usage. |
| `logger` | `Logger` | Structured migration logger for progress and diagnostic metrics. |

---

## 4. Internal Migration Ledger (`dyrected_migrations`)

All database adapters manage an internal ledger table to record executed migrations.

### 4.1 Table Schema

#### MySQL
```sql
CREATE TABLE IF NOT EXISTS `dyrected_migrations` (
  `id` VARCHAR(191) PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL UNIQUE,
  `batch` INT NOT NULL,
  `checksum` VARCHAR(64) NOT NULL,
  `execution_time_ms` INT NOT NULL,
  `executed_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### PostgreSQL
```sql
CREATE TABLE IF NOT EXISTS "dyrected_migrations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "batch" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "execution_time_ms" INTEGER NOT NULL,
  "executed_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### SQLite
```sql
CREATE TABLE IF NOT EXISTS "dyrected_migrations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "batch" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "execution_time_ms" INTEGER NOT NULL,
  "executed_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### MongoDB
Internal collection: `_dyrected_migrations` with unique index on `{ name: 1 }`.

---

## 5. Migration Execution & Advisory Locking

### 5.1 Multi-Replica Advisory Locking
In a multi-replica container deployment (e.g. Kubernetes, AWS ECS, Google Cloud Run), two instances might attempt to run migrations concurrently.

The migration runner acquires an **exclusive advisory lock** before evaluating pending migrations:

- **PostgreSQL**: `pg_advisory_lock(hashtext('dyrected_migrations_lock'))`
- **MySQL**: `GET_LOCK('dyrected_migrations_lock', 60)`
- **SQLite**: Automatic file-level lock.

If the lock cannot be acquired within 60 seconds, the runner aborts with a clear error rather than causing a database collision.

### 5.2 Transaction Isolation & DDL Nuances
- In **PostgreSQL** and **SQLite**, DDL operations are transactional. If a migration fails mid-way, the entire migration (DDL + DML) rolls back cleanly.
- In **MySQL**, DDL statements cause an **implicit commit**. Therefore, the migration runner handles MySQL migrations in a structured sequence:
  1. Data backfills and DML are wrapped in explicit transactions.
  2. Structural DDL statements are executed sequentially with explicit error boundaries.
  3. The ledger record is inserted immediately upon completion.

---

## 6. CLI Commands (`@dyrected/cli`)

The Dyrected CLI provides full lifecycle commands for migrations:

### 6.1 `npx dyrected migrate`
Executes all pending migrations in ascending chronological order.

```bash
$ npx dyrected migrate

[dyrected/migrate] Connecting to database (mysql)...
[dyrected/migrate] Acquired advisory lock.
[dyrected/migrate] Found 2 pending migrations:
  ▶ 20260918130000_promote_wallet_balance_kobo.ts ... DONE (142ms)
  ▶ 20260918140000_normalize_user_phone_e164.ts ... DONE (88ms)
[dyrected/migrate] Successfully applied 2 migrations (Batch 3).
[dyrected/migrate] Released advisory lock.
```

**Options:**
- `--step=N`: Apply only `N` pending migrations.
- `--dry-run`: Log pending migrations and planned queries without committing.
- `--to=<name>`: Migrate up to a specific migration target.

### 6.2 `npx dyrected migrate:create <name>`
Scaffolds a new migration file with a fresh timestamp:

```bash
$ npx dyrected migrate:create add_remittance_proof_column

Created: migrations/20260918143000_add_remittance_proof_column.ts
```

### 6.3 `npx dyrected migrate:status`
Prints an audit table comparing local migration files against the database ledger:

```bash
$ npx dyrected migrate:status

┌──────────────────────────────────────────────────┬─────────┬──────────────────────┬─────────┐
│ Migration                                        │ Status  │ Executed At          │ Batch   │
├──────────────────────────────────────────────────┼─────────┼──────────────────────┼─────────┤
│ 20260918120000_create_initial_schema.ts          │ APPLIED │ 2026-09-18 12:01 UTC │ 1       │
│ 20260918130000_promote_wallet_balance_kobo.ts    │ APPLIED │ 2026-09-18 13:05 UTC │ 2       │
│ 20260918140000_normalize_user_phone_e164.ts     │ PENDING │ -                    │ -       │
└──────────────────────────────────────────────────┴─────────┴──────────────────────┴─────────┘
```

### 6.4 `npx dyrected migrate:rollback`
Reverts the last applied migration batch by calling each migration's `down()` method in reverse chronological order:

```bash
$ npx dyrected migrate:rollback

[dyrected/migrate] Rolling back Batch 2 (1 migration)...
  ◀ 20260918130000_promote_wallet_balance_kobo.ts ... REVERTED (76ms)
[dyrected/migrate] Rollback complete.
```

**Options:**
- `--all`: Roll back all applied migrations.
- `--step=N`: Roll back `N` migrations.

---

## 7. Configuration Schema (`dyrected.config.ts`)

Project configuration specifies migration behavior:

```ts
import { defineConfig } from '@dyrected/core';

export default defineConfig({
  // ... collections & adapters
  migrations: {
    directory: './migrations',
    table: 'dyrected_migrations',
    // In development: autoRun runs pending migrations on boot
    // In production: false ensures migrations are only run via CI/CD release command
    autoRun: process.env.NODE_ENV !== 'production',
  },
});
```

---

## 8. Implementation Roadmap

### Phase 1: Core API & Adapter Interface (`@dyrected/core`)
- Define `MigrationDefinition`, `MigrationContext`, and `defineMigration()` helper.
- Extend `DatabaseAdapter` interface with optional `MigrationCapableAdapter` interface:
  - `ensureMigrationTable(): Promise<void>`
  - `getExecutedMigrations(): Promise<MigrationRecord[]>`
  - `recordMigration(record: MigrationRecord): Promise<void>`
  - `removeMigration(name: string): Promise<void>`
  - `withAdvisoryLock<T>(key: string, fn: () => Promise<T>): Promise<T>`

### Phase 2: Adapter Implementations
- Implement `MigrationCapableAdapter` in:
  - `@dyrected/db-mysql`
  - `@dyrected/db-postgres`
  - `@dyrected/db-sqlite`
  - `@dyrected/db-mongodb`

### Phase 3: Migration Runner & CLI Tooling (`@dyrected/cli`)
- Implement `MigrationRunner` service in `@dyrected/core`.
- Add CLI commands: `migrate`, `migrate:create`, `migrate:status`, `migrate:rollback`.
- Add verification of checksums to alert developers if a past migration was mutated after execution.

### Phase 4: Verification & Contract Tests
- Add comprehensive suite in `packages/adapter-contract-tests` validating:
  - Sequential execution of `up()` and `down()`.
  - Batch assignment and batch-wise rollback.
  - Multi-process advisory lock exclusion.
  - Checksum validation.
