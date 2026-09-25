# Self-Hosted Schema Evolution & Migration Architecture Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Owner:** Core Architecture & Database Engine Team  
**Scope:** `@dyrected/core`, `@dyrected/cli`, `@dyrected/db-mysql`, `@dyrected/db-postgres`, `@dyrected/db-sqlite`  
**Target Environments:** Self-hosted deployments (Docker, ECS, Kubernetes, bare-metal), High-Compliance Fintech Workloads

---

## 1. Context & Problem Statement

In self-hosted production deployments, **runtime automatic schema syncing (`db.sync()` / `ensureTable()` at server boot) is explicitly disabled or prohibited**.

### 1.1 Why Auto-Sync Fails in Self-Hosted Environments
1. **Multi-Replica Boot Collisions & Advisory Contention:** Multiple instances running `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ADD COLUMN` concurrently can trigger DDL locking timeouts, metadata lock contention, and race conditions.
2. **Destructive Ambiguity (The "Leftover Index" Problem):** Auto-sync is strictly additive. When a field declaration drops `unique: true` or alters an index (e.g., transitioning `cob_daily_reports.date` from a single unique index to a composite unique index `(date, scope)`), auto-sync adds the composite index but leaves the legacy unique index in place. Subsequent inserts fail with unrecoverable duplicate key violations (`ER_DUP_ENTRY`).
3. **Missing Intermediary Data Backfills:** An index change often requires updating existing rows before the constraint can succeed (e.g., setting `scope = 'all'` on existing records before creating `UNIQUE INDEX (date, scope)`). Declarative auto-sync cannot perform multi-step, contextual data transformations.
4. **Principle of Least Privilege:** Self-hosted database connection pools in production frequently operate under restricted database users without `ALTER`, `DROP`, or `CREATE` privileges during normal application runtime.

### 1.2 The Solution
Dyrected adopts an **Offline Diff Generation + Deterministic Imperative Migration** model for self-hosted setups:
- **Zero DDL at boot:** The application runtime runs with `sync: false` and strictly issues DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- **CLI-driven Schema Diffing (`dyrected db:diff`):** Compares code configuration against either a database snapshot or migration history to generate transparent, auditable SQL/TypeScript migration files.
- **Audited Migration Pipeline (`dyrected migrate`):** Executed as an isolated release step in CI/CD before rolling out new containers.

---

## 2. Core Architecture

```text
 ┌──────────────────────────────────────────────────────────────┐
 │                     Developer Machine                        │
 │  1. Edit Collection Config (e.g. remove unique, add scope)   │
 │  2. Run: npx dyrected db:diff --name=add_scope_composite_idx │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                      Generated Migration                     │
 │  migrations/20260925120000_add_scope_composite_idx.ts        │
 │  • DDL: ADD COLUMN scope VARCHAR(32)                         │
 │  • Backfill: UPDATE cob_daily_reports SET scope = 'all'      │
 │  • DDL: DROP INDEX date, ADD UNIQUE INDEX (date, scope)      │
 └──────────────────────────────┬───────────────────────────────┘
                                │ Commit to Git & Pull Request
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                  CI/CD Pre-Release Step                      │
 │                  (Self-Hosted Production)                    │
 │                                                              │
 │  1. Run: npx dyrected migrate                                │
 │     - Acquires advisory lock (`dyrected_migrations_lock`)    │
 │     - Checks `dyrected_migrations` ledger                    │
 │     - Applies pending migrations with rollback safety        │
 │  2. Deploy application containers with `sync: false`         │
 └──────────────────────────────────────────────────────────────┘
```

---

## 3. Deterministic Index Naming & Ownership

A primary cause of orphaned indexes in existing codebases is inconsistent naming conventions (e.g., MySQL default `date` vs. custom `uq_cob_daily_reports_date_scope` vs. adapter `uniq_collection_cob_daily_reports_date`).

### 3.1 Standardized Dyrected Index Naming Pattern

All database adapters must implement a canonical naming algorithm:

