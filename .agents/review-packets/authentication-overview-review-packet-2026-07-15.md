# Authentication Overview Review Packet

## Document purpose

- File: `apps/docs/content/docs/features/authentication/overview.mdx`
- Goal: serve as the canonical mental-model page for Dyrected authentication, with the updated session model, production lockout guidance, and the split between application auth and dashboard auth.

## Source inventory

- `https://payloadcms.com/docs/authentication/overview`
  - Why it matters: closest structural equivalent for the conceptual auth overview.
  - Trust: high
  - Notes: used for information flow and where to move from mental model into options.
- `packages/core/src/types/schema-config.ts`
  - Why it matters: authoritative `auth` collection contract and lockout option docs.
  - Trust: high
- `packages/core/src/controllers/auth.controller.ts`
  - Why it matters: authoritative login, logout, reset, refresh, invite, and first-user behavior.
  - Trust: high
- `packages/core/src/middleware/auth.ts`
  - Why it matters: authoritative request-time auth/session resolution and user hydration behavior.
  - Trust: high
- `packages/core/src/auth/sessions.ts`
  - Why it matters: authoritative session record model and revocation behavior.
  - Trust: high
- `packages/core/src/auth/token.ts`
  - Why it matters: authoritative JWT payload shape and default token expiration path.
  - Trust: high
- `packages/cli/src/utils/config-templates.ts`
  - Why it matters: verifies the current CLI template does write `DYRECTED_JWT_SECRET` to `.env.example`.
  - Trust: high

## Uncertainty register

- The page states that tokens expire after 7 days by default because `signCollectionToken` defaults to `7d`. That is grounded in code, but there is no user-facing config page yet for changing token lifetime.
- The page does not enumerate every auth-related option because Dyrected currently exposes a narrower auth config than Payload and this page is positioned as conceptual first.

## High-risk claims to verify

- Auth collections now use JWTs backed by revocable server-side session records.
- `DYRECTED_JWT_SECRET` is both required for auth collections and reused by token-mode preview.
- `__admins` remains the sole special slug for dashboard login separation.

## Specific review questions

1. Is the current emphasis on the new session model strong enough, or should revocable sessions move even higher on the page?
2. Do you want the CLI note about `.env.example` here, or would you rather keep this page runtime-focused only?
3. Is the "project credential vs user session" section still the right fit for overview, or should that move to a separate auth strategy page?

## Doc-vs-code conflict noted

- `packages/sdk/src/index.ts` still documents `logout()` as stateless in JSDoc. Runtime behavior is now session revocation. The MDX follows runtime behavior and this SDK comment should be updated separately.

## Status

- Draft ready for human review.
