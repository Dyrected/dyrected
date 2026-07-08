# Review Packet — basics/database/transactions.mdx

## Review summary

- Document: Transactions (conceptual + workflow guide)
- Goal: Reader knows what transactions guarantee, where Dyrected already uses them (workflows), how to run one in a hook, and the per-adapter caveats.
- Audience: Developers writing multi-step write logic; custom-adapter authors.
- Scope: Full page written from stub. Intentionally does **not** mirror Payload's `req.transactionID` / `beginTransaction` API (Dyrected exposes `adapter.transaction(callback)` instead).

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/types/adapters.ts` | code | high | `transaction?<T>(callback)` optional in contract; "Shipped adapters implement this; workflow transitions require it." |
| `packages/core/src/types/hooks.ts` | code | high | Full `DatabaseAdapter` (with `transaction`) provided to `afterChange`, `afterDelete`, `GlobalAfterChange`. Other hooks get read-only `ReadonlyDatabaseAdapter`. |
| `packages/db-postgres/src/index.ts` | code | high | `sql.begin`; scoped adapter passed to callback; `FOR UPDATE` row locks inside a txn. |
| `packages/db-mysql/src/index.ts` | code | high | Pooled connection `beginTransaction`; scoped adapter; `FOR UPDATE`. |
| `packages/db-sqlite/src/index.ts` | code | high | Serialized via a promise queue + `BEGIN IMMEDIATE`; callback receives `this`. |
| `packages/db-mongodb/src/index.ts` | code | high | `startSession` + `withTransaction`; scoped adapter with session. |
| Payload `payloadcms.com/docs/database/transactions` | external | medium | Structure only; API intentionally diverged. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Running a transaction yourself | Example calls `db.transaction` inside `afterChange` and uses the `tx` callback arg | Grounded in hook types + adapter impls. But the example assumes an `activity` collection and that `tx.create` is the right call shape. Confirm this is idiomatic (vs. an SDK/service layer we'd rather point people to). | Docs owner |
| Where you already get transactions | "Workflow operations run inside a transaction automatically" | RESOLVED — traced end-to-end: `transitionWorkflow` (`workflows.ts:294`), `createWorkflowDocument` (`:228`), and the revision/draft-save path (`:203`) each wrap their writes + history events in `db.transaction`, and each throws if the adapter lacks `transaction` (`:257`, `:226`, `:193`). | — |
| Per-adapter behavior | `FOR UPDATE` locks / SQLite serialization / Mongo transaction time limit | All confirmed in code / standard Mongo behavior. | Optional |

## Placeholder sweep

No `NEEDS-*` placeholders remain.

## Reviewer questions

1. ~~Is `adapter.transaction(callback)` inside `afterChange`/`afterDelete` the intended public way to run grouped writes? Is there a higher-level API?~~ RESOLVED — verified: it is the intended way and there is **no** higher-level API. The full adapter (with `transaction`) is exposed only to the write-side hooks — `CollectionAfterChangeHook` (`hooks.ts:59`), `CollectionAfterDeleteHook` (`:81`), `GlobalAfterChangeHook` (`:119`), and workflow-transition hooks (`types/workflows.ts:78`); read-side hooks get the read-only view. There is **no** request-level transaction (`grep` finds no `req.transactionID`/`disableTransaction`) and the SDK has no transaction concept. Page updated to state grouping is always explicit.
2. Does the `tx` callback argument expose the same CRUD methods used in the example (`tx.create`, etc.)? (Code: yes — it's a scoped `DatabaseAdapter`.)
3. ~~Is it accurate to state workflow transitions are always transactional?~~ RESOLVED — verified in code (see uncertainty register). Not only transactional but *required*: workflow ops throw on a non-transactional adapter. Page updated to say so.
4. ~~Should we warn against long-running work inside a transaction (holding locks)?~~ RESOLVED — added a "Keep transactions short" section with a warning callout and per-adapter consequences (PG/MySQL hold a pooled connection + `FOR UPDATE` row locks; SQLite serializes all transactions through one queue; MongoDB aborts past its ~60s time limit).

## Example consistency

- Single `posts` + `afterChange` → `activity` example. Consistent. Notes that `tx` (not outer `db`) must be used inside the callback — a real correctness point from the adapter implementations.

## High-risk areas

- SDK/adapter-specific example — verify the hook arg name (`db`) and method shapes match the shipped types (they do as of this pass).
- MongoDB replica-set requirement is a real gotcha; keep it prominent.

## Suggested status label

`ready-for-sme-review`
