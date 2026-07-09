# Review Packet — basics/access-control/collections.mdx

## Review summary

- Document: Collection Access Control (configuration guide).
- Goal: Reader can set read/create/update/delete rules, knows which method each guards, and can express row-level (ownership/tenant) access with a returned filter object.
- Fresh rewrite against the completed implementation. Keeps the recipe tabs; tightens the row-level section; adds an owner-scoped recipe.
- Structure source: Payload `access-control/collections`.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/router.ts` L480-492 | code | high | Method→access-key mapping; CRUD routes now enforced in the controller, not a gate. |
| `packages/core/src/controllers/collection.controller.ts` | code | high | `find` merges constraint into `where`; `findOne`/`update`/`delete` verify constraint via `matchesAccessConstraint`; create passes `data`. |
| `packages/core/src/utils/access-control.ts` (`resolveCollectionAccess`, `mergeWhereConstraint`) | code | high | list → `{allowed:true, constraint}`; single-doc → match check; create + object → `{allowed:false}`. |
| `packages/core/src/__tests__/access-parity.test.ts:12-143` | tests | high | Row-level enforcement across list/read/update/delete, both function and Jexl-string filter forms. |

## Uncertainty register

| Section | Claim | Status |
| --- | --- | --- |
| Method table | GET→read, POST→create, PATCH→update, DELETE→delete | VERIFIED (`router.ts`). |
| Document-aware rules | list merges filter; fetch/update/delete match-check → 403 on mismatch | VERIFIED (parity test). |
| Document-aware rules | `create` returning an object is treated as denial | VERIFIED (`resolveCollectionAccess` L69-71). |
| Owner-scoped recipe | filter object scopes list + single-doc | VERIFIED. |

## Reviewer questions

1. The method table omits absolute paths on purpose (the API base path is configurable, default `/dyrected`). Confirm that is the right call, or should there be an "API routes" reference to link to?
2. The owner-scoped recipe deliberately does **not** special-case admins (so admins are also scoped). Confirm we want to show it that way, or add an admin-bypass variant.
3. `find` auto-seeding from `initialData` is skipped when a read constraint is present ([collection.controller.ts:185](../../packages/core/src/controllers/collection.controller.ts)). Not documented here — is that worth a note, or purely internal?

## Placeholder sweep

No `NEEDS-*` markers. The earlier "row-level not implemented" and "no doc/data" flags are resolved.

## High-risk areas

- The "create returning an object = deny" rule is easy to trip over. It is stated explicitly; keep it if the runtime behavior stays.

## Suggested status label

`ready-for-review`
