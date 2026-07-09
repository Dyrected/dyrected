# Review Packet — basics/access-control/overview.mdx

## Review summary

- Document: Access Control Overview (conceptual guide; canonical home for the model).
- Goal: Reader leaves knowing the four rule shapes, when rules run, the allow/deny/filter result, the context (`user`/`req`/`doc`/`data`/`id`), the `user` shape, named policies + Cloud-sync behavior, where rules live, and that access is open by default.
- This is a **fresh rewrite** after the access-control implementation was completed to Payload parity. It replaces the earlier draft, whose caveats described pre-implementation behavior that no longer exists.
- Structure source: Payload `access-control/overview`. Structure reused; wording original; behavior is Dyrected's own, verified against code + tests.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/auth/access.ts` (`resolveAccess`, `isAccessAllowed`) | code | high | Four-shape resolution; functions/policies fail closed on throw; unknown policy → false. |
| `packages/core/src/utils/access-control.ts` | code | high | `resolveCollectionAccess` (boolean vs constraint), `matchesAccessConstraint`, field read/write enforcement, `resolveFieldAccessId`. |
| `packages/core/src/auth/jexl.ts` | code | high | Jexl string → boolean **or** object (row-level). |
| `packages/core/src/types/access.ts` | code | high | `AccessRule = boolean \| string \| AccessFunction \| NamedAccessPolicy`; context type. |
| `packages/core/src/types/app-config.ts` | code | high | `accessPolicies?: Record<string, AccessPolicyResolver>`. |
| `packages/cli/src/commands/sync-schema.ts` | code | high | `sanitizeSchemaForCloudSync` strips function rules + warns; keeps boolean/string/named-policy. |
| `packages/core/src/__tests__/access.test.ts`, `access-parity.test.ts` | tests | high | 15 tests, all green — cover every claim on this page. |

## Uncertainty register

| Section | Claim | Status |
| --- | --- | --- |
| Mental model | object result → row-level filter | VERIFIED (`access-parity.test.ts` list/read/update/delete). |
| Four shapes | function denies on CRUD was the old bug — now works | VERIFIED (`access.test.ts` "executes direct function access rules for CRUD routes"). |
| Named policies | resolve from `config.accessPolicies`; params passed; unknown → deny | VERIFIED (`access.test.ts`). |
| Cloud sync `<Warning>` | functions stripped + warned; strings/policies kept | VERIFIED (`sync-schema.ts:13-24`). |
| Context table | `doc`/`data`/`id` availability | VERIFIED against controller call sites. |

## Reviewer questions

1. Do we want to name Jexl explicitly and show the object-returning string form (`"{ owner: { equals: user.sub } }"`), or keep row-level examples to functions/policies only? (Currently shown briefly.)
2. `params` for parameterized named policies is mentioned in one line — is that enough, or should it get its own short example?
3. Open-by-default is documented with a `<Warning>`. Confirm we are not planning secure-by-default (the earlier decision was to keep open, non-breaking).

## Placeholder sweep

No `NEEDS-*` markers remain. All earlier verification flags are resolved by the shipped implementation.

## High-risk areas

- This page is the single source for the mental model; the other three link inward. If the team later changes any default (e.g. secure-by-default) or adds field-level row-level support, update here first.

## Suggested status label

`ready-for-review` — code claims are test-backed; remaining items are editorial.
