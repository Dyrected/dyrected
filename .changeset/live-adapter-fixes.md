---
"@dyrected/core": patch
"@dyrected/db-mysql": patch
"@dyrected/db-postgres": patch
"@dyrected/db-mongodb": patch
"@dyrected/admin": patch
---

Fix bugs found by running the adapter contract suite against live databases. Postgres atomic `increment`/`decrement` no longer fails with "multiple assignments to same column data", and conditional `where` updates by id no longer collide on parameter numbers. MySQL and Postgres unique and compound indexes on collections with long names are now created (over-long index names are shortened with a stable hash instead of being silently rejected, which left `unique` unenforced). MongoDB compound indexes no longer fail when `sparse` is unset. The `money` field also gets its numeric list filter in the Admin.