```ts
/**
 * Deterministically names indexes across all adapters.
 * Format: dydx_<type>_<collection>_<fields_or_hash>
 */
export function resolveIndexName(
  type: 'uniq' | 'idx',
  collection: string,
  fields: string[],
  customName?: string
): string {
  if (customName) return customName;
  const colSlug = collection.replace(/^collection_/, '');
  const fieldList = fields.join('_');
  const base = `dydx_${type}_${colSlug}_${fieldList}`;
  if (base.length <= 64) return base;

  // MySQL has a 64-char limit on identifier names
  const hash = createHash('sha256').update(fieldList).digest('hex').slice(0, 8);
  return `dydx_${type}_${colSlug.slice(0, 40)}_${hash}`;
}
```

### 3.2 Legacy Alias Recognition

When diffing or dropping indexes, the migration engine recognizes legacy naming variations:
1. Field name alone: `${fieldName}` (standard MySQL default for inline unique fields)
2. Adapter-prefixed: `uniq_${tableName}_${fieldName}` and `idx_${tableName}_${fieldName}`
3. Custom prefixed: `uq_${tableName}_${fieldName}` and `uq_${colSlug}_${fieldName}`

---

## 4. The Diff Engine (`dyrected db:diff`)

For self-hosted workflows, developers do not hand-write raw DDL from scratch. Instead, the CLI diffs the current collection configurations against the target database (or local shadow database) to generate the baseline migration.

### 4.1 CLI Command

```bash
npx dyrected db:diff --name=scope_and_composite_index
```

### 4.2 Diffing Strategy

1. **Inspect Target/Snapshot Database:**
   - Reads `information_schema.columns` (column names, types, nullability, defaults).
   - Reads `information_schema.statistics` (existing indexes and uniqueness).
2. **Inspect Declarative Config:**
   - Evaluates all `defineCollection({ ... })` files in the project.
   - Identifies promoted columns, declared indexes, and field-level `unique: true`.
3. **Detect Discrepancies:**
   - **Missing Columns:** Config has field marked as promoted/indexed, DB lacks column -> Generate `addColumn`.
   - **Missing Indexes:** Config has index, DB lacks index -> Generate `addIndex`.
   - **Orphaned / Stale Indexes:** DB has index matching Dyrected naming convention, but Config removed it -> Generate `dropIndex`.
4. **Scaffold Migration File:**
   Outputs a type-safe TypeScript migration with clear placeholders for data backfilling.

---

## 5. Migration File Specification

Generated migrations follow a three-phase structure:
1. **Schema Pre-Requisites (DDL):** Add new columns, alter types.
2. **Data Backfills & Integrity Cleansing (DML):** Run batch updates, deduplication, or default value population.
3. **Constraint Application & Index Drops (DDL):** Drop legacy conflicting indexes, apply final unique/composite constraints.

### 5.1 Example Generated Migration

