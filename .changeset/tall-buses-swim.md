---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/db-postgres": patch
---

- Keep the edit-form change-password section inside the default tab when a collection has multiple tabs.
- Populate nested join fields when the requested depth budget allows it, while leaving them unpopulated when depth is exhausted.
- Reuse a shared Postgres client per connection URL so repeated adapter construction in dev servers does not exhaust database connections.
