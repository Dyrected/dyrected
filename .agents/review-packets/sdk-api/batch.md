# Review Packet — managing-data/sdk-api

Covers the four query-shaping pages written from empty stubs (`sort`, `filter`, `depth`,
`pagination`) plus one small correctness fix to `overview.mdx`. Every behavioral claim was
verified against `@dyrected/sdk` and `@dyrected/core` source, not against docs or the SDK's
own tests (the SDK tests use a misleading operator vocabulary — see conflict #1).

## Document purpose & type

| Page | Type | Reader outcome |
| --- | --- | --- |
| sort | Reference-led guide | Knows the `sort` string syntax (`-` prefix, ` DESC`, comma-separated multi-field), the default order, and that only flat fields sort. |
| filter | Reference-led guide | Knows the `where` object shape, the full operator set, `AND`/`OR` compound logic, relationship-by-ID filtering, and what can't be filtered. |
| depth | Conceptual + configuration guide | Understands depth as relationship population, the default (1), what 0 vs 1 vs 2 return, and that only relationships consume depth. |
| pagination | Reference-led guide | Knows the paginated result shape, `limit`/`page`, how to walk all pages, and the `limit: 1` single-match pattern. |

## Payload equivalents (structure only, no wording reused)

- payloadcms.com/docs/queries/overview → filter.mdx
- payloadcms.com/docs/queries/sort → sort.mdx
- payloadcms.com/docs/queries/depth → depth.mdx
- payloadcms.com/docs/queries/pagination → pagination.mdx

Clean structural equivalents exist for all four. Structure borrowed (section order, concept→reference flow, options-then-caveats); **operator names, response field names, and defaults were taken from Dyrected source, which differ materially from Payload's** (see conflicts).

## Source inventory (all trust: High)

| Source | Establishes |
| --- | --- |
| `packages/sdk/src/query-builder.ts` | `QueryArgs` (sort is `string`; limit/page/depth/where), chained builder, thenable |
| `packages/sdk/src/index.ts` | `client.collection().find/findOne`, `where` sent as JSON string, `defaultDepth ?? 1` (stored, unused), `PaginatedResult` re-export |
| `packages/core/src/utils/parse-where.ts` | Operator set + `AND`/`OR` (uppercase) + shorthand scalar = equals |
| `packages/core/src/utils/where-sanitizer.ts` | Never-filterable types; only exact `AND`/`OR`; nested object/array/row dot paths; top-level relationship by ID |
| `packages/core/src/utils/parse-sort.ts` | `-` prefix / ` ASC`/` DESC` suffix, comma-separated, flat field regex, default `createdAt DESC` |
| `packages/core/src/types/documents.ts` | `PaginatedResult` fields: docs, total, limit, page, totalPages, hasNextPage, hasPrevPage |
| `packages/core/src/controllers/collection.controller.ts` | Server defaults: limit 10, page 1, depth 1; `where` JSON.parse; collection `admin.filterable` gate |
| `packages/core/src/__tests__/depth.test.ts` | depth 0 = raw ID string; depth 1 = populated object (verified by assertion) |
| `packages/core/src/services/population.service.ts` | Only relationships consume depth; internal recursion cap `maxDepth = 10` |

## Verified facts → where each page relies on them

- **Operators:** `equals, not_equals, in, not_in, gt, gte, lt, lte, contains, starts_with, exists` (parse-where.ts:16-27). `contains` = case-insensitive substring; `starts_with` = case-insensitive prefix (SQL `LIKE %x%` / `x%`; Mongo `$regex ...$options:i`). Shorthand bare value = `equals` (parse-where.ts:91-95).
- **AND/OR:** uppercase only. Sanitizer matches `key === 'AND' || key === 'OR'` exactly (where-sanitizer.ts:47); lowercase would be treated as an unknown field and stripped. Documented as uppercase throughout filter.mdx.
- **Sort:** flat field names only — regex `^([A-Za-z_][A-Za-z0-9_]*)(\s+(ASC|DESC))?$` rejects dots (parse-sort.ts:8); comma-separated multi-field; default `createdAt DESC`. SDK type is `string`, so no array form (query-builder.ts:10) — sort.mdx explicitly says "not an array."
- **Depth:** default 1 server-side (collection.controller.ts:123); depth 0 → ID string, depth 1 → populated (depth.test.ts:46-62); only relationships consume depth (population.service.ts).
- **Pagination:** limit 10 / page 1 defaults; response has `total` (not `totalDocs`), no `pagingCounter`/`nextPage`/`prevPage`; no `pagination: false` option exists. pagination.mdx uses only real fields and teaches the `while (hasNextPage)` loop instead of a non-existent opt-out.
- **Relationship filtering:** by stored ID only (relationship not in never-filterable list; sanitizer maps relationships at top level, not their sub-fields). filter.mdx states you can't filter by a related document's fields.

## Conflicts found (code preferred over docs/tests, per workflow) — both RESOLVED

1. **SDK tests used a fictional operator vocabulary.** `packages/sdk/src/__tests__/robustness.test.ts` sent `where: { or: [...], and: [...], price: { greater_than: 0, less_than: 100 } }` — none of which the core engine recognizes (it uses `OR`/`AND` and `gt`/`gte`/`lt`/`lte`). **Fixed:** the fixture and its assertions now use `OR`/`AND` + `gt`/`lt`, so the test reflects real server behavior. Suite green (9/9).
2. **`DyrectedClientConfig.defaultDepth` was dead code.** JSDoc claimed "Applied to every request," but the value was stored and never sent. **Fixed by wiring it up:** added `DyrectedClient.applyDefaultDepth()` (index.ts) and applied it in `find`, `findOne`, `getGlobal`, and `listMedia` so a client-configured `defaultDepth` is injected when a call omits `depth`; a per-call `depth` (including `0`) still wins. Also fixed a latent bug in the `collection().find(args)` builder where `if (args.depth)` dropped an explicit `depth: 0` (now `!== undefined`). JSDoc rewritten to describe the real behavior; the generated `overview.mdx` reference block was regenerated (`generate:check` passes). depth.mdx now documents `defaultDepth` in a "Changing the default for every read" section. New tests lock all three behaviors (default applied, falls back to 1, per-call 0 overrides).

## overview.mdx change

Changed `const posts = await client.collection('posts').find({...})` to
`const { docs: posts } = await ...`. `find` returns a `PaginatedResult`, so binding it to a
bare `posts` implied an array and would break a reader's `posts.map(...)`. Destructuring
`docs` is correct-in-context and consistent with the new pagination page. No other overview
prose changed.

## Generated reference block (overview.mdx) — not hand-edited

The `GENERATED:REFERENCE-SDK` block is generated by `@dyrected/knowledge` from `@dyrected/sdk`
JSDoc. Left untouched per the workflow. Observed quality issue for a systematic fix (JSDoc,
not MDX): many option tables render with empty description cells (e.g. `AuditEntry`,
`BaseSchema`, most `DyrectedClient` methods, `DyrectedClientConfig.baseUrl/apiKey/siteId`).
These are missing JSDoc on the source exports — improving them at the source would improve
every regenerated render. The `defaultDepth` description here is also the misleading one from
conflict #2.

## Uncertainty register / open questions for human review

- ~~[Decision] `defaultDepth`~~ — **resolved:** wired up + JSDoc fixed + docs + tests (conflict #2).
- ~~[Decision] SDK robustness test operators~~ — **resolved:** fixture updated to real operators (conflict #1).
- **[Confirm] `starts_with`/`contains` casing** — code paths are case-insensitive (SQL `LIKE`
  is case-insensitive for ASCII in SQLite default collation; Mongo uses `$options: 'i'`).
  Documented as case-insensitive. Confirm this holds under Postgres/MySQL collations you ship.
- **[Confirm] Multi-field sort end-to-end** — supported by `parse-sort` (comma split) and
  reaches the DB `ORDER BY`; not covered by an SDK-level integration test. Verified by unit
  logic, not by a live multi-column assertion.
- No `NEEDS-SCREENSHOT`/`NEEDS-CODE` markers; all code samples are runnable in context.

## Code changes made this pass (beyond docs)

- `packages/sdk/src/index.ts` — added `applyDefaultDepth()`, applied in `find`/`findOne`/`getGlobal`/`listMedia`; fixed `if (args.depth)` → `!== undefined` in the collection builder; rewrote `defaultDepth` JSDoc.
- `packages/sdk/src/index.test.ts` — 3 new tests for defaultDepth behavior.
- `packages/sdk/src/__tests__/robustness.test.ts` — fixture + assertions use real operators.
- `apps/docs/content/new-docs/managing-data/sdk-api/overview.mdx` — regenerated `REFERENCE-SDK` block (from JSDoc) + the `docs` destructure fix.
- Verification: SDK typecheck clean, `vitest` 9/9 green, `knowledge` `generate:check` passes.

## Status

**Draft ready for review.** Four pages written from verified source behavior; overview fix
applied; both source-level conflicts resolved in code with tests. Not final until a human
confirms the two remaining low-risk items (collation case-insensitivity, live multi-field sort).
