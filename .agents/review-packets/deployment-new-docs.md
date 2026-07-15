# Deployment Docs Review Packet

## Purpose

Review the new `new-docs/deployment` pages for factual accuracy, missing operational caveats, and whether they set the right production expectations without promising unimplemented platform features.

## Pages in Scope

- `apps/docs/content/new-docs/deployment/production/deployment.mdx`
- `apps/docs/content/new-docs/deployment/production/building-without-a-db-connection.mdx`
- `apps/docs/content/new-docs/deployment/production/preventing-abuse.mdx`
- `apps/docs/content/new-docs/deployment/performance/overview.mdx`

## Source Inventory

- `packages/core/src/app.ts`
  - Why it matters: proves startup behavior for self-hosted Dyrected, including SQL sync timing and current middleware.
  - Trust: high
  - Gap: does not itself document host-level deployment recommendations.

- `packages/next/src/handler.ts`
  - Why it matters: proves Next handler lazy initialization and default `/dyrected` mount behavior.
  - Trust: high
  - Gap: does not describe every hosting target.

- `packages/nuxt/src/module.ts`
  - Why it matters: proves Nuxt `apiBase` behavior and when the server handler is added.
  - Trust: high
  - Gap: module has some dev-oriented logging and runtime details that are not documentation-grade guidance by themselves.

- `apps/docs/content/new-docs/basics/database/migrations.mdx`
  - Why it matters: established wording for additive schema sync and production schema-change caution.
  - Trust: medium-high
  - Gap: docs source, not implementation.

- `apps/docs/content/new-docs/basics/database/indexes.mdx`
  - Why it matters: established explanation of promotion and query performance.
  - Trust: medium-high
  - Gap: performance page still needs broader operational framing.

- `apps/docs/content/docs/getting-started/production-checklist.mdx`
  - Why it matters: legacy source for rate-limit and hook-hardening guidance.
  - Trust: medium
  - Gap: old docs, not new-docs, and not directly verified against every current implementation detail.

## Uncertainty Register

- `cors` exists in config types, but the current app runtime in `packages/core/src/app.ts` uses `cors()` without reading configured origins. The new deployment docs intentionally avoid documenting a Dyrected-level CORS setup flow.
- `redis` exists in config types, but there is no verified runtime implementation in the current `packages/core/src` code. The performance page intentionally avoids documenting Redis-backed caching as a current production feature.
- Host-specific examples for Vercel, Railway, or Docker were not migrated in this pass because the user asked for the folder to be documented broadly, not for host-by-host platform pages.

## High-Risk Claims To Verify

- Self-hosted SQL adapters sync additively when Dyrected initializes.
- `dyrectedNextHandler` is lazy and does not initialize the Dyrected app during build.
- Cloud schema sync safely skips when credentials are absent.
- The current product does not ship built-in request throttling.

## Review Questions

- Do these pages set the right production expectation for self-hosted deployments, especially around runtime DB readiness?
- Is the "build without a DB connection" framing clear enough, or does it need a more explicit Next-vs-Nuxt distinction?
- Should any host-specific deployment page be added immediately after this baseline set?
