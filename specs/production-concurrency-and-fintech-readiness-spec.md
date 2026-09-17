# Production Concurrency, Data Integrity & Fintech Readiness Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Owner:** Core Architecture & Database Engine Team  
**Scope:** `@dyrected/core`, `@dyrected/db-mysql`, `@dyrected/db-postgres`, `@dyrected/db-sqlite`, `@dyrected/db-mongodb`, `@dyrected/nuxt`, `@dyrected/admin`

---

## 1. Context & Motivation

During the implementation of mission-critical financial workflows (wallet-first architecture, ledger accounting, deposit reconciliation, and BVN verification in `@alajo/invest`), Dyrected was subjected to high-concurrency, auditable, and regulatory financial requirements.

This revealed architectural gaps where Dyrected operated as a **document-first CMS** rather than a **hardened, concurrent application platform**:

1. **Decorative Uniqueness**: `unique: true` on fields was metadata-only. Database adapters never created real `UNIQUE` constraints or indexes in MySQL/Postgres/SQLite.
2. **Missing Composite Keys**: No collection-level syntax or engine capability to define compound unique constraints (e.g. `(investor, currency)`) or compound indexes (e.g. `(investor, createdAt)`).
3. **Index-Hostile Types**: Promoted strings were created as unconstrained `TEXT`, preventing standard MySQL B-Tree indexing without manual prefix lengths.
4. **Read-Modify-Write Concurrency Races**: `db.update()` read the full document, merged it in JavaScript memory, and overwrote the entire JSON blob, making concurrent balance debits/credits vulnerable to lost updates.
5. **Lack of Query-Level Locking**: `find()` could not lock matching rows (`FOR UPDATE`). Only `findOne({ id })` inside an active transaction emitted a row lock.
6. **Workflow Logic Disconnect**: Workflow state transitions only mutated `workflowState` text, with no ability to execute transactional business logic (e.g. reserving funds on `approve` or ledgering debits on `paid`).
7. **No Native Background Processing**: Recurring jobs (drift detection, retry sagas, auto-resolution) required external schedulers with bundling and multi-instance collision issues.

This specification details the end-to-end architecture, API design, adapter DDL contracts, and implementation plan to resolve these gaps across all Dyrected packages.

---

## 2. Track 1: Schema Integrity, Indexes & Uniqueness (P0)

### 2.1 Field-Level Real Database Uniqueness

#### Specification

When a field is defined with `unique: true`, the database adapter must enforce uniqueness **at the physical database level**:

```ts
defineTextField({
  name: 'external_reference',
  required: true,
  unique: true, // MUST emit physical UNIQUE constraint / index in the database
  promoted: true,
})
```

#### DDL Contract by Adapter

##### 1. MySQL (`@dyrected/db-mysql`)

* Promoted string columns with `unique: true` must be typed as `VARCHAR(191)` (or `VARCHAR(255)` with `utf8mb4`) instead of `TEXT`.
* If a non-promoted field is marked `unique: true`, it is automatically promoted to a physical column during schema normalization.
* **DDL**:

  ```sql
  ALTER TABLE `collection_wallet_transactions`
  ADD CONSTRAINT `uq_wallet_transactions_external_reference`
  UNIQUE (`external_reference`);
  ```

##### 2. PostgreSQL (`@dyrected/db-postgres`)

* **DDL**:

  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_transactions_external_reference"
  ON "collection_wallet_transactions" ("external_reference")
  WHERE "external_reference" IS NOT NULL;
  ```

##### 3. SQLite (`@dyrected/db-sqlite`)

* **DDL**:

  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_transactions_external_reference"
  ON "collection_wallet_transactions" ("external_reference");
  ```

##### 4. MongoDB (`@dyrected/db-mongodb`)

* **Index**:

  ```ts
  await collection.createIndex(
    { external_reference: 1 },
    { unique: true, sparse: true, name: 'uq_external_reference' }
  );
  ```

#### Error Normalization

All database adapters must catch native duplicate key errors and throw a standard `DuplicateKeyError`:
* MySQL: `errno === 1062` (`ER_DUP_ENTRY`)
* PostgreSQL: `code === '23505'` (`unique_violation`)
* SQLite: `code === 'SQLITE_CONSTRAINT'` && message contains `UNIQUE`
* MongoDB: `code === 11000`

```ts
export class DuplicateKeyError extends Error {
  public readonly statusCode = 409;
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, options?: { field?: string; value?: any }) {
    super(message);
    this.name = 'DuplicateKeyError';
    this.field = options?.field;
    this.value = options?.value;
  }
}
```

