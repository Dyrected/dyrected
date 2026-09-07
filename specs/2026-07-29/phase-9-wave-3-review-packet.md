# Phase 9 Wave 3 Runtime IA Review Packet

Status: ready-for-sme-review  
Date: 2026-07-29  
Workflow: `$api-doc-hitl`

## Review Summary

Document set: Dyrected docs runtime IA and canonical path migration.

Goal: reorganize the docs around the architecture-native menu in `dyrected-docs-architecture.md`, make runtime-scoped paths canonical, and remove prelaunch legacy route compatibility.

Audience: developers choosing between Dyrected Cloud as a managed content backend and self-hosted Dyrected as a full runtime-control stack.

Scope: Wave 3 covers IA, canonical paths, runtime metadata, generated recipe placement, high-divergence page splits, search/LLM path outputs, and the no-redirect prelaunch route cleanup. It does not claim every page has had a final SME prose review.

## Source Inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs voice and structure guide | High | Used for practical, developer-first organization and tone. |
| `specs/TODO-2026-07-29/dyrected-docs-architecture.md` | IA source of truth | High | Used for the new top-level menu and reader-task grouping. |
| `specs/TODO-2026-07-29/dyrected-cloud-product-boundary-and-docs-spec.md` | Product boundary spec | High | Used to keep Cloud framed as managed content backend, not arbitrary app backend hosting. |
| `specs/TODO-2026-07-29/phase-9-wave-1-review-packet.md` | Prior HITL packet | Medium | Used for existing Cloud/self-hosted uncertainty and SME decisions. |
| `specs/TODO-2026-07-29/phase-9-wave-2-review-packet.md` | Prior HITL packet | Medium | Used for access-control, recipes, framework split, and ecommerce decisions. |
| `apps/docs/content/docs/**/*.mdx` | Current authored docs | High | Moved, split, and metadata-classified as the migration target. |
| `packages/knowledge/scripts/generate.mjs` | Generated docs pipeline | High | Updated for new recipe/reference paths and runtime-scoped LLM links. |
| `packages/knowledge/generated/docs-runtime-manifest.json` | Runtime manifest | High | Used to verify 251 classified docs entries and runtime availability. |
| `apps/docs/app/docs/**` and `apps/docs/lib/docs-runtime.ts` | Runtime route helpers | High | Used to verify canonical runtime routing and no legacy catch-all redirect route. |
| `packages/core/src/**`, `packages/knowledge/src/**`, `skills/dyrected/SKILL.md` | Source-level docs links and agent prompts | Medium | Updated mechanically where old docs paths were referenced. |

## Migration Summary

The root docs order now matches the architecture-native sequence:

`start-here`, `model-content`, `deliver-content`, `editor-experience`, `admin-and-editors`, `server-runtime`, `authentication`, `publishing-and-workflows`, `content-rules-and-integrations`, `media`, `framework-guides`, `recipes`, `cloud-operations`, `plugins-and-extensions`, `application-patterns`, `infrastructure`, `deployment-and-operations`, `ai-and-coding-agents`, `reference`, `troubleshooting`.

Major section moves:

- Getting started moved to `start-here`.
- Schema, fields, rich text, and configuration moved to `model-content`.
- SDK, REST API, and content delivery moved to `deliver-content`.
- Cloud editor/admin experience moved to `editor-experience`.
- Self-hosted admin customization moved to `admin-and-editors`.
- Self-hosted auth moved to `authentication`.
- Cloud hooks/content rules moved to `content-rules-and-integrations`.
- Self-hosted TypeScript hooks moved to `server-runtime`.
- Workflows, lifecycle events, live preview, drafts, versions, and audit history moved to `publishing-and-workflows`.
- Uploads and storage adapters moved to `media`.
- Cloud-backed and self-hosted Next/Nuxt/React/Vue package pages moved to `framework-guides`.
- Common patterns, examples, ecommerce placeholders, and generated recipes moved to `recipes`.
- Database, environment variables, logging, email, and infrastructure pages moved to `infrastructure`.
- Production deployment and performance moved to `deployment-and-operations`.

## Runtime Split Notes