```ts
import { defineMigration } from '@dyrected/core';

export default defineMigration({
  name: '20260925120000_scope_and_composite_index',

  async up({ db, sql, adapter, logger }) {
    logger.info('Phase 1: Adding promoted column `scope`...');
    if (adapter === 'mysql') {
      await sql`ALTER TABLE \`collection_cob_daily_reports\` ADD COLUMN \`scope\` VARCHAR(32) DEFAULT 'all'`;
    }

    logger.info('Phase 2: Backfilling scope on existing records...');
    // Ensure all historical records satisfy new composite uniqueness
    await db.query(`
      UPDATE collection_cob_daily_reports 
      SET scope = 'all' 
      WHERE scope IS NULL OR scope = ''
    `);

    logger.info('Phase 3: Reconciling indexes...');
    if (adapter === 'mysql') {
      // Safely drop legacy unique constraints on single-column `date`
      const legacyIndexes = [
        'date',
        'uniq_collection_cob_daily_reports_date',
        'uq_cob_daily_reports_date'
      ];

      for (const idxName of legacyIndexes) {
        const [exists] = await db.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.statistics 
          WHERE table_schema = DATABASE() 
            AND table_name = 'collection_cob_daily_reports' 
            AND index_name = ?
        `, [idxName]);

        if (exists[0]?.count > 0) {
          logger.info(`Dropping legacy conflicting index: ${idxName}`);
          await db.query(`ALTER TABLE \`collection_cob_daily_reports\` DROP INDEX \`${idxName}\``);
        }
      }

      // Add new composite unique index
      await sql`
        ALTER TABLE \`collection_cob_daily_reports\` 
        ADD UNIQUE INDEX \`uq_cob_daily_reports_date_scope\` (\`date\`, \`scope\`)
      `;
    }
  },

  async down({ sql, adapter }) {
    if (adapter === 'mysql') {
      await sql`ALTER TABLE \`collection_cob_daily_reports\` DROP INDEX \`uq_cob_daily_reports_date_scope\``;
      await sql`ALTER TABLE \`collection_cob_daily_reports\` ADD UNIQUE INDEX \`date\` (\`date\`)`;
      await sql`ALTER TABLE \`collection_cob_daily_reports\` DROP COLUMN \`scope\``;
    }
  },
});
```

---

## 6. Self-Hosted Runtime Configuration

In self-hosted production deployments, the application configuration explicitly disables runtime schema alterations:

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core';

export default defineConfig({
  // Collections and DB adapter config
  db: {
    // In self-hosted production, disable boot-time schema sync
    sync: process.env.NODE_ENV !== 'production',
  },
  migrations: {
    directory: './dyrected/migrations',
    table: 'dyrected_migrations',
    // Never auto-run migrations on boot in production; run via release script
    autoRun: false,
    // Fail fast at boot if database schema does not match required migration version
    validateOnBoot: true,
  },
});
```

### 6.1 Boot Schema Validation (`validateOnBoot`)
When `sync: false` and `validateOnBoot: true`:
- The server checks if all local migration files have been recorded in `dyrected_migrations`.
- If unapplied migrations exist, the server refuses to boot and logs an explicit message:
  ```text
  [dyrected/boot] FATAL: Database is behind by 2 migrations.
  Unapplied migrations:
    - 20260925120000_scope_and_composite_index.ts
  Execute `npx dyrected migrate` before starting the application container.
  ```

---

## 7. Migration Execution & CI/CD Deployment Flow

Self-hosted deployments (Kubernetes, AWS ECS, Docker Compose) execute migrations as a separate release phase:

### 7.1 Deployment Pipeline Diagram

```text
 ┌─────────────────────────┐
 │ 1. Build & Push Image   │
 └───────────┬─────────────┘
             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. Pre-Rollout Migration Step (One-Off Runner Task)    │
 │    Command: `npx dyrected migrate`                     │
 │    - Uses elevated DB user (with DDL permissions)      │
 │    - Acquires advisory lock (`GET_LOCK`)               │
 │    - Applies pending migrations                        │
 │    - Releases advisory lock                            │
 └───────────┬────────────────────────────────────────────┘
             ▼ (Only proceeds if Exit Code == 0)
 ┌────────────────────────────────────────────────────────┐
 │ 3. Rolling Application Container Update                │
 │    Command: `node server/index.mjs`                    │
 │    - Uses restricted DB user (DML only: SELECT/INSERT) │
 │    - `sync: false` (Zero DDL issued at boot)           │
 │    - Fast, predictable, collision-free startup         │
 └────────────────────────────────────────────────────────┘
```

### 7.2 Docker / Docker-Compose Pattern

```yaml
# docker-compose.prod.yml
services:
  migration-runner:
    image: my-app:latest
    command: ["npx", "dyrected", "migrate"]
    environment:
      - DATABASE_URL=mysql://admin_user:secret@db:3306/app_db
    restart: "no"

  app:
    image: my-app:latest
    command: ["node", "dist/server.js"]
    depends_on:
      migration-runner:
        condition: service_completed_successfully
    environment:
      - DATABASE_URL=mysql://app_user:restricted@db:3306/app_db
```

---

## 8. Eliminating Ad-Hoc Scripts

Adopting this specification eliminates the need for manual, one-off scripts like:
- `server/utils/wallet/ensure-indexes.ts`
- `LEGACY_INDEX_DROPS` lists
- `rectify-invest-database.ts`

All index additions, constraint teardowns, and backfills are version-controlled, testable in staging environments, and executed with guaranteed atomicity before traffic reaches the containers.