---

### 2.2 Composite Unique Constraints & Collection-Level Indexes

#### API Design (`@dyrected/core`)

Introduce an `indexes` array on collection definitions supporting single-column, compound, unique, and partial indexes:

```ts
export interface IndexSpec {
  name?: string;
  fields: string[];
  unique?: boolean;
  sparse?: boolean;
  order?: Record<string, 'asc' | 'desc'>;
}

export const WalletAccounts = defineCollection({
  slug: 'wallet_accounts',
  indexes: [
    {
      name: 'uq_wallet_accounts_investor_currency',
      fields: ['investor', 'currency'],
      unique: true,
    },
    {
      name: 'idx_wallet_accounts_status_created',
      fields: ['status', 'createdAt'],
    },
  ],
  fields: [ ... ],
});
```

#### Adapter Sync Lifecycle

During `db.sync(collections)`:

1. Every field participating in an index is automatically flagged as `promoted: true`.
2. Tables and promoted columns are ensured first.
3. The adapter queries `information_schema.statistics` (MySQL), `pg_indexes` (Postgres), or `sqlite_master` (SQLite) to identify existing indexes.
4. Missing indexes are created idempotently.
5. Index naming convention:
   * Unique: `uq_<collection>_<field1>_<field2>`
   * Non-unique: `idx_<collection>_<field1>_<field2>`

---

### 2.3 Promoted Column Data Types

#### Type Mapping Refactor (`@dyrected/db-mysql`)

Promoted columns must no longer default to `TEXT`:

| Dyrected Field Type | Current MySQL Type | New MySQL Type | Rationale |
| :--- | :--- | :--- | :--- |
| `text` (single line) | `TEXT` | `VARCHAR(191)` | Permits standard B-Tree indexes without prefix lengths |
| `select` / `radio` | `TEXT` | `VARCHAR(100)` | Enumerable strings, easily indexed |
| `relationship` | `TEXT` | `VARCHAR(36)` | Matches UUID/ID format; permits foreign key lookups |
| `email` | `TEXT` | `VARCHAR(254)` | RFC 5321 compliant email length |
| `number` | `DECIMAL(19,4)` | `DECIMAL(19,4)` or `BIGINT` | Minor units and standard decimals |
| `textarea` / `richText` | `TEXT` | `LONGTEXT` / `TEXT` | Unindexed large bodies |
| `boolean` | `TINYINT(1)` | `TINYINT(1)` | Boolean flag |
| `date` / `datetime` | `DATETIME(3)` | `DATETIME(3)` | Precise timestamps |

---

## 3. Track 2: Concurrency & Atomic Mutations (P0)

### 3.1 Eliminating Read-Modify-Write in `db.update()`

#### Current Problem

```ts
// Current db-mysql update implementation (VULNERABLE)
const existing = await this.findOne({ collection: params.collection, id: params.id });
const merged = { ...(existing ?? {}), ...params.data };
await this.query(`UPDATE \`${tableName}\` SET data = ? WHERE id = ?`, [JSON.stringify(merged), params.id]);
```

Two concurrent requests reading at the same instant will each overwrite the other's changes.

#### New Atomic Update Architecture

1. **Promoted Columns**: Updated directly with parameterized SQL expressions (`SET balance_minor = balance_minor + ?`).
2. **JSON Document Sync**: For unpromoted fields, use native atomic JSON modification functions:
   * MySQL: `JSON_SET(data, '$.field', CAST(? AS JSON))`
   * PostgreSQL: `jsonb_set(data, '{field}', to_jsonb(?::text))`
   * SQLite: `json_set(data, '$.field', ?)`

---

### 3.2 Atomic Numeric Operators & Conditional Updates

#### API Design (`@dyrected/core`)

Support atomic increment/decrement operators and conditional `where` clauses on `db.update()`:

```ts
// Atomic increment/decrement
await db.update({
  collection: 'wallet_accounts',
  id: accountId,
  data: {
    balance_minor: { increment: 50000 },
  },
});

// Conditional update (guarantees balance cannot go negative)
const result = await db.update({
  collection: 'wallet_accounts',
  where: {
    id: { equals: accountId },
    balance_minor: { greater_than_equal: 50000 },
  },
  data: {
    balance_minor: { decrement: 50000 },
  },
});

