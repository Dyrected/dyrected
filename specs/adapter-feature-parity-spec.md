# Database Adapter Feature Parity Specification

**Target Version:** Dyrected v2.9+  
**Status:** In Progress  
**Author:** Antigravity / Dyrected Core Team  

---

## 1. Executive Summary

`@dyrected/db-postgres` is currently the gold-standard reference implementation of the `DatabaseAdapter` interface in Dyrected. It contains advanced features including single-pass SQL filtering, JSONB extraction, promoted column synchronisation, and enhanced aggregation (`countDistinct`, `distinct`, `groupBy`).

This document provides:
1. A **side-by-side feature comparison matrix** between PostgreSQL, SQLite, MySQL, and MongoDB.
2. A **gap analysis** of what the other adapters lack.
3. An **implementation roadmap** with concrete recipes to bring all database adapters up to complete parity.

---

## 2. Feature Comparison Matrix

| Capability | `@dyrected/db-postgres` | `@dyrected/db-sqlite` | `@dyrected/db-mysql` | `@dyrected/db-mongodb` |
| :--- | :---: | :---: | :---: | :---: |
| **Basic CRUD (`find`, `findOne`, `create`, `update`, `delete`)** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |
| **Promoted Column Support** | ✅ Full auto-sync & migration | ✅ Table creation sync | ⚠️ Partial (SHOW COLUMNS) | ℹ️ Native BSON |
| **JSON Extraction Operators** | ✅ `data->>'field'` / JSONB | ✅ `json_extract(data, '$.field')` | ✅ `JSON_UNQUOTE(JSON_EXTRACT(...))` | ℹ️ Native subdocuments |
| **Boolean & Type Safe WHERE** | ✅ Native boolean + text fallback | ✅ 1/0 integer conversion | ⚠️ String literal matching | ✅ Native BSON types |
| **Aggregate: `count`, `sum`, `avg`, `min`, `max`** | ✅ Single query (`FILTER`) | ✅ Single query (`FILTER`) | ✅ Single query (`IF(...)`) | ✅ `$facet` pipelines |
| **Aggregate: `countDistinct`** | ✅ `COUNT(DISTINCT col)` | ✅ `COUNT(DISTINCT col)` | ❌ Missing | ❌ Missing |
| **Aggregate: `distinct` (Array extraction)** | ✅ `JSON_AGG(DISTINCT col)` | ✅ `json_group_array(DISTINCT col)` | ❌ Missing | ❌ Missing |
| **Aggregate: `groupBy` breakdown** | ✅ `GROUP BY col` + `groups` map | ✅ `GROUP BY col` + `groups` map | ❌ Missing | ❌ Missing |
| **Safe Regex Numeric Casting** | ✅ `CASE WHEN text ~ ...` | ✅ `GLOB` numeric guard | ⚠️ Basic `REGEXP` check | ✅ `$convert` / `$isNumber` |
| **Atomic Transactions** | ✅ `sql.begin()` scoped adapter | ✅ `sqlite.transaction()` | ✅ `conn.beginTransaction()` | ✅ `ClientSession` |
| **Connection Pooling & Cache** | ✅ Shared client cache + ping | ℹ️ Embedded / File | ⚠️ Basic pool | ⚠️ Basic client pool |

---

## 3. Detailed Gap Analysis by Adapter

### A. `@dyrected/db-mysql`

#### 1. Aggregate Capabilities Missing
* **`countDistinct`**: MySQL does not yet handle `{ countDistinct: "field" }`.
  * *Solution:* `whereSql ? COUNT(DISTINCT IF(${whereSql}, ${fieldExpr}, NULL)) : COUNT(DISTINCT ${fieldExpr})`.
* **`distinct`**: MySQL does not yet handle `{ distinct: "field" }`.
  * *Solution:* `COALESCE(JSON_ARRAYAGG(DISTINCT ${fieldExpr}), JSON_ARRAY())`.
