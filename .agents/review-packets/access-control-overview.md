# Review Packet — basics/access-control/overview.mdx

## Review summary

- Document: Access Control Overview (conceptual guide; canonical home for the access-control mental model).
- Goal: Reader leaves knowing what an access rule is, when it runs, what it returns, what it can see (`user`/`req`), how `user` is shaped, the three levels rules attach to, and that access is open by default.
- Audience: Developers building on Dyrected, competent but possibly new.
- Starting point: The file was an empty stub (`title: Overview` only). This is a from-scratch draft grounded in verified core behavior, not a rewrite of existing prose.
- Structure source: Payload `access-control/overview` (intro → default access → the access operation → links out). Structure reused; wording original; behavior is Dyrected's own.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/router.ts` (`accessGate` L19-39, `checkAccess` L41-56, schema/options gates L110-255) | code | high | The CRUD gate; the single most important file for this page. |
| `packages/core/src/auth/jexl.ts` (`evaluateAccess`) | code | high | How string/boolean rules evaluate; object/function coercion. |
| `packages/core/src/types/access.ts` (`AccessFunction`) | code | high | The advertised type surface — conflicts with runtime (see below). |
| `packages/core/src/types/request.ts` (`AuthenticatedUser`) | code | high | `user` shape: `sub`, `email?`, `collection`, `roles?: string[]`. |
| `packages/core/src/middleware/auth.ts` (`resolveUser`) | code | high | User re-hydrated from DB (minus password) when a db is configured; JWT carries only `sub`/`email`/`collection`. Matches prior project memory on auth hydration. |
| `packages/core/src/utils/config.ts` L138-190 | code | high | Scaffolded auth collection `roles` field + Jexl-string field rules. |
| `apps/docs/content/docs/concepts/access-control.mdx` | old docs | low | Predecessor prose; contradicts runtime on several points (see uncertainty register). Used for topic scope only. |
| Empirical repro (`jexl@2.3.0`, in-repo) | test | high | Confirmed: function rule → throws → deny; string/boolean → work; `!!{}` → `true`. |
| Payload `payloadcms.com/docs/access-control/overview` | external | medium | Structure only. |

## Uncertainty register — shared findings (apply across all four pages)

These are the high-risk items. Each is a place where the **advertised API (types/JSDoc/old docs) disagrees with the runtime**, verified against code and (for #1/#2) reproduced.

| # | Claim in old docs / types | Runtime reality (verified) | Evidence | Draft handling |
| --- | --- | --- | --- | --- |
| 1 | Access rules can be JavaScript **functions** (`AccessFunction` type, JSDoc examples). | On CRUD routes, a function is passed to `evaluateAccess` → `jexl.eval(fn)` → throws → caught → returns `false` → **403 deny**. Functions only work on schema/options and workflow-history paths (which use `checkAccess`). | `router.ts:31` (gate calls `evaluateAccess`), `jexl.ts:16-22`; `router.ts:41-56` (`checkAccess` handles functions but is not used by the CRUD gate); empirical repro. | Draft teaches Jexl **strings** + booleans only. Function mention is a `<Note>` flagged with `NEEDS-HUMAN-VERIFY`. |
| 2 | `read` returning an **object** is applied as a row-level `where` filter (e.g. "users see only their own orders"). | On list/findOne/update/delete the object is coerced to `true` (`!!{}`), i.e. **allow-all** — no filtering. Only `workflowHistory` honors object→`where`. | `jexl.ts:18`; `checkAccess` `router.ts:46`; `find` builds `where` only from query/hook/workflow (`collection.controller.ts:98-138`); object→where exists only at `collection.controller.ts:591-598`. | Draft does **not** teach object row-filtering. Collections/Globals pages carry a `<Warning>` + `NEEDS-HUMAN-VERIFY`. |
| 3 | Rules receive `doc` (existing document) and `data` (incoming body). | CRUD gate passes `{ user, req, doc: null }` and no `data`. Only `workflowHistory` passes a real `doc`. | `router.ts:30`; `collection.controller.ts:586`. | Draft states rules see only `user`/`req`; ownership logic routed to hooks. |
| 4 | Field `access.read` strips a field from responses; `access.update` is ignored on write (server-enforced). | Field access is **not** enforced on the API data path; it is serialized to the `/schema` endpoint and enforced **only by the admin UI**. A direct API write ignores field rules. | `router.ts:147-149,198-200` (serialize only); `utils/hooks.ts` (no `access`); admin `form-field-renderer.tsx:52-137` (UI enforcement). | Fields page leads with an explicit "admin-panel, not a server boundary" `<Warning>`. |
| 5 | (implied secure) | **Open by default**: a missing rule on a routed CRUD op = public (`accessGate` calls `next()`). `/seed` endpoints and dynamic `onSchemaFetch` collections are ungated. | `router.ts:24-28`, `:500`, `:519`; catch-all L538-672. | Every page has a default-open `<Warning>`. `/seed` + dynamic gaps noted in this packet for reviewers. |

## Uncertainty register — this page

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| What a rule can see | `user.sub` and `user.id` both hold the user ID. | `sub` comes from the JWT overlay; `id` from the re-hydrated DB record (`middleware/auth.ts:29-72`). Both present when a db adapter is configured; without a db, only JWT claims (`sub`/`email`/`collection`) exist. | Confirm we want to present both, and whether to caveat the no-db case. |
| Writing a rule | "Jexl looks like ordinary JavaScript comparison syntax… restricted expression language." | Accurate, but reviewers should confirm we want to name Jexl explicitly (it is the underlying lib, `jexl@2.3.0`). | Docs owner |

## Placeholder sweep

One intentional marker remains: a `{/* NEEDS-HUMAN-VERIFY … */}` MDX comment beside the function-form `<Note>` (invisible when rendered). It is intentional and tied to finding #1. Remove it once #1 is resolved.

## Reviewer questions

1. **Function-form access (finding #1):** is the CRUD gate using `evaluateAccess` instead of `checkAccess` a bug to fix (which would make functions first-class again), or intended? This single decision determines whether these pages should document functions at all.
2. **Row-level filtering (finding #2):** should the docs describe object-return `where` filtering as a roadmap item, or stay silent until it works on CRUD? Documenting it as working would create a data-leak footgun.
3. Do we want to name Jexl and show its syntax, or abstract it behind "expression string"?
4. Should we state the open-by-default behavior as a deliberate design choice, or is secure-by-default the intended future?

## High-risk areas

- Findings #1, #2, #4 are security-relevant. A reader who trusts the old docs' function/object-filter/field-strip claims could ship an app that denies legitimate requests (#1) or leaks data (#2, #4). The draft deliberately avoids teaching these until confirmed.

## Canonical links

- This page is the canonical home for the access-control model; the other three pages link inward to it and do not re-explain the core. Correct per "document once, reference anywhere."

## Suggested status label

`ready-for-sme-review` — blocked on questions 1 and 2 before this can be called final.