if (result.affectedRows === 0) {
  throw new InsufficientFundsError('Insufficient available balance');
}
```

#### SQL Implementation

```sql
UPDATE `collection_wallet_accounts`
SET
  `balance_minor` = `balance_minor` - 50000,
  `data` = JSON_SET(`data`, '$.balance_minor', `balance_minor` - 50000),
  `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `id` = ? AND `balance_minor` >= 50000;
```

---

### 3.3 Query-Level Locking (`FOR UPDATE`)

#### API Design

Extend `find()` and `findOne()` to support query-level pessimistic locking when inside an active transaction:

```ts
await db.transaction(async (tx) => {
  // Acquires row lock directly during query matching
  const account = await tx.findOne({
    collection: 'wallet_accounts',
    where: {
      investor: { equals: investorId },
      currency: { equals: 'NGN' },
    },
    lock: 'for-update', // Appends 'FOR UPDATE' to the SELECT query
  });
  
  // ... perform atomic business logic ...
});
```

#### Adapter Requirements

- When `lock === 'for-update'` and `this.inTransaction === true`:
  * MySQL / Postgres: emit `SELECT ... FOR UPDATE`
  * SQLite: relies on `BEGIN IMMEDIATE` transaction mode

---

### 3.4 Cryptographically Secure Default ID Generation

#### Current Flaw

`Math.random().toString(36).substring(7)` produces ~5-6 characters, causing immediate primary key collisions under concurrent bulk operations.

#### Solution

Standardize on standard RFC 4122 UUIDv4 across all adapters:

```ts
import { randomUUID } from 'node:crypto';

const id = params.data.id ?? randomUUID();
```

---

## 4. Track 3: Lifecycle Hooks & Workflow Automation (P1)

### 4.1 Transactional Pre-Commit Hooks

#### Current Problem

`beforeChange` wraps `db` in `createReadonlyDb()` and throws on any write operation. `afterChange` executes after the transaction has already committed to the database. There is no hook that runs *inside* the active database transaction prior to commit.

#### Solution: `beforeCommit` Hook

Introduce a `beforeCommit` hook that receives a scoped, writable transaction:

```ts
defineCollection({
  slug: 'payments',
  hooks: {
    beforeCommit: [
      async ({ doc, operation, tx, user }) => {
        if (operation === 'create' && doc.status === 'PAID') {
          // Atomically write ledger row within the SAME transaction
          await tx.create({
            collection: 'wallet_transactions',
            data: {
              investor: doc.investor,
              amount_minor: doc.amount * 100,
              type: 'deposit',
              status: 'settled',
            },
          });
        }
      },
    ],
  },
});
```

If any error occurs in `beforeCommit`, the entire transaction (primary record + secondary writes) rolls back cleanly.

---

### 4.2 Workflow Transition Side-Effects & Handlers

#### API Design

Extend workflow transitions to support async execution handlers:

```ts
workflow: {
  initialState: 'under_review',
  states: [
    { name: 'under_review', label: 'Under Review' },
    { name: 'approved', label: 'Approved' },
    { name: 'rejected', label: 'Rejected' },
    { name: 'paid', label: 'Paid' },
  ],
  transitions: [
    {
      name: 'approve',
      from: 'under_review',
      to: 'approved',
      requiredCapabilities: ['refund.review'],
      // Runs inside the transition transaction
      async onTransition({ doc, input, tx, user }) {
        await reserveWalletFunds(tx, {
          investor: doc.investor,
          currency: doc.currency,
          amountMinor: Math.round(Number(doc.amount) * 100),
        });
      },
    },
    {
      name: 'reject',
      from: 'under_review',
      to: 'rejected',
      requireComment: true,
      async onTransition({ doc, input, tx, user }) {
        await releaseWalletReservation(tx, {
          investor: doc.investor,
          currency: doc.currency,
          amountMinor: Math.round(Number(doc.amount) * 100),
        });
      },
    },
  ],
}
```

---

### 4.3 Declarative Field Immutability

#### API Design

Add `immutable: true` to field options:

```ts
defineNumberField({
  name: 'amount_minor',
  required: true,
  immutable: true, // Writable on create; strictly rejected on update
})
```

#### Core Enforcement

In `@dyrected/core` collection controller:

```ts
if (operation === 'update' && field.immutable) {
  if (data[field.name] !== undefined && data[field.name] !== originalDoc[field.name]) {
    throw new ValidationError(`Field "${field.name}" is immutable and cannot be modified.`);
  }
}
```

---

## 5. Track 4: Financial Data Types & Exact Arithmetic (P1)

