# Automatic Field Promotion, Smart Indexing & Uniqueness Specification

**Status:** Proposed  
**Owner:** Core / Database Engine Team  
**Scope:** `@dyrected/core`, `@dyrected/db-postgres`, `@dyrected/db-sqlite`, `@dyrected/db-mysql`, `@dyrected/db-mongodb`, and `@dyrected/admin`.

---

## 1. Executive Summary

Dyrected utilizes a hybrid storage model combining structured schema definitions with flexible document storage. To achieve maximum query throughput, seamless server-side filtering and grouping, and rigorous data integrity without requiring manual SQL/NoSQL schema migrations, Dyrected must intelligently and automatically promote frequently queried fields into first-class physical columns/indexes across **all supported database adapters**.

---

## 2. Promotion Trigger Conditions

Dyrected config normalization will automatically infer and mark `promoted: true` on any schema field that satisfies any of the following conditions:

1. **Unique & Indexed Fields:**
   - Declared with `unique: true` or `index: true`.
   - *Rationale:* Database-level uniqueness constraints and B-Tree indexes require first-class columns (or index keys).
2. **Operational View Reference Fields:**
   - Referenced in any operational view's `filter`, `sort`, `groupBy`, `dateField`, `startDateField`, or `endDateField`.
   - *Rationale:* Operational views are high-traffic administrative interfaces; dedicated columns eliminate JSON extraction and deserialization overhead in queries.
3. **Foreign Keys (Single-Value Relationships):**
   - Declared as `type: "relationship"` where `hasMany: false` (or default).
   - *Rationale:* Essential for high-performance join operations, population, and indexed relationship traversals.
4. **Auth Identifiers:**
   - Fields such as `email` or custom login credentials on auth-enabled collections.

---

## 3. Multi-Adapter Promotion & Lifecycle

When database adapters boot during `sync()` / `ensureTable()`, each adapter executes dialect-specific DDL, backfills, and indexing:

### 3.1. PostgreSQL Adapter (`@dyrected/db-postgres`)
- **DDL Column Creation:**
  - `text`, `email`, `select`, `radio` -> `TEXT`
  - `number` -> `NUMERIC`
  - `boolean` -> `BOOLEAN`
  - `date`, `datetime` -> `TIMESTAMPTZ`
  - `relationship` -> `TEXT`
  ```sql
  ALTER TABLE collection_<slug> ADD COLUMN IF NOT EXISTS "<field>" <TYPE>;
  ```
- **Automated Backfill:**
  ```sql
  UPDATE collection_<slug>
  SET "<field>" = (data->>'<field>')::<TYPE>
  WHERE "<field>" IS NULL AND data ? '<field>';
  ```
- **Indexes & Unique Constraints:**
  - Unique: `CREATE UNIQUE INDEX IF NOT EXISTS "<slug>_<field>_unique_idx" ON collection_<slug> ("<field>") WHERE "<field>" IS NOT NULL;`
  - Regular Index: `CREATE INDEX IF NOT EXISTS "<slug>_<field>_idx" ON collection_<slug> ("<field>");`

---

### 3.2. SQLite Adapter (`@dyrected/db-sqlite`)
- **DDL Column Creation:**
  - `text`, `email`, `select`, `radio`, `date`, `datetime`, `relationship` -> `TEXT`
  - `number` -> `NUMERIC` / `REAL`
  - `boolean` -> `INTEGER` (0 / 1)
  ```sql
  ALTER TABLE collection_<slug> ADD COLUMN "<field>" <TYPE>;
  ```
- **Automated Backfill:**
  ```sql
  UPDATE collection_<slug>
  SET "<field>" = json_extract(data, '$.<field>')
  WHERE "<field>" IS NULL AND json_extract(data, '$.<field>') IS NOT NULL;
  ```
- **Indexes & Unique Constraints:**
  - Unique: `CREATE UNIQUE INDEX IF NOT EXISTS "<slug>_<field>_unique_idx" ON collection_<slug> ("<field>");`
  - Regular Index: `CREATE INDEX IF NOT EXISTS "<slug>_<field>_idx" ON collection_<slug> ("<field>");`

