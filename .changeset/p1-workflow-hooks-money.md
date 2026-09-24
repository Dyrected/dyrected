---
"@dyrected/core": minor
"@dyrected/admin": minor
"@dyrected/cli": patch
"@dyrected/db-mysql": patch
"@dyrected/db-postgres": patch
"@dyrected/db-sqlite": patch
---

Add transactional write hooks and exact money handling. Collections can define `hooks.beforeCommit`, which runs inside the write transaction with a writable `tx` so secondary writes commit or roll back with the document. Workflow transitions can define `onTransition`, run inside the transition transaction and given an optional request `input`. Fields accept `immutable: true`, which rejects any update that changes the value. The new `money` field (`defineMoneyField`) stores integer minor units, validates them on write, maps to `BIGINT` in SQL adapters, and is edited and displayed in major units in the Admin.
