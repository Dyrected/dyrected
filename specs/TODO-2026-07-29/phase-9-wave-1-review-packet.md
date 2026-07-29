# Phase 9 Wave 1 Docs Migration Review Packet

Status: ready-for-sme-review
Date: 2026-07-29

## Review summary

- Document set: Phase 9 Wave 1 runtime docs migration.
- Goal: make the highest-risk onboarding, runtime-choice, authentication, hooks, workflow-event, and AI-doc surfaces distinguish Dyrected Cloud from self-hosted Dyrected.
- Audience: developers evaluating or implementing Dyrected, plus product/docs reviewers responsible for Cloud and self-hosted positioning.
- Scope: Wave 1 only. This packet covers rewritten or newly added docs pages and generated AI-doc outputs affected by those pages.
- SME feedback incorporated on 2026-07-29: Cloud is confirmed as a managed content backend, not arbitrary application backend hosting; Cloud events/webhooks are still coming soon; Cloud-safe hooks should be called hooks but defined as content rules; React and Vue Cloud-backed setup paths are accurate.
- Follow-up editorial pass incorporated on 2026-07-29: runtime-choice copy now starts from the developer's real decision, not from a feature checklist. Variant pages use runtime-only sections where showing both paths would blur the product boundary.
- SME decisions incorporated on 2026-07-29: Admin SSO is self-hosted-only; `What is Dyrected?` remains shared; Cloud plan-limit docs were verified from `dyrected-pro`; Cloud auth should stay focused on workspace/editor/admin access while self-hosted owns app-user collection auth; Cloud-safe hooks are Jexl-style content rules; lifecycle events/webhooks remain coming soon for Cloud; public docs should link to pricing instead of copying exact tier numbers; high-divergence auth and hooks pages should split in a later wave.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `specs/TODO-2026-07-29/dyrected-cloud-product-boundary-and-docs-spec.md` | Product/docs boundary spec | Medium | Defines Cloud as a managed content backend and self-hosted as the full developer-controlled runtime. Draft status, so product claims still need review. |
| `specs/TODO-2026-07-29/dyrected-docs-architecture.md` | Documentation architecture proposal | Medium | Defines the runtime selector, runtime-scoped URL model, and intended Cloud/self-hosted IA. Draft status, so IA labels should be reviewed. |
| `specs/TODO-2026-07-29/fumadocs-runtime-architecture-implementation-plan.md` | Implementation plan | High | Defines Phase 9 wave ordering, required HITL workflow, and target migration queues. |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs writing standard | High | Used to keep pages task-oriented, outcome-first, practical, and plain-English. |
| Payload documentation structure: authentication, hooks, access control, and Local API | External docs pattern reference | Medium | Used for structure only: concept first, common use cases, practical configuration, then reference detail. No Dyrected product claims were derived from Payload. |
| `dyrected-pro/apps/cloud/src/billing/plans.ts` | Cloud billing source | High | Defines current Cloud plan limits for sites, members, storage, and API request caps. |
| `dyrected-pro/apps/cloud/src/middleware/usage.ts` | Cloud enforcement source | High | Enforces member, storage, and site limits for workspaces. |
| `dyrected-pro/apps/cloud/src/middleware/api-rate-limit.ts` | Cloud enforcement source | High | Enforces daily API request limits where a plan defines `apiRateLimit`. |
| `dyrected-pro/apps/cloud/src/routes/billing.ts` | Cloud API source | High | Exposes public plan limits and usage values to the dashboard. |
| `apps/docs/content/docs/basics/getting-started/what-is-dyrected.mdx` | Existing docs page | High | Rewritten as the shared product orientation with Cloud as recommended starting point and self-hosted as the full-runtime path. |
| `apps/docs/content/docs/basics/getting-started/use-cases.mdx` | Existing docs page | High | Rewritten as a variant page separating Cloud-first content use cases from self-hosted application-runtime use cases. |
| `apps/docs/content/docs/basics/getting-started/cloud-vs-self-hosted.mdx` | New docs page | Medium | New comparison page derived from the product boundary and docs architecture specs. Needs product review before final status. |
| `apps/docs/content/docs/basics/getting-started/choose-a-runtime.mdx` | New docs page | Medium | New decision page derived from the product boundary and docs architecture specs. Needs product review before final status. |
| `apps/docs/content/docs/features/authentication/overview.mdx` | Existing docs page | High | Already classified as `variant`; updated with runtime-specific body copy: Cloud content-workspace access for editors/admins, self-hosted collection auth for application users. Auth details still need product review. |
| `apps/docs/content/docs/features/authentication/handing-off-to-editors.mdx` | Existing docs page | High | Already classified as `variant`; used as existing source for Cloud invitations and self-hosted editor handoff. |
| `apps/docs/content/docs/basics/hooks/overview.mdx` and `apps/docs/content/docs/basics/hooks/cloud.mdx` | Existing docs pages | High | Used to separate Cloud-safe declarative hooks from self-hosted function hooks. |
| `apps/docs/content/docs/features/workflows/lifecycle-events.mdx` and `apps/docs/content/docs/features/workflows/overview.mdx` | Existing docs pages | High | Reframed event docs around Cloud events/webhooks as coming soon and self-hosted handler/dispatcher code as current. |
| Generated `apps/docs/public/llm*.txt` outputs | Generated artifacts | High | Regenerated after content changes; URLs should remain runtime-scoped. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Cloud vs Self-hosted | Cloud owns content infrastructure but Cloud content events/webhooks are not public yet. | SME confirmed the backend boundary and coming-soon status. | Keep docs from implying current Cloud event/webhook availability. |
| Choose a Runtime | React and Vue are Cloud-backed setup paths. | SME confirmed current product direction. | No open issue unless framework docs later change. |
| Authentication overview | Cloud auth is framed as editor/admin access, not app-user collection auth. Admin SSO is now self-hosted-only. | SME confirmed this boundary is acceptable for now. | No Wave 1 blocker. Keep Cloud auth copy from implying hosted customer/member identity. |
| Hooks overview | Public copy should call them hooks, but define Cloud-safe hooks as content rules. | SME confirmed Cloud-safe hooks should be Jexl-style expression hooks. | No Wave 1 blocker. Platform review can later tighten exact hook-family compatibility. |
| Lifecycle events | Cloud events/webhooks are coming soon; self-hosted handlers and dispatcher are current. | SME confirmed Cloud coming-soon status. | No Wave 1 blocker. Platform review can later confirm self-hosted examples remain current. |
| Cloud limits | Cloud plans enforce workspace limits for sites, members on limited plans, pooled media storage, and daily API request volume where capped. | Verified in `dyrected-pro` billing and enforcement code; SME chose link-to-pricing over exact tier numbers in docs. | No Wave 1 blocker. Keep exact numbers on pricing/billing surfaces. |
| Runtime-only MDX sections | Cloud and self-hosted pages now hide some body sections for the opposite runtime. | Body rendering is runtime-aware, but page-level TOC behavior can still be awkward on high-divergence pages. | No Wave 1 blocker. Split auth and hooks into separate runtime-specific pages in Wave 2/3. |
| AI docs outputs | Runtime-scoped AI docs should not emit legacy `/docs/<path>` URLs. | Verified by generation checks, but deployed path availability should be confirmed after release. | Release/docs owner should verify deployment. |

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY`, `NEEDS-SCREENSHOT`, `NEEDS-DIAGRAM`, or `NEEDS-CODE` markers were intentionally left in public docs pages.

Open human-verification work is tracked in the uncertainty register above instead of being embedded in reader-facing docs.

## Reviewer questions

No Wave 1 SME questions remain open after the 2026-07-29 feedback pass.

Deferred follow-up questions:

1. During Wave 2/3, decide the exact split points for auth and hooks runtime-specific pages.
2. After Wave 1 is complete, review whether the menu structure should move to the runtime-first information architecture in `dyrected-docs-architecture.md`.
3. After release, verify deployed AI-doc and runtime-scoped docs URLs.

## Example consistency

- Primary example scenario: a developer adding editable content to a custom website and handing it to editors.
- Runtime distinction: Cloud owns managed content infrastructure; self-hosted owns unrestricted server runtime behavior.
- Examples intentionally avoid using Cloud as a checkout, customer-account, or general SaaS backend.
- Self-hosted examples remain appropriate for hooks, auth collections, database control, custom endpoints, and server integrations.
- Runtime-choice examples avoid framing self-hosted as "for TypeScript hooks" in isolation. The decision is now explained as managed content backend versus CMS inside the app backend.
- Cloud limits are framed as plan fit, not as the main runtime decision.

## High-risk areas

- Cloud-safe hook-family compatibility if the Jexl-compatible subset changes.
- Authentication wording that could imply Cloud hosts customer/member identity.
- Pricing or plan-limit numbers drifting if exact tiers are copied into long-lived docs instead of linking to pricing.
- Lifecycle event wording that could imply Cloud runs arbitrary TypeScript handlers.
- Lifecycle event wording that could imply Cloud events/webhooks are public before launch.
- Runtime page metadata that changes sidebar/search availability before all Wave 2/3 pages are classified.
- Generated AI docs accidentally presenting self-hosted features as Cloud defaults.

## Dry-run check

Recommended before marking this Wave 1 migration final:

- Have one developer start from the docs homepage and choose Cloud for a content-backed website.
- Have another developer start from `Choose a Runtime` and choose self-hosted for arbitrary hooks or application-user auth.
- Record where either reader hesitates, especially around hooks, auth, and lifecycle events.

## Canonical links

- Use `Cloud vs Self-hosted` as the canonical side-by-side comparison.
- Use `Choose a Runtime` as the canonical decision page.
- Use `Cloud-safe hooks` as the canonical compatibility table for Cloud-safe hook behavior.
- Use `Authentication overview` for runtime auth boundaries, then link self-hosted-specific pages for JWT, cookies, token data, and operations.
- Use `Lifecycle events` for event/webhook/handler choice, then link `Editorial workflows` for the workflow state machine.

## Suggested status

`ready-for-wave-1-validation`

The implementation is source-grounded and the main product-boundary questions from the uncertainty register have SME answers. Do not call the migration fully released until generated artifacts and deployed runtime URLs are validated after release.
