# Preventing Abuse Review Packet

## Document purpose

- File: `apps/docs/content/docs/deployment/production/preventing-abuse.mdx`
- Goal: explain which abuse protections Dyrected now provides directly, where host-layer protection is still required, and how to configure the recommended production path without overclaiming.

## Source inventory

- `https://payloadcms.com/docs/production/preventing-abuse`
  - Why it matters: closest structural equivalent for a production anti-abuse page.
  - Trust: high
  - Notes: used for section flow only, not wording.
- `packages/core/src/middleware/rate-limit.ts`
  - Why it matters: authoritative behavior for built-in app-layer rate limiting.
  - Trust: high
- `packages/core/src/network.ts`
  - Why it matters: authoritative client-IP and `trustProxy` behavior.
  - Trust: high
- `packages/core/src/types/app-config.ts`
  - Why it matters: authoritative public config shape for `rateLimit`.
  - Trust: high
- `packages/core/src/auth/lockout.ts`
  - Why it matters: authoritative defaults for auth lockout.
  - Trust: high
- `packages/core/src/types/schema-config.ts`
  - Why it matters: authoritative public auth config contract and defaults.
  - Trust: high
- `packages/core/src/controllers/preview.controller.ts`
  - Why it matters: confirms preview token behavior depends on `DYRECTED_JWT_SECRET`.
  - Trust: high

## Uncertainty register

- No distributed/shared store exists for the new built-in limiter. The page now states clearly that it is in-process only.
- The page avoids stronger claims about CSRF, CORS, WAF, or upload malware scanning because those do not appear as first-class built-in Dyrected protections in the source set.

## High-risk claims to verify

- Built-in rate limiting is enabled by default and protects `/api` at `500` requests per `15` minutes.
- `trustProxy` accepts `true` or a number of trusted proxy hops.
- Lockout remains the separate account-level protection and should usually stay enabled.

## Specific review questions

1. Is the production recommendation order right for Dyrected users, or do you want host-edge protection introduced even earlier than the built-in limiter?
2. Do you want this page to mention CORS or CSRF explicitly, even if Dyrected is not presenting them as the main new protections here?
3. Is the "preview and uploads are public surfaces" framing the right level of emphasis for this page?

## Status

- Draft ready for human review.
