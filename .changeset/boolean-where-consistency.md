---
"@dyrected/core": patch
"@dyrected/db-sqlite": patch
"@dyrected/db-postgres": patch
"@dyrected/db-mysql": patch
"@dyrected/db-mongodb": patch
---

Make boolean filters behave the same on every adapter. The strings `"true"`/`"false"` are now coerced to booleans for fields declared as boolean (`coerceBooleanWhere`), where they previously matched nothing on SQLite and MongoDB and returned the wrong rows on Postgres for promoted columns. The shorthand `{ flag: false }` form also works on SQLite now.
