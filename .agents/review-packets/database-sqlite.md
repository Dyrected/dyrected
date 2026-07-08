# Review Packet — basics/database/sqlite.mdx

## Review summary

- Document: SQLite adapter (configuration guide)
- Goal: Reader can run locally on SQLite with zero setup, knows the single config option and storage model, and knows when to graduate to Postgres.
- Audience: Developers starting locally or running small single-server apps.
- Scope: Full page written from stub.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/db-sqlite/src/index.ts` | code | high | `SqliteAdapterConfig = { filename }`; `better-sqlite3`; `collection_<slug>` TEXT-JSON tables; promoted columns; transactions serialized via a queue + `BEGIN IMMEDIATE`; **no `execute()` method**. |
| `apps/docs/content/docs/adapters/databases.mdx` | old docs | high | "convenient for local development and persistent single-server deployments"; ephemeral-FS warning. |
| Payload `payloadcms.com/docs/database/sqlite` | external | medium | Structure template only. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Transactions | "Dyrected serializes them" | Accurate to code (transaction queue), but worth confirming this is acceptable to state publicly as behavior. | Docs owner |
| File is created if it doesn't exist | better-sqlite3 creates the file | Standard better-sqlite3 behavior; confirm no wrapper prevents it. | Optional |

## Placeholder sweep

No `NEEDS-*` placeholders remain.

## Reviewer questions

1. ~~Is `{ filename }` the only supported option?~~ RESOLVED — verified: `SqliteAdapterConfig` is `{ filename: string }` only (`packages/db-sqlite/src/index.ts:4-6`). No `:memory:` special-casing and no pragma options (the only `PRAGMA` uses are internal `table_info` introspection). Nothing else to document.
2. ~~Does SQLite have a raw SQL `execute` escape hatch?~~ RESOLVED — verified: no. Every `.exec()` in the adapter is internal (schema setup, `BEGIN`/`COMMIT`/`ROLLBACK`); there is no public `execute` method. Page deliberately omits raw SQL for SQLite. **Also aligned the example filename to `./data.db` to match the CLI scaffold.**
3. ~~Is "small single-server apps" the right pitch?~~ RESOLVED — repositioned as **dev-first**: SQLite is mainly for local development, with small single-server use as a secondary possibility, and Postgres recommended for anything production-facing.

## Example consistency

- Uses `SqliteAdapter({ filename: './dyrected.db' })` throughout. Consistent.

## High-risk areas

- Ephemeral-filesystem warning is important and must stay (data-loss risk on serverless).

## Suggested status label

`ready-for-sme-review`
