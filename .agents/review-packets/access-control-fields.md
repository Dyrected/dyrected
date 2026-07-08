# Review Packet — basics/access-control/fields.mdx

## Review summary

- Document: Field Access Control (configuration guide; the most behavior-sensitive of the four).
- Goal: Reader knows field `read`/`update` rules shape the **admin panel** (hidden / read-only), understands they are **not** a server boundary, knows the variables a field rule can see, and knows to use collection rules or hooks for server-side enforcement.
- Audience: Developers tailoring the admin editing experience.
- Starting point: Empty stub (`title: Fields`). From-scratch draft.
- Structure source: Payload `access-control/fields` (Config Options → Create → Read → Update). Adapted: Dyrected fields expose only `read`/`update` (no separate `create` rule), and enforcement is UI-side, so the page leads with that distinction instead of Payload's "stripped/discarded" server semantics.

> The five cross-cutting security-relevant findings are documented in full in **access-control-overview.md**. Finding #4 (field access is UI-only) is the defining fact of this page.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/admin/src/components/forms/form-field-renderer.tsx` L45-137 | code | high | The only enforcement point. `read` false → field hidden (`return null` L121); `update` false → read-only (L124-137). Context = `{ user, ...conditionData }` where `conditionData` = form values + sibling data + `id` (when `documentId` present) — L45-49, 114, 132. |
| `packages/core/src/router.ts` L147-149, 198-200 | code | high | Field `access.read`/`access.update` serialized into the `/schema` endpoint (the signal the admin UI consumes). No API-data enforcement. |
| `packages/core/src/utils/hooks.ts` | code | high | `executeFieldBeforeChange`/`executeFieldAfterRead` run field **hooks**, not field access — no `access` reference at all. Confirms no server-side field-access enforcement. |
| `packages/core/src/utils/config.ts` L138-190 | code | high | Real-world field-access examples: `roles.update: "'admin' in user.roles && user.id != id"`, `email.update: "!id"`, `password.update: "!id \|\| user.id == id"`. Source of the page's `!id` and self-elevation examples. |
| Payload `access-control/fields` | external | medium | Structure only. |

## Uncertainty register — this page

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Lead `<Warning>` | "Field access is not a server-side authorization boundary; a direct API request can read/write the field regardless." (finding #4) | Verified across core (no enforcement) + admin (only enforcement). Reviewers must confirm this is acceptable to state publicly, since it means the scaffolded `roles`/`email` field rules are **not** enforced against direct API writes (self-role-elevation is possible via the API). | **SME — security** |
| What a field rule can see | Variables are `user`, `id` (edit only), and current form values. | These come from the admin renderer's client-side Jexl context (`form-field-renderer.tsx:48-49,114,132`), which differs from the server `{ user, req, doc }` context. Confirm we want to document the client context, since that is where field rules actually run. | SME |
| The shape | Only a Jexl **string** or literal `false` is honored; functions are inert in the renderer, `true`/omitted = no restriction. | Verified: renderer compiles only `typeof === "string"`; `=== false` hides/locks; otherwise defaults to allowed (L107-137). | Confirm we present `false` + string as the two real options. |

## Placeholder sweep

One intentional `{/* NEEDS-HUMAN-VERIFY … */}` comment in the lead `<Warning>` (finding #4). Invisible when rendered.

## Reviewer questions

1. **Security (finding #4):** the scaffolded auth collection's `roles`/`email` field rules are enforced only in the admin UI, so a direct `PATCH` to the API could set `roles: ['admin']` on one's own account. Is that the current accepted behavior, and do we want the docs to (a) state it plainly, (b) recommend a `beforeChange` hook to enforce it, and/or (c) is a server-side field-access fix planned that would change this page?
2. Is documenting the client-side field-rule context (`user`, `id`, form values) the right level of detail, or should we keep it to `user` + `id` only?
3. Should this page include a ready-made `beforeChange` hook snippet that enforces the roles rule server-side, or link out to the hooks page (current choice)?

## Example consistency

- Examples build on the scaffolded auth collection (`roles`, `!id`) so they match the framework's own real usage. Consistent `user.roles` idiom throughout.

## High-risk areas

- This entire page hinges on finding #4. If server-side field-access enforcement is added later, the lead warning and the "Enforcing on the server" section must be rewritten. Flag for re-review on any change to field access handling.

## Canonical links

- Links inward to overview and collections; outward to fields/overview and field hooks. Correct.

## Suggested status label

`ready-for-sme-review` — blocked on question 1 (security) before final.
