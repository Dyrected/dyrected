---
"@dyrected/db-postgres": patch
---

Reuse a shared Postgres client per connection URL so repeated adapter construction in dev servers does not exhaust database connections.
