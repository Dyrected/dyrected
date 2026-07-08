# Review Packet — basics/database/indexes.mdx

## Review summary

- Document: Indexes (conceptual guide, reframed for Dyrected)
- Goal: Reader knows how to make queries/sorts fast (field promotion) and how uniqueness works — without assuming a Payload-style `index: true` model.
- Audience: Developers optimizing query performance on SQL adapters.
- Scope: Full page written from stub. **This is the highest accuracy-risk page in the batch.**

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/types/schema-core.ts` | code | high | `unique?: boolean` ("must be unique across the collection"), `promoted?: boolean` ("SQL adapters should promote this field into a first-class column"). **No `index` property exists.** |
| `packages/db-{postgres,sqlite,mysql}/src/index.ts` | code | high | Promotion runs `ALTER TABLE ... ADD COLUMN` only. **No `CREATE INDEX` and no `UNIQUE` constraint anywhere.** `id` is PRIMARY KEY; `created_at`/`updated_at` are plain columns. |
| `packages/core/src/utils/config.ts` | code | high | Auth injects `email` as `unique: true, promoted: true` (shows intended usage). |
| Payload `payloadcms.com/docs/database/indexes` | external | medium | Structure only; Payload's `index: true`/compound/`unique` model does **not** map to Dyrected — intentionally diverged. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed — **BLOCKING** |
| --- | --- | --- | --- |
| Enforcing uniqueness | Draft says `unique: true` is a declaration NOT enforced by a DB constraint in shipped self-hosted adapters | Confirmed no `UNIQUE`/unique index is created by any of the four adapters. **But** the field config is pushed to Dyrected Cloud via `sync:schema`, and the Admin UI may validate it. Enforcement location is unverified. | **YES — must confirm before publish** |
| Promotion adds a column, not an index | Draft states promotion does not itself create a DB index | True in code. Confirm we don't want Dyrected to auto-create an index on promoted columns (which would change this guidance). | Product owner |
| id/createdAt/updatedAt | Draft says `id` is fast (primary key) and created_at/updated_at sort efficiently | `id` PRIMARY KEY confirmed. created_at/updated_at are columns but **not indexed** — draft avoids claiming they're indexed. Confirm phrasing is acceptable. | Optional |

## Placeholder sweep

One intentional placeholder remains, deliberately left for the human gate:

- `NEEDS-HUMAN-VERIFY` (MDX comment in "Enforcing uniqueness") — where `unique: true` is actually enforced (Cloud? Admin UI? nowhere?). The rendered prose is written conservatively (application-level enforcement) so the page is safe to read even if the marker isn't resolved, but **resolve before marking final.**

## Reviewer questions

1. **Where is `unique: true` enforced?** Self-hosted adapters don't create a constraint. Does Cloud enforce it on write? Does the Admin UI block duplicates? This determines the whole "Enforcing uniqueness" section.
2. Is "there is no `index: true` field property" a statement we're comfortable publishing (it corrects a likely Payload assumption)?
3. Should promoted columns get an automatic DB index in a future release? If planned, we should soften the "not automatically an index" wording.
4. Is recommending a manual `CREATE INDEX` on the promoted column an acceptable escape hatch to document?

## Example consistency

- Uses a `posts` collection with a `slug` (unique + promoted) throughout. Matches the canonical auto-slug example in `@dyrected/knowledge`. Consistent.

## High-risk areas

- **Field semantics / uniqueness** — the single biggest correctness risk in the batch. Do not publish claiming DB-level enforcement without confirmation.
- Diverges intentionally from Payload's index model; reviewers familiar with Payload should sanity-check the framing.

## Canonical links

- Uniqueness enforcement via hook → links to `basics/hooks/collections`. Broader perf → `deployment/performance/overview`. Correct.

## Verification update (code-checked)

The blocking uniqueness question was verified against the code:

- **Adapters** (`db-postgres`, `db-sqlite`, `db-mysql`, `db-mongodb`): no `UNIQUE` constraint and no unique index is ever created. `field.unique` is not read by any adapter.
- **Controllers/validation**: no code reads `field.unique` to enforce it on write.
- **Admin UI**: `packages/admin/src/components/forms/form-field-renderer.tsx:345-349` renders a cosmetic "Unique" badge next to the field — it does not block duplicates.
- **Cloud**: `field.unique` is included in the payload `sync:schema` POSTs to `cloud.dyrected.com` (`packages/cli/src/commands/sync-schema.ts`). Cloud is a remote service outside this repo, so server-side enforcement could not be verified here.

Resolution: the `NEEDS-HUMAN-VERIFY` marker was removed. **Cloud behavior confirmed by the maintainer: Dyrected Cloud behaves exactly like core, so `unique` is not enforced there either.** The page now states plainly that `unique` is unenforced everywhere (declaration + cosmetic admin badge) and recommends application-level enforcement via a `beforeChange` hook. No open items remain.

## Suggested status label

`ready-for-sme-review` (self-hosted verified in code; Cloud confirmed identical to core — no open items)
