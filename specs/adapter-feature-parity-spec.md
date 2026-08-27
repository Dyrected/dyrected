# Database Adapter Feature Parity Specification

**Target Version:** Dyrected v2.9+  
**Status:** Completed  
**Author:** Antigravity / Dyrected Core Team  

---

## 1. Executive Summary

All primary database adapters (`@dyrected/db-postgres`, `@dyrected/db-sqlite`, `@dyrected/db-mysql`, and `@dyrected/db-mongodb`) now share complete functional parity for CRUD operations, single-pass filtering, and enhanced aggregation (`countDistinct`, `distinct` array extraction, and `groupBy` breakdowns).

---

## 2. Feature Comparison Matrix

| Capability | `@dyrected/db-postgres` | `@dyrected/db-sqlite` | `@dyrected/db-mysql` | `@dyrected/db-mongodb` |
| :--- | :---: | :---: | :---: | :---: |
| **Basic CRUD (`find`, `findOne`, `create`, `update`, `delete`)** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |
| **Promoted Column Support** | ✅ Full auto-sync & migration | ✅ Table creation sync | ⚠️ Partial (SHOW COLUMNS) | ℹ️ Native BSON |
| **JSON Extraction Operators** | ✅ `data->>'field'` / JSONB | ✅ `json_extract(data, '$.field')` | ✅ `JSON_UNQUOTE(JSON_EXTRACT(...))` | ℹ️ Native subdocuments |
| **Boolean & Type Safe WHERE** | ✅ Native boolean + text fallback | ✅ 1/0 integer conversion | ✅ Native boolean + string matching | ✅ Native BSON types |
| **Aggregate: `count`, `sum`, `avg`, `min`, `max`** | ✅ Single query (`FILTER`) | ✅ Single query (`FILTER`) | ✅ Single query (`IF(...)`) | ✅ `$facet` pipelines |
| **Aggregate: `countDistinct`** | ✅ `COUNT(DISTINCT col)` | ✅ `COUNT(DISTINCT col)` | ✅ `COUNT(DISTINCT IF(...))` | ✅ `$addToSet` + `$size` |
| **Aggregate: `distinct` (Array extraction)** | ✅ `JSON_AGG(DISTINCT col)` | ✅ `json_group_array(DISTINCT col)` | ✅ `JSON_ARRAYAGG(DISTINCT col)` | ✅ `$addToSet` |
| **Aggregate: `groupBy` breakdown** | ✅ `GROUP BY col` + `groups` map | ✅ `GROUP BY col` + `groups` map | ✅ `GROUP BY col` + `groups` map | ✅ `$group: { _id: "$col" }` |
| **Safe Regex Numeric Casting** | ✅ `CASE WHEN text ~ ...` | ✅ `GLOB` numeric guard | ✅ `IF(val REGEXP ...)` | ✅ `$convert` / `$isNumber` |
| **Atomic Transactions** | ✅ `sql.begin()` scoped adapter | ✅ `sqlite.transaction()` | ✅ `conn.beginTransaction()` | ✅ `ClientSession` |
| **Connection Pooling & Cache** | ✅ Shared client cache + ping | ℹ️ Embedded / File | ✅ Connection pool | ✅ MongoClient pool |

---

## 3. Implementation Details by Adapter

### A. `@dyrected/db-postgres`
- `countDistinct`: `COUNT(DISTINCT col) FILTER (WHERE ...)`
- `distinct`: `COALESCE(JSON_AGG(DISTINCT col) FILTER (WHERE ...), '[]'::json)`
- `groupBy`: `SELECT col AS __group_key, ... GROUP BY col` returning `{ groups: { [key]: { ...metrics } } }`

### B. `@dyrected/db-sqlite`
- `countDistinct`: `COUNT(DISTINCT col) FILTER (WHERE ...)`
- `distinct`: `COALESCE(json_group_array(DISTINCT col) FILTER (WHERE ...), '[]')`
- `groupBy`: `SELECT col AS __group_key, ... GROUP BY col` returning `{ groups: { [key]: { ...metrics } } }`
- Boolean parameter coercion: converts booleans to `1`/`0` integers against SQLite `json_extract`.

### C. `@dyrected/db-mysql`
- `countDistinct`: `COUNT(DISTINCT IF(where, col, NULL))` (or `COUNT(DISTINCT col)` without WHERE)
- `distinct`: `COALESCE(JSON_ARRAYAGG(DISTINCT IF(where, col, NULL)), JSON_ARRAY())`
- `groupBy`: `SELECT col AS __group_key, ... GROUP BY col` returning `{ groups: { [key]: { ...metrics } } }`

### D. `@dyrected/db-mongodb`
- `countDistinct`: `$addToSet: "$col"` within `$facet` or `$group`, post-processed with non-null size calculation.
- `distinct`: `$addToSet: "$col"` returning a unique array of values.
- `groupBy`: Root-level `$group: { _id: "$col", ...accumulators }` returning `{ groups: { [key]: { ...metrics } } }`.

---

## 4. Verification Checklist

- [x] **PostgreSQL**: `countDistinct`, `distinct`, `groupBy` implemented and verified.
- [x] **SQLite**: `countDistinct`, `distinct`, `groupBy` implemented and verified.
- [x] **MySQL**: `countDistinct`, `distinct`, `groupBy` implemented and compiled.
- [x] **MongoDB**: `countDistinct`, `distinct`, `groupBy` implemented and compiled.
- [x] **Core Contracts**: All adapter packages build cleanly with zero type errors.
