# Review Packet — basics/database/mysql.mdx

## Review summary

- Document: MySQL adapter (configuration guide)
- Goal: Reader can connect a self-hosted app to MySQL and knows it behaves like the Postgres adapter.
- Audience: Developers already running MySQL.
- Scope: New page. Added after code verification confirmed `@dyrected/db-mysql` is a real, shipped adapter with no prior page. Also added to `meta.json` (after `sqlite`) and linked from `overview.mdx`.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/db-mysql/src/index.ts` | code | high | `MysqlAdapterConfig = { url? , host?, port?, user?, password?, database? }`; `mysql2/promise`; `CREATE DATABASE IF NOT EXISTS`; `collection_<slug>` JSON tables; promoted columns (`DECIMAL(19,4)`/`TINYINT(1)`/`TEXT`); transactions via pooled connection + `FOR UPDATE`; `execute` raw SQL; `sync`; `EADDRNOTAVAIL` → suggests `127.0.0.1`. |
| `apps/docs/content/docs/adapters/databases.mdx` | old docs | high | MySQL example + "also accepts individual connection properties." |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Positioning | Page says MySQL "behaves like the Postgres adapter" | Accurate structurally (same storage/promotion/transactions), but confirm we want to position MySQL as fully co-equal to Postgres for production. | Docs/product owner |
| Configuration | Documents both `url` and individual fields | Both are real in `MysqlAdapterConfig`. Confirm we want to advertise the individual-fields form or steer everyone to `url`. | Docs owner |

## Placeholder sweep

No `NEEDS-*` placeholders remain.

## Reviewer questions

1. Should MySQL be presented as a first-class production adapter alongside Postgres, or as a "supported if you already use it" option? (Draft leans slightly toward the latter.)
2. Is the `127.0.0.1` vs `localhost` (`EADDRNOTAVAIL`) tip worth keeping? (It comes straight from the adapter's own error message, so it's real and likely helpful.)
3. Are the promoted-column SQL types (`DECIMAL(19,4)` for number, `TINYINT(1)` for boolean) worth surfacing, or is that too internal? (Draft omits them.)

## Example consistency

- Uses `MysqlAdapter({ url })` as the primary form, with an individual-fields variant shown once. Consistent.

## High-risk areas

- Startup schema sync described as additive (matches `ensureTable`/`sync`). Keep accurate.

## Suggested status label

`ready-for-sme-review`
