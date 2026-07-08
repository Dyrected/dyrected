# Review Packet — basics/database/overview.mdx

## Review summary

- Document: Database Overview (conceptual + reference-led; hosts the generated adapter contract)
- Goal: Reader understands what the database adapter is, how to choose one, how data is physically stored, and where to go for deeper behavior.
- Audience: Self-hosting Dyrected developers, competent but possibly new to Dyrected.
- Scope: Light enhancement of an already-good page. Added relational-vs-document framing + MySQL mention, a "How your data is stored" mental model, and routing links to migrations/transactions/indexes. Generated reference block left untouched.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/types/adapters.ts` (`DatabaseAdapter` JSDoc) | code | high | Source of the generated reference block. |
| `packages/db-*/src/index.ts` | code | high | Confirms `collection_<slug>` tables, JSON `data` column, `created_at`/`updated_at`, internal globals table, native Mongo storage. |
| `apps/docs/content/docs/adapters/databases.mdx` | old docs | high | Canonical prose predecessor; Cloud-manages-db note. |
| `apps/docs/content/new-docs/basics/configuration/overview.mdx` | new docs | high | Voice/style + `defineConfig`/`PostgresAdapter` usage. |
| Payload `payloadcms.com/docs/database/overview` | external | medium | Structure only (selecting a database, relational vs non-relational). |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Choosing an adapter | MySQL "behaves like the Postgres adapter" | RESOLVED: `mysql.mdx` was added and is now linked here; MySQL is in `meta.json`. | — |
| How your data is stored | Internal table naming ("small internal table" for globals) | Kept vendor-neutral on purpose (`dyrected_internal` for SQL, `dyrected_globals` for Mongo); confirm we don't want to name it explicitly | Docs owner |

## Placeholder sweep

No `NEEDS-*` placeholders remain in this page. The two `{/* GENERATED:REFERENCE-DATABASE-ADAPTERS */}` markers are the pre-existing generated-block delimiters, not drafting placeholders.

## Reviewer questions

1. Is MySQL intended to be a first-class documented adapter? If so, we should add `mysql.mdx` and a link here.
2. Is the "one JSON column named `data`" detail one we're comfortable exposing publicly, or should it stay more abstract?
3. Are the three routing links (migrations/transactions/indexes) the right "next steps" for this page?

## Example consistency

- No running code example beyond the standard `PostgresAdapter` config block (consistent with sibling pages). Good.

## High-risk areas

- None new. The generated reference block is unmodified.

## Canonical links

- This page is the canonical home for the adapter contract and storage mental model; other pages link inward to it. Correct.

## Suggested status label

`ready-for-sme-review`
