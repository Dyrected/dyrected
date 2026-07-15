# Authentication Operations Review Packet

## Document purpose

- File: `apps/docs/content/docs/features/authentication/operations.mdx`
- Goal: be the review-ready route and workflow reference for auth collection operations, using the actual Dyrected response shapes and newer logout/session semantics.

## Source inventory

- `https://payloadcms.com/docs/authentication/operations`
  - Why it matters: closest structural equivalent for a reference-led auth operations page.
  - Trust: high
  - Notes: used for route-by-route structure and transition from conceptual framing into operation reference.
- `packages/core/src/controllers/auth.controller.ts`
  - Why it matters: authoritative request/response behavior for collection auth endpoints.
  - Trust: high
- `packages/core/src/router.ts`
  - Why it matters: authoritative route mounting and auth requirements.
  - Trust: high
- `packages/core/src/utils/openapi.ts`
  - Why it matters: authoritative generated reference contract for route existence and `allSessions` query param.
  - Trust: high
- `packages/sdk/src/index.ts`
  - Why it matters: authoritative SDK helper names used in examples and table rows.
  - Trust: high, with one stale JSDoc noted below
- `packages/core/src/auth/sessions.ts`
  - Why it matters: confirms refresh preserves the same underlying session and logout/reset revoke sessions.
  - Trust: high

## Uncertainty register

- The page uses raw `fetch` for `allSessions=true` because the SDK does not currently expose a dedicated helper for that variant.
- The page does not describe admin external auth routes because that belongs to admin SSO, not collection-auth operations.

## High-risk claims to verify

- `logout` is public for the base route, but `allSessions=true` meaningfully requires a valid authenticated account to revoke anything.
- `refresh-token` keeps the same session instead of creating a second one.
- `reset-password` and `change-password` revoke active sessions.

## Specific review questions

1. Do you want the operations page to mention response status codes more aggressively in each section, or is the current balance enough?
2. Should the `allSessions=true` variant stay inline under logout, or does it deserve a small callout because the SDK does not wrap it yet?
3. Is the "Password recovery" grouping clearer than separate top-level "Forgot Password" and "Reset Password" sections?

## Doc-vs-code conflict noted

- `packages/sdk/src/index.ts` still says `logout` is stateless in JSDoc, but runtime now revokes the current session. The MDX follows runtime behavior.

## Status

- Draft ready for human review.
