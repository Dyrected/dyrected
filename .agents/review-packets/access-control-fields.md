# Review Packet — basics/access-control/fields.mdx

## Review summary

- Document: Field Access Control (configuration guide).
- Goal: Reader knows field `read`/`update` rules are enforced on the API (strip from responses / drop from writes) **and** in the admin panel (hide / read-only), what context a field rule sees (incl. server-side `id`), that field rules are boolean-only, that they apply to nested fields, and when to use hooks instead.
- Fresh rewrite. This page changed the most: field access is now a real server-side boundary, and the `id`-context fix means `!id`-style rules behave the same server-side and in the admin.
- Structure source: Payload `access-control/fields` (adapted — Dyrected has `read`/`update`, no separate field `create` rule).

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/utils/access-control.ts` (`applyFieldReadAccess`, `applyFieldWriteAccess`, `resolveFieldAccessId`) | code | high | read-deny → strip; update-deny → drop; recurses object/array/blocks/row; `id` = `context.id ?? doc?.id ?? data?.id`. |
| `packages/admin/src/components/forms/form-field-renderer.tsx:52-137` | code | high | Admin evaluates **string/`false`** rules only (functions/policies are not compiled client-side); read-deny → hide, update-deny → read-only. |
| `packages/core/src/controllers/*.controller.ts` | code | high | Field access applied on create/update writes and on read responses (collection + global). |
| `packages/core/src/__tests__/access-parity.test.ts:145-213` + id-gap regression | tests | high | Field read/write stripping incl. nested `object`; `!id`/`id`-based rules now enforced server-side. |

## Uncertainty register

| Section | Claim | Status |
| --- | --- | --- |
| Intro / What each rule does | read → strip from API + hide in form; update → drop from write + read-only | VERIFIED. |
| Context | `id` available server-side (from doc/data), matching admin | VERIFIED (`resolveFieldAccessId`; regression test). |
| `<Note>` on functions | functions/named policies on fields are **server-only**; admin evaluates string/`false` | VERIFIED (`form-field-renderer.tsx` compiles only `typeof === "string"`; `=== false` handled). |
| Boolean-only | object result → denial for fields | VERIFIED (`resolveBooleanAccess`). |
| Nested | rules enforced inside group/array/blocks | VERIFIED (recursion in access-control.ts; nested-object test). |

## Reviewer questions

1. The `<Note>` says function/named-policy field rules run server-side only (the admin won't reflect them). Is that the intended long-term behavior, or should the admin gain the ability to evaluate named policies so the form matches the API? This is the one real behavior asymmetry left on this page.
2. Dyrected fields have `read`/`update` but no field-level `create` rule (Payload has all three). On create, the `update` rule is what governs field writes. Confirm we do not want a separate field `create` rule for parity.
3. The roles example asserts an admin "cannot change their own roles" on the API. This now holds because `id` is resolved server-side — confirm that is the desired product behavior (it also means an admin cannot fix their own roles via the API, only another admin can).

## Placeholder sweep

No `NEEDS-*` markers. The earlier "admin-panel only / not a server boundary" framing is removed — it no longer matches the code.

## High-risk areas

- Question 1 (function/policy field rules are server-only) is the only spot where the admin form and the API can diverge. The page steers readers to strings/`false` to avoid it, but a reviewer should confirm the framing.

## Suggested status label

`ready-for-review`
