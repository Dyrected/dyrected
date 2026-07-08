# Review Packet — basics/access-control/collections.mdx

## Review summary

- Document: Collection Access Control (configuration guide).
- Goal: Reader can set `read`/`create`/`update`/`delete` rules on a collection, knows which HTTP method each guards, and has copy-paste recipes for the common setups.
- Audience: Developers configuring collections.
- Starting point: Empty stub (`title: Collections`). From-scratch draft grounded in verified core behavior.
- Structure source: Payload `access-control/collections` (Config Options → Create → Read → Update → Delete). Reused shape; original wording; Dyrected behavior.

> The five cross-cutting, security-relevant findings (function-form deny, no object row-filter, no `doc`/`data`, field access is UI-only, open-by-default) are documented in full in **access-control-overview.md**. This packet lists only what is specific to this page.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/router.ts` L487-500 | code | high | Route→access-key mapping: `GET`→read, `POST`→create, `PATCH`→update, `DELETE`→delete; `accessGate` per op. |
| `packages/core/src/controllers/collection.controller.ts` (find L88-190, findOne L192-259, update, delete) | code | high | Confirms CRUD paths never re-check `collection.access` and never apply object→`where`. |
| `packages/core/src/utils/config.ts` L138-190 | code | high | Scaffolded `roles` field (`admin`/`editor`/`viewer`) — basis for the role recipes. |
| `packages/next/src/handler.ts` L21-28 | code | high | API mounted under configurable `basePath` (default `/dyrected`) — reason the doc shows HTTP methods, not absolute URLs. |
| Payload `access-control/collections` | external | medium | Structure only. |

## Uncertainty register — this page

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| How operations map to requests | Table shows HTTP method → access key, no absolute path. | Deliberate: the public path depends on `basePath` (default `/dyrected`), so `/api/collections/:slug` is the internal route, not the URL a user calls. Confirm reviewers are OK omitting the path here and linking to an API-routes page instead. | Docs owner |
| What a collection rule receives | "Rules do not receive the target document or request body." (finding #3) | Verified against `router.ts:30`. The `AccessFunction` type still advertises `doc`/`data`, so this reads as a limitation. | SME (finding #3) |
| Common setups → Contact form | `update: false`, `delete` admin-only. | Behavior verified; just confirm this is the pattern we want to recommend for lead capture. | Docs owner |

## Placeholder sweep

One intentional `{/* NEEDS-HUMAN-VERIFY … */}` comment in the "What a collection rule receives" `<Warning>` (finding #3). Invisible when rendered.

## Reviewer questions

1. Is omitting absolute API paths (showing HTTP method only) the right call for these pages, or do we want a canonical "API routes" reference to link to?
2. For per-document ownership, the draft points readers to [collection hooks](/new-docs/basics/hooks/collections) + a client-side `where` filter. Confirm that hooks are the intended enforcement path today (given collection rules can't see the doc).
3. Are the four recipe tabs (Public blog / Contact form / Role tiers / Locked down) the right set?

## Example consistency

- All recipes use `user.roles` role checks and the scaffolded `admin`/`editor`/`viewer` roles consistently. No function-form or object-return examples (per findings #1/#2).

## High-risk areas

- The "ownership rules can't be expressed as collection access" warning is the load-bearing correctness statement on this page. If finding #3 is fixed later, this warning must be revised.

## Canonical links

- Links inward to overview for the model; outward to configuration/collections and hooks for depth. No re-explanation of the core model. Correct.

## Suggested status label

`ready-for-sme-review`