---

### 3.3. MySQL Adapter (`@dyrected/db-mysql`)
- **DDL Column Creation:**
  - `text`, `email` -> `VARCHAR(255)` or `TEXT`
  - `select`, `radio` -> `VARCHAR(128)`
  - `number` -> `DECIMAL(15, 4)` or `DOUBLE`
  - `boolean` -> `TINYINT(1)`
  - `date`, `datetime` -> `DATETIME(3)`
  - `relationship` -> `VARCHAR(64)`
  ```sql
  ALTER TABLE collection_<slug> ADD COLUMN `<field>` <TYPE>;
  ```
- **Automated Backfill:**
  ```sql
  UPDATE collection_<slug>
  SET `<field>` = JSON_UNQUOTE(JSON_EXTRACT(data, '$.<field>'))
  WHERE `<field>` IS NULL AND JSON_EXTRACT(data, '$.<field>') IS NOT NULL;
  ```
- **Indexes & Unique Constraints:**
  - Unique: `CREATE UNIQUE INDEX `<slug>_<field>_unique_idx` ON collection_<slug> (`<field>`);`
  - Regular Index: `CREATE INDEX `<slug>_<field>_idx` ON collection_<slug> (`<field>`);`

---

### 3.4. MongoDB Adapter (`@dyrected/db-mongodb`)
- **Document Model:** Native document storage does not require dedicated DDL column generation; all fields live directly on root or embedded documents.
- **Automated Indexing:**
  - For `unique: true` fields:
    ```ts
    await collection.createIndex({ [field.name]: 1 }, { unique: true, sparse: true, name: `${field.name}_unique_idx` });
    ```
  - For indexed / view reference fields:
    ```ts
    await collection.createIndex({ [field.name]: 1 }, { name: `${field.name}_idx` });
    ```

---

## 4. Uniqueness Validation & Error Handling

### 4.1. Pre-Flight Engine Validation (`@dyrected/core`)
Before invoking the database adapter on `create` or `update`:
1. The engine scans collection fields for `unique: true`.
2. It executes a pre-flight existence check:
   ```ts
   const existing = await db.find({
     collection: this.collection.slug,
     where: {
       [field.name]: { equals: data[field.name] },
       ...(operation === "update" ? { id: { not_equals: docId } } : {}),
     },
     limit: 1,
   });
   ```
3. If an existing record matches, the API responds with a structured **409 Conflict**:
   ```json
   {
     "error": true,
     "statusCode": 409,
     "code": "DUPLICATE_FIELD_VALUE",
     "field": "leadEmail",
     "message": "A Guest Response with Email \"user@example.com\" already exists."
   }
   ```

### 4.2. Admin Form Feedback (`@dyrected/admin`)
- The admin edit drawer / form captures the `409 DUPLICATE_FIELD_VALUE` error.
- Highlights the specific field in red with a clean validation message: *"This value is already in use by another record."*
- Prevents raw, unformatted SQL constraint violation dumps.

---

## 5. Smart Document Duplication UX

### 5.1. The Duplication Challenge
When an administrator clicks **"Duplicate"** on a record containing `unique: true` fields (e.g. `slug`, `email`, `sku`, `title`):
- Copying values verbatim triggers unique constraint violations.
- Dropping all fields loses valuable context.

### 5.2. Resolution Strategy in `useSystemOps.duplicateMutation`
When duplicating a record:

1. **Title / Name Fields:**
   - Appends `" (Copy)"` or increments existing copies (`"Summer Gala (Copy 2)"`).
2. **Unique Slugs & Codes (`slug`, `sku`, `code`):**
   - Automatically appends a sequential suffix: `"summer-gala-copy"` or `"summer-gala-copy-2"`.
3. **Unique Personal Identifiers (`email`, `phone`, `username`):**
   - Resets the field to empty/null or appends `+copy@` for emails, prompting the admin to fill the new identifier.
4. **System Fields:**
   - Drops `id`, `createdAt`, `updatedAt`, `_workflow`.
5. **Admin Notification:**
   - Toast notification: *"Entry duplicated as \"Summer Gala (Copy)\""*.
