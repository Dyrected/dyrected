# Review Packet — basics/database/mongodb.mdx

## Review summary

- Document: MongoDB adapter (configuration guide)
- Goal: Reader can connect to MongoDB and understands what differs from the relational adapters (no promotion, no schema sync, replica-set requirement for transactions).
- Audience: Developers who want document storage.
- Scope: Full page written from stub.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/db-mongodb/src/index.ts` | code | high | `MongoAdapterConfig = { url, dbName }`; `collection_<slug>` collections; `_id` ↔ `id` (ObjectId w/ string fallback); globals in `dyrected_globals`; transactions via `client.startSession()` + `withTransaction`; **no `sync`, no promoted columns**. |
| `apps/docs/content/docs/adapters/databases.mdx` | old docs | high | Mongo example uses `url` + `dbName`; "schema-flexible, but content-contract migrations still matter." |
| MongoDB docs (general knowledge) | external | high | Multi-document transactions require a replica set / sharded cluster. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Query performance and indexes | "add the index directly in MongoDB … against the `collection_<slug>` collection" | Accurate that Dyrected creates no secondary indexes, but confirm we're happy pointing users at raw Mongo index management. | Docs owner |
| Transactions | Replica-set requirement | True for MongoDB generally and the adapter uses sessions; confirm phrasing is acceptable. | Optional |

## Placeholder sweep

No `NEEDS-*` placeholders remain.

## Reviewer questions

1. ~~Are `MONGODB_URI` / `MONGODB_DATABASE` the env var names?~~ RESOLVED — standardized on **`DATABASE_URL`** + **`MONGODB_DB_NAME`** (default `'dyrected'`) to match the CLI scaffold (`packages/cli/src/utils/config-templates.ts` — `buildDbConfig` uses `process.env.DATABASE_URL!` / `process.env.MONGODB_DB_NAME || 'dyrected'`; `buildEnvTemplate` writes both). Config block, prose, and table updated.
2. ~~Is it correct to say `promoted` is a no-op on MongoDB?~~ RESOLVED — confirmed (Mongo adapter has no `ensureTable`/promotion path). Statement kept.
3. ~~Mention `unique: true` is unenforced on Mongo?~~ RESOLVED — added a one-line note linking to `Indexes#enforcing-uniqueness` (no duplication of the canonical explanation).

## Example consistency

- Uses `MongoAdapter({ url, dbName })` throughout. Consistent.

## High-risk areas

- Field semantics: promotion being a no-op on Mongo is a real cross-adapter difference; keep it accurate.
- Transactions availability (replica set) is a deploy-blocking caveat — keep prominent.

## Suggested status label

`ready-for-sme-review`
