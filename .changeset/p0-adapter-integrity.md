---
"@dyrected/core": minor
"@dyrected/db-mongodb": minor
"@dyrected/db-mysql": patch
"@dyrected/db-postgres": patch
"@dyrected/db-sqlite": patch
---

Close the remaining P0 integrity gaps. `findOne` now accepts a `where` filter (with `lock: "for-update"`) in addition to an `id`. The MongoDB adapter now generates string IDs like the SQL adapters, enforces `unique` fields and collection `indexes`, throws `DuplicateKeyError` on duplicate keys, and supports atomic `increment`/`decrement` and conditional `where` updates. MySQL promoted `select`, `radio`, `relationship` and `email` columns use bounded `VARCHAR` types. The adapter contract suite gains concurrency tests for unique inserts and conditional debits.
