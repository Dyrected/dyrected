# Phase 9 Wave 2 Docs Migration Review Packet

Status: ready-for-sme-review
Date: 2026-07-29

## Review summary

- Document set: Phase 9 Wave 2 runtime docs migration.
- Goal: migrate the next highest-risk content surfaces after Wave 1: common patterns, access control, examples/ecommerce, framework integrations, and Cloud-site setup pages.
- Audience: developers choosing between Dyrected Cloud and self-hosted Dyrected while modeling content, permissions, media, workflows, examples, and framework integration.
- Scope: Wave 2 only. This packet does not reorganize the menu, bulk-classify reference pages, or physically split auth/hooks into separate authored files.
- SME feedback carried forward: Cloud is a managed content backend; Cloud auth is workspace/editor/admin access; app-user auth belongs in the app or self-hosted collection auth; Cloud-safe hooks are Jexl-style content rules; Cloud events/webhooks remain coming soon; pricing details should live on pricing/billing surfaces.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `specs/TODO-2026-07-29/fumadocs-runtime-architecture-implementation-plan.md` | Implementation plan | High | Defines Phase 9 Wave 2 queue and runtime classification workflow. |
| `specs/TODO-2026-07-29/dyrected-cloud-product-boundary-and-docs-spec.md` | Product/docs boundary spec | Medium | Defines Cloud as managed content backend and self-hosted as developer-controlled runtime. |
| `specs/TODO-2026-07-29/dyrected-docs-architecture.md` | Documentation architecture proposal | Medium | Defines runtime-scoped docs model and future IA direction. |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs writing standard | High | Used for task-oriented, runtime-aware wording. |
| `specs/TODO-2026-07-29/phase-9-wave-1-review-packet.md` | Prior SME decision log | High | Carries forward resolved Wave 1 decisions about auth, hooks, lifecycle events, pricing, and IA deferral. |
| `apps/docs/content/docs/basics/access-control/**` | Wave 2 docs pages | High | Migrated to explicit runtime metadata; Cloud page is Cloud-only, model pages are variants. |
| `apps/docs/content/docs/ecosystem/common-patterns/**` | Wave 2 docs pages | Medium | Migrated common pattern pages with runtime notes where examples may depend on Cloud-safe rules or self-hosted runtime behavior. |
| `apps/docs/content/docs/ecosystem/examples/**` | Wave 2 docs pages | Medium | Coming-soon examples reframed around content boundaries; ecommerce and booking are variants. |
| `apps/docs/content/docs/ecosystem/ecommerce/overview.mdx` | Wave 2 docs page | Medium | Coming-soon ecommerce section reframed so Cloud means catalog/content/merchandising, not checkout or customer identity. |
| `apps/docs/content/docs/ecosystem/integrations/**` | Wave 2 docs pages | High | Classified framework/package integration pages; Next/Nuxt are variants, React/Vue/SDK are shared clients. |
| `apps/docs/content/docs/quick-start-guides/**/setting-up-your-cloud-site.mdx` | Wave 2 docs pages | Medium | Classified Cloud-site setup pages as Cloud-only. |

## Migration summary

| Area | Runtime decision | Notes |
| --- | --- | --- |
| Access control overview, collections, globals, fields | `variant` | Same concept exists in both runtimes, but Cloud must use serializable rules while self-hosted may use function rules. |
| Dyrected Cloud access control | `cloud` | This page is only useful in Cloud runtime docs. |
| Common pattern overview, content modeling, admin experience | `shared` | Content/editor modeling guidance applies to both runtimes with no major behavior split. |
| Common pattern access control, data lifecycle, integrations, workflows, custom app surfaces | `variant` | Pages now state where Cloud-safe schema data stops and self-hosted runtime behavior begins. |
| Examples overview and knowledge base | `shared` | Roadmap/learning guidance applies to both runtimes. |
| Ecommerce and booking examples | `variant` | Cloud framing is content-side only; self-hosted can later own deeper app/backend behavior. |
| Ecommerce overview | `variant` | Placeholder now keeps commerce backend claims out of Cloud. |
| Framework integrations overview, Next.js, Nuxt | `variant` | Backend boundary differs. |
| React, Vue, SDK integrations | `shared` | They can consume Cloud-backed or self-hosted APIs. |
| Cloud-site setup pages | `cloud` | These are Cloud-only preflight pages. |
| Cloud-safe hooks page | `cloud` | Classified while touching Wave 2 because it is the canonical Cloud hook compatibility page. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Auth/hooks split | Wave 1 SME feedback favored splitting high-divergence auth and hooks pages. | Wave 2 queue did not require physical page splits, and the runtime-aware page model still supports variant sections. | Treat as first Wave 2/3 IA task after this migration validation. |

## SME confirmations

| Item | Decision | Follow-up applied |
| --- | --- | --- |
| Cloud access-control built-ins | Current built-in policy list is confirmed. | Kept the Cloud built-in policy table as authoritative for Wave 2. |
| Cloud access-control examples | Cloud docs should not show function examples. | Rewrote the Cloud access-control page around Jexl strings, serializable policies, and built-in Cloud policies only. Runtime variant pages now hide function examples from Cloud readers. |
| Self-hosted access-control examples | Self-hosted can keep the current copy, tables, and explanations. | Preserved function examples, function-policy explanations, tabs, and generated recipes behind `SelfHostedOnly` sections. |
| Generated recipes | Recipes need runtime metadata before Wave 3, especially recipes that use function hooks. | Add recipe-level runtime classification before exposing recipe examples broadly in Cloud runtime docs. |
| Next/Nuxt integration pages | Split Next.js and Nuxt integration pages into Cloud-backed and self-hosted authored pages during the IA/menu restructure. | Treat the current variant wrappers as temporary until the restructure. |
| Ecommerce examples | Keep ecommerce docs at placeholder status until the public ecommerce package behavior is verified. | Do not add implementation-level ecommerce claims yet. |

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY`, `NEEDS-SCREENSHOT`, `NEEDS-DIAGRAM`, or `NEEDS-CODE` markers were intentionally added to public docs pages.

Open verification work is tracked in the uncertainty register and follow-up decisions above instead of being embedded in reader-facing docs.

## Resolved follow-up decisions

1. Add runtime metadata to generated recipes before Wave 3.
2. Split Next.js and Nuxt integration docs into Cloud-backed and self-hosted pages during the IA/menu restructure.
3. Keep ecommerce docs as placeholders until public ecommerce package behavior is verified.

## High-risk areas

- Cloud docs accidentally implying Dyrected Cloud runs function access rules, function hooks, or arbitrary backend code.
- Example pages accidentally implying Cloud owns checkout, payments, carts, orders, customer accounts, or transactional scheduling logic.
- Generated recipes surfacing self-hosted-only implementation details inside Cloud runtime pages.
- Framework pages becoming hard to scan because runtime-specific sections share one authored page.

## Suggested status

`ready-for-sme-review`

Wave 2 has explicit runtime metadata and source-grounded copy updates. The Cloud access-policy built-ins and remaining Wave 2 follow-up decisions are now SME-confirmed; recipe runtime classification, Next/Nuxt page splits, and ecommerce implementation docs move into follow-up implementation work.
