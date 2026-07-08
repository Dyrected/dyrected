# Review Packet — basics/database/postgres.mdx

## Review summary

- Document: Postgres adapter (configuration guide)
- Goal: Reader can connect a self-hosted app to Postgres, knows the single config option, understands startup behavior and storage, and knows it's the production default.
- Audience: Self-hosting developers deploying to production.
- Scope: Full page written from stub.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/db-postgres/src/index.ts` | code | high | `PostgresAdapterConfig = { url }`; auto-create DB via `CREATE DATABASE` needing CREATEDB; `collection_<slug>` JSONB tables; promoted columns via `ALTER TABLE`; `transaction` via `sql.begin`; `FOR UPDATE` locks in `findOne`; `execute` raw SQL; `sync`. |
| `apps/docs/content/docs/adapters/databases.mdx` | old docs | high | "accepts the connection `url`… do not copy undocumented constructor options." |
| Payload `payloadcms.com/docs/database/postgres` | external | medium | Structure template only. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Transactions and raw SQL | "the Postgres adapter can also run raw SQL" | `execute()` exists on the adapter but is only reachable via the full adapter inside afterChange/afterDelete hooks; there's no documented top-level API. Draft keeps it deliberately vague. | Confirm we want to surface raw SQL at all |
| What happens on startup | Auto-create DB behavior | Real in code, but relies on CREATEDB privilege; confirm we want to advertise it vs. tell people to pre-create the DB | Docs owner |

## Placeholder sweep

No `NEEDS-*` placeholders remain.

## Reviewer questions

1. ~~Is `{ url }` still the only supported constructor option?~~ RESOLVED — verified: `PostgresAdapterConfig` is `{ url: string }` only (`packages/db-postgres/src/index.ts:9-11`). Page unchanged (already accurate).
2. ~~Document auto-database-creation as a feature or downplay it?~~ RESOLVED — downplayed as a local-dev convenience. Page now leads with table/global creation and adds a separate note telling production users to pre-create the database (adapter can't create it on locked-down managed hosts).
3. ~~Are Supabase/Neon/RDS/Railway safe to name?~~ RESOLVED — yes, kept.

## Example consistency

- Uses the standard `PostgresAdapter({ url })` config block throughout. Consistent.

## High-risk areas

- Startup schema sync described as additive/non-destructive — must stay accurate (matches `ensureTable`/`sync`).

## Suggested status label

`ready-for-sme-review`