- Cloud authentication is now represented by `editor-experience/editor-accounts` and focuses on workspace/editor/admin access.
- Self-hosted authentication is now represented by `authentication/**` and keeps collection auth, JWT, cookie, token data, operations, and Admin SSO.
- Cloud hooks are represented by `content-rules-and-integrations/hooks` and `content-rules-and-integrations/cloud-safe-hooks`, with hooks defined as content rules.
- Self-hosted hooks are represented by `server-runtime/hooks/**` and keep unrestricted TypeScript function-hook framing.
- Generated recipes now live under `recipes/<recipe-id>` and carry runtime metadata from recipe source metadata.
- Old prelaunch path compatibility was removed: the legacy `/docs/[...slug]` catch-all route is gone. Old `/docs/<legacy-section>/...` paths may 404.

## Uncertainty Register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Cloud operations | Exact Cloud operations, billing, team, and limit details are still thin. | Public Cloud operational behavior and pricing details need product confirmation. | Product/Cloud SME should confirm before launch. |
| Editor accounts | Cloud editor/admin access wording is accepted for now but not deeply verified against every UI state. | User said current wording is fine, but detailed invitation/team behavior was not independently verified. | Product reviewer should confirm final naming. |
| Framework guides | Next/Nuxt/React/Vue are split into Cloud-backed guides and self-hosted integrations. | The IA is correct, but individual setup commands/examples may need dry-run validation. | Framework owner should dry-run at least Next and Nuxt. |
| Recipes | Generated recipes now have runtime metadata and new paths. | Runtime metadata comes from existing recipe source metadata; some recipe runtime boundaries may need later SME review. | Recipe owner should review function-hook-heavy recipes. |
| Ecommerce | Ecommerce remains placeholder-oriented. | Public ecommerce package behavior is not verified. | Keep placeholder status until package behavior is confirmed. |
| Auth screenshots/UI details | Split auth pages may still mention admin UI behavior from existing docs. | Existing copy was mechanically moved/split before full UI verification. | SME should scan auth pages before public launch. |

## Placeholder Sweep

No `NEEDS-HUMAN-VERIFY`, `NEEDS-SCREENSHOT`, `NEEDS-DIAGRAM`, or `NEEDS-CODE` markers were intentionally left in public docs by this migration.

Known placeholder areas remain as product-scope placeholders, not draft markers:

- `cloud-operations/overview`
- `application-patterns/overview`
- `infrastructure/overview`
- `recipes/ecommerce/**`

## Reviewer Questions

1. Does the new top-level menu match how a first-time developer would choose between managed content backend and runtime ownership?
2. Are Cloud-only sections free of arbitrary backend-hosting implications?
3. Are self-hosted sections discoverable enough for auth, hooks, database, infrastructure, deployment, plugins, and application patterns?
4. Should Cloud operations stay as a lightweight placeholder until pricing/account operations are final?
5. Which framework guide should be dry-run first before launch: Next, Nuxt, React, or Vue?

## Validation

- Passed: `source ~/.zshrc && nvm use 22 >/dev/null && pnpm --dir apps/docs docs:generate`
- Passed: `source ~/.zshrc && nvm use 22 >/dev/null && pnpm --dir apps/docs exec tsc --noEmit`
- Passed: `source ~/.zshrc && nvm use 22 >/dev/null && pnpm --dir apps/docs docs:check`
- Passed outside sandbox: `source ~/.zshrc && nvm use 22 >/dev/null && pnpm --dir apps/docs build`
- Build route evidence: `/docs/[runtime]/[[...slug]]` generated 367 runtime paths; no `/docs/[...slug]` compatibility route remains.
- Manifest evidence: 251 total docs entries, 251 classified, 0 legacy-unclassified; runtime counts are 90 shared, 54 cloud, 82 self-hosted, and 25 variant.
- Runtime split evidence: `authentication/operations` is self-hosted-only and unavailable to Cloud; `editor-experience/editor-accounts` is Cloud-only; Cloud hooks and self-hosted hooks have separate canonical paths.
- LLM evidence: `llm.txt`, `llms.txt`, `llms-cloud.txt`, `llms-self-hosted.txt`, `llms-full-cloud.txt`, `llms-full-self-hosted.txt`, and `llms-full.txt` regenerate without runtime-less `/docs/...` links in emitted AI docs.
- Known warning class: `docs:check` still warns for authored MDX runtime-ambiguous `/docs/...` links. This is allowed by the current migration contract because runtime-aware rendering rewrites them at page render time.

## Suggested Status

`ready-for-sme-review`

Wave 3 is implemented and technically validated. Prose and product-positioning status should remain review-ready, not final, until the Cloud/product/framework owners review the high-risk areas above.