* **`groupBy`**: MySQL does not support `args.groupBy` in `aggregate()`.
  * *Solution:* Add `SELECT ${groupCol} AS __group_key, ... GROUP BY ${groupCol}` returning `{ groups: Record<string, any> }`.

#### 2. Schema Auto-Sync & Column Migration
* Postgres automatically adds missing columns and alters types via `ensureColumns()`.
* MySQL relies on basic `CREATE TABLE IF NOT EXISTS` and does not automatically alter tables when new promoted fields are added to collection configs.

---

### B. `@dyrected/db-mongodb`

#### 1. Aggregate Capabilities Missing
* **`countDistinct`**: MongoDB does not yet handle `{ countDistinct: "field" }`.
  * *Solution in Pipeline:*
    ```js
    {
      $group: {
        _id: null,
        uniqueValues: { $addToSet: `$${field}` }
      }
    },
    {
      $project: {
        result: { $size: { $filter: { input: "$uniqueValues", cond: { $ne: ["$$this", null] } } } }
      }
    }
    ```
* **`distinct`**: MongoDB does not yet handle `{ distinct: "field" }`.
  * *Solution in Pipeline:*
    ```js
    {
      $group: {
        _id: null,
        result: { $addToSet: `$${field}` }
      }
    }
    ```
* **`groupBy`**: MongoDB does not support `args.groupBy` in `aggregate()`.
  * *Solution:* When `args.groupBy` is present, replace `$facet` with a top-level `$group: { _id: `$${args.groupBy}`, ...accumulators }`.

---

### C. `@dyrected/db-sqlite`

#### Current Status
* **Parity Achieved:** `db-sqlite` has been updated with:
  * `countDistinct` (`COUNT(DISTINCT ...) FILTER (WHERE ...)`).
  * `distinct` (`json_group_array(DISTINCT ...)`).
  * `groupBy` (`GROUP BY` + `groups` map).
  * Boolean type conversions for SQLite's integer `1`/`0` representation.

---

## 4. Implementation Roadmap for Adapter Parity

### Phase 1: Bring MySQL Adapter to Full Parity
1. **File:** `packages/db-mysql/src/index.ts`
2. **Tasks:**
   - Add `countDistinct` support using `COUNT(DISTINCT IF(...))`.
   - Add `distinct` support using `JSON_ARRAYAGG(DISTINCT ...)`.
   - Add `groupBy` support in `MysqlAdapter.aggregate()`.
   - Add automated contract tests in `packages/adapter-contract-tests`.

### Phase 2: Bring MongoDB Adapter to Full Parity
1. **File:** `packages/db-mongodb/src/index.ts`
2. **Tasks:**
   - Update `$facet` accumulator builder in `MongoAdapter.aggregate()` to support `$addToSet` for `distinct` and `$size: "$addToSet"` for `countDistinct`.
   - Support `groupBy` by switching the pipeline root to `$group: { _id: `$${groupBy}` }`.
   - Add automated contract tests in `packages/adapter-contract-tests`.

### Phase 3: Contract Test Suite Hardening
1. Enable MongoDB and MySQL in `packages/adapter-contract-tests/adapters.test.ts` under environment flags (`TEST_MYSQL=1`, `TEST_MONGO=1`).
2. Verify all 4 adapters pass identical contract suites.

---

## 5. Verification Checklist

- [x] **PostgreSQL**: `countDistinct`, `distinct`, `groupBy` implemented and verified against contract tests.
- [x] **SQLite**: `countDistinct`, `distinct`, `groupBy` implemented and verified against contract tests.
- [ ] **MySQL**: Implement `countDistinct`, `distinct` (`JSON_ARRAYAGG`), and `groupBy`.
- [ ] **MongoDB**: Implement `countDistinct`, `distinct` (`$addToSet`), and `groupBy`.
- [ ] **Contract Tests**: All 4 database adapters pass 100% of the shared test suite.
