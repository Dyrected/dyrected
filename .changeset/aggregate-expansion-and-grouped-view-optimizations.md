---
"@dyrected/core": minor
"@dyrected/admin": minor
"@dyrected/db-postgres": minor
"@dyrected/db-sqlite": minor
"@dyrected/db-mysql": minor
"@dyrected/db-mongodb": minor
---

- **Aggregate Engine Expansion (`countDistinct`, `distinct`, `groupBy`)**:
  - Added support for `countDistinct` (`{ countDistinct: "fieldName" }`) to count unique non-null values in a single database query.
  - Added support for `distinct` (`{ distinct: "fieldName" }`) to extract unique non-null values without loading full documents.
  - Added grouped aggregation support via `groupBy` parameter (`?groupBy=<field>` or `{ groupBy: "field", aggregates: { ... } }`) returning per-group metric breakdowns with automatic `"__unassigned__"` sentinel handling for missing/null values.
  - Implemented cross-adapter parity for all aggregation operations across PostgreSQL, SQLite, MySQL, and MongoDB.
  - Updated live OpenAPI specification (`/api/openapi.json`) and Swagger documentation with complete aggregate schemas and response types.

- **Grouped Views & Admin UI Performance Optimization**:
  - Replaced client-side document group extraction with native single-query database aggregations in grouped Table, Kanban, and Spreadsheet views, eliminating $N+1$ query waterfalls and reducing database roundtrips.
  - Deduplicated schema queries across `AdminShell`, `OperationalViewRoute`, and dashboard pages by utilizing cached context schemas.
  - Added `defaultView` collection configuration support with automated route redirection and clean sidebar submenu rendering.
