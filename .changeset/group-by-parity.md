---
"@dyrected/core": patch
"@dyrected/db-sqlite": patch
"@dyrected/db-postgres": patch
"@dyrected/db-mysql": patch
"@dyrected/db-mongodb": patch
---

Make `groupBy` aggregates return the same keys and values on every adapter. Group keys are normalized by field type (`"true"`/`"false"` for booleans, `"1"` for numbers, ISO strings for dates, `__unassigned__` for null), MySQL treats JSON null as SQL NULL and `avg` returns double precision, and Postgres and MySQL return promoted date columns as ISO strings. MySQL now accepts ISO timestamps written to promoted date and datetime columns, which previously failed.
