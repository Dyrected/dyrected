---
"@dyrected/db-mysql": patch
"@dyrected/db-mongodb": patch
---

Fix aggregate bugs found on live databases. MySQL no longer fails on `distinct` aggregates (it has no `DISTINCT` for `JSON_ARRAYAGG`, so values are de-duplicated in the adapter), groups by numeric columns now use keys like `"1"` instead of `"1.0000"`, and filters on unpromoted boolean fields now match. MongoDB grouped aggregates now honour each aggregate's `where`.