### 5.1 First-Class `money` Field

#### Problem

JavaScript stores numbers as IEEE 754 floating-point doubles. Floating point representation (`52.5 * 1000 = 52500.00000000001`) creates rounding drift in financial ledgers.

#### API Design

```ts
defineMoneyField({
  name: 'balance',
  label: 'Wallet Balance',
  currencyField: 'currency', // Links to currency select field
  storage: 'minor_units',    // Stored as integer kobo/cents in DB
  promoted: true,
  admin: {
    displayMinorAsMajor: true, // In admin UI, shows ₦52,500.00 while storing 5250000
  },
})
```

#### Database Storage

- In SQL: mapped to `BIGINT` or `DECIMAL(19,0)` to ensure zero float distortion.
* Serialized to API as integer minor units with metadata or formatted strings.

---

## 6. Track 5: Background Processing & Framework Ergonomics (P2)

### 6.1 Native Dyrected Task Runner & Scheduler (`@dyrected/tasks`)

#### API Design

```ts
import { defineTask, defineDyrectedConfig } from '@dyrected/core';

export const ledgerDriftAlertTask = defineTask({
  name: 'wallet:ledger-drift',
  cron: '*/15 * * * *',
  // Built-in distributed advisory lock prevents multi-instance execution
  lockTimeout: 300,
  async run({ db, logger }) {
    const drifts = await checkLedgerDrift(db);
    if (drifts.length > 0) {
      logger.error('Ledger drift detected', drifts);
    }
  },
});
```

---

### 6.2 Nuxt 4 Virtual Module Aliases (`@dyrected/nuxt`)

#### Problem

In Nuxt 4, `~` resolves to `<srcDir>` (`app/`). Imports like `~/server/dyrected/access.ts` resolve to non-existent `app//server/...`.

#### Solution

Register standard virtual aliases in `@dyrected/nuxt`:

```ts
// In nuxt.config.ts / @dyrected/nuxt
nuxt.options.alias['#dyrected'] = resolve(rootDir, 'dyrected');
nuxt.options.alias['#dyrected/server'] = resolve(rootDir, 'server/dyrected');
```

Code can now cleanly import:

```ts
import { isFinance } from '#dyrected/access';
import { getDyrectedDb } from '#dyrected/server';
```

---

## 7. Implementation Roadmap & Execution Phases

| Phase | Milestone | Scope | Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Physical Constraints & Uniqueness** | `@dyrected/core`<br>`@dyrected/db-*` | • `unique: true` emits real DB constraints<br>• `indexes: [...]` composite support<br>• `VARCHAR(191)` string promotion<br>• `DuplicateKeyError` normalization |
| **Phase 2** | **Concurrency & Atomic Operations** | `@dyrected/core`<br>`@dyrected/db-*` | • Atomic `increment`/`decrement`<br>• Conditional `where` updates<br>• Query locking (`lock: 'for-update'`)<br>• `randomUUID()` ID generation |
| **Phase 3** | **Workflow Automation & Immutability** | `@dyrected/core`<br>`@dyrected/admin` | • `onTransition` workflow handlers<br>• `beforeCommit` transactional hooks<br>• `immutable: true` field flag |
| **Phase 4** | **Financial Types & Precision** | `@dyrected/core`<br>`@dyrected/admin` | • `defineMoneyField()` with minor-unit storage<br>• Currency formatting in admin data grid |
| **Phase 5** | **Developer Experience & Schedulers** | `@dyrected/nuxt`<br>`@dyrected/core` | • `#dyrected` virtual imports<br>• `@dyrected/tasks` runner with advisory locks<br>• Non-blocking dev server boot |

---

## 8. Verification & Acceptance Criteria

1. **Uniqueness Under Concurrency**: A test spawning 50 concurrent inserts with the same `external_reference` must result in exactly 1 successful commit and 49 `DuplicateKeyError` responses, with zero duplicate rows in the physical table.
2. **Balance Integrity Under Concurrency**: 20 concurrent debit requests of ₦1,000 against an account with ₦5,000 must result in exactly 5 successful debits and 15 `InsufficientFundsError` rejections. Balance must equal exactly ₦0 (no negative balance or lost updates).
3. **Workflow Atomicity**: If a workflow transition hook throws, the document's `workflowState` must roll back to its original state, and any changes made in the transition must be uncommitted.
4. **Zero Float Drift**: 10,000 transactions with fractional kobo values stored via money fields must reconcile to the exact minor unit sum without IEEE 754 precision errors.
