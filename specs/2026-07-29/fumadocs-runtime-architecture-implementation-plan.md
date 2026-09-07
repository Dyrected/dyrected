# Fumadocs Runtime Architecture Implementation Plan

Date: 2026-07-29
Status: Proposed implementation plan
Audience: Docs, platform, frontend

## Requirements Summary

Dyrected will keep Fumadocs and implement the runtime-aware documentation architecture on top of the current `apps/docs` Next.js app.

The plan must produce:

- one docs website
- one persistent runtime selector
- runtime-specific routes:
  - `/docs/cloud/...`
  - `/docs/self-hosted/...`
- shared content where behavior is identical
- runtime-specific content where behavior differs
- runtime-aware navigation, search, internal links, and AI docs outputs

This plan assumes the Cloud product boundary remains unchanged and is already defined in:

- [dyrected-cloud-product-boundary-and-docs-spec.md](/Users/busola/Work/dyrected/specs/TODO-2026-07-29/dyrected-cloud-product-boundary-and-docs-spec.md)
- [dyrected-docs-architecture.md](/Users/busola/Work/dyrected/specs/TODO-2026-07-29/dyrected-docs-architecture.md)

## Decision

Keep Fumadocs.

Do not migrate to another docs platform.

Implement the runtime model by extending the current Fumadocs integration points:

- [apps/docs/app/source.ts](/Users/busola/Work/dyrected/apps/docs/app/source.ts:1)
- [apps/docs/app/docs/layout.tsx](/Users/busola/Work/dyrected/apps/docs/app/docs/layout.tsx:1)
- [apps/docs/app/docs/[[...slug]]/page.tsx](/Users/busola/Work/dyrected/apps/docs/app/docs/[[...slug]]/page.tsx:1)
- [apps/docs/components/client-docs-layout.tsx](/Users/busola/Work/dyrected/apps/docs/components/client-docs-layout.tsx:1)
- [apps/docs/components/docs-sidebar.tsx](/Users/busola/Work/dyrected/apps/docs/components/docs-sidebar.tsx:1)
- [apps/docs/app/api/search/route.ts](/Users/busola/Work/dyrected/apps/docs/app/api/search/route.ts:1)
- [apps/docs/content/docs/meta.json](/Users/busola/Work/dyrected/apps/docs/content/docs/meta.json:1)

## Principles

1. Product boundary first, implementation second.
2. One source of truth for runtime classification.
3. Shared content by default, duplicated pages only when behavior truly differs.
4. Runtime context must flow through route, sidebar, search, and link generation.
5. Migration must stay incremental and releasable.
6. Any substantial docs writing or rewrite phase must use `$api-doc-hitl` and stop at review-ready status until human verification happens.

## Existing Integration Facts

Current implementation already has the right central seams:

- `source` is created once with `baseUrl: '/docs'` in [apps/docs/app/source.ts](/Users/busola/Work/dyrected/apps/docs/app/source.ts:4).
- The docs page route currently resolves all docs pages from one catch-all route in [apps/docs/app/docs/[[...slug]]/page.tsx](/Users/busola/Work/dyrected/apps/docs/app/docs/[[...slug]]/page.tsx:62).
- The docs layout is already wrapped by a custom component in [apps/docs/components/client-docs-layout.tsx](/Users/busola/Work/dyrected/apps/docs/components/client-docs-layout.tsx:13).
- The sidebar is custom and currently derives its structure from the Fumadocs page tree in [apps/docs/components/docs-sidebar.tsx](/Users/busola/Work/dyrected/apps/docs/components/docs-sidebar.tsx:63).
- Search indexing is centralized in one route that maps `source.getPages()` in [apps/docs/app/api/search/route.ts](/Users/busola/Work/dyrected/apps/docs/app/api/search/route.ts:4).
- The docs content tree currently starts from one shared `meta.json` root in [apps/docs/content/docs/meta.json](/Users/busola/Work/dyrected/apps/docs/content/docs/meta.json:1).

These seams are sufficient for the runtime-aware architecture. No platform switch is required.

## Acceptance Criteria

1. `/docs/cloud/...` and `/docs/self-hosted/...` both resolve successfully for the intended pages.
2. The runtime selector is visible on every docs page and switching runtime updates the current page path when an equivalent exists.
3. Sidebar navigation only shows items valid for the selected runtime.
4. Shared pages can render under both runtimes without duplicating MDX files.
5. Runtime-specific pages can diverge in title, description, code examples, and troubleshooting.
6. Search results are scoped to the selected runtime and do not mix incompatible pages.
7. Internal links preserve runtime context by default.
8. AI docs output is runtime-aware and does not present self-hosted capabilities as Cloud defaults.
9. Existing docs URLs either redirect cleanly or retain compatibility until migration is complete.

## Scope

### In scope

- routing
- runtime selector
- content classification
- sidebar generation
- search scoping
- internal link preservation
- page metadata plumbing
- `llms.txt` / AI-doc runtime handling
- phased docs migration
- `$api-doc-hitl` as the required writing workflow for doc authoring and major doc rewrites

### Out of scope

- switching away from Fumadocs
- rewriting all docs copy in one pass
- changing the Cloud product boundary
- full redesign of docs visuals beyond what the runtime selector and nav require

## Work Plan

## Writing Workflow Requirement

Use `$api-doc-hitl` for:

- Phase 8 AI-doc output rewrites when they involve meaningful new framing or restructuring
- Phase 9 content migration waves
- any other substantial docs writing, rewriting, migration-note drafting, or architecture-to-docs translation work in this plan

`$api-doc-hitl` is not required for:

- pure routing work
- source-loader refactors
- sidebar/search/runtime plumbing
- metadata-only changes with no substantive prose rewrite

When `$api-doc-hitl` is used, the execution lane must produce:

1. source inventory
2. draft outline
3. draft document
4. human review packet
5. review-ready status note

The plan must not treat large doc rewrites as final until the human verification gate has happened.

### Phase 1: Define the runtime content model

Goal:
Create the metadata model that lets the docs app know whether a page is shared, Cloud-only, self-hosted-only, or runtime-variant.

Implementation:

1. Add a runtime classification contract for docs pages and sections.
2. Decide where runtime metadata lives:
   - frontmatter on MDX pages
   - section-level metadata in `meta.json`
   - generated manifest in build output
3. Add a normalized runtime manifest step during docs generation so the app can consume one stable structure.
4. Define the page states:
   - `shared`
   - `cloud`
   - `self-hosted`
   - `variant`

Likely files:

- [apps/docs/source.config.ts](/Users/busola/Work/dyrected/apps/docs/source.config.ts:1)
- [apps/docs/content/docs/meta.json](/Users/busola/Work/dyrected/apps/docs/content/docs/meta.json:1)
- `apps/docs/content/docs/**/meta.json`
- docs-generation code referenced by [apps/docs/package.json](/Users/busola/Work/dyrected/apps/docs/package.json:6)

Stop condition:
There is one machine-readable runtime manifest the app can load without guessing from URL names.

### Phase 2: Introduce runtime-aware source loading

Goal:
Move from one undifferentiated Fumadocs source to runtime-aware source access.

Implementation:

1. Replace the single exported `source` in [apps/docs/app/source.ts](/Users/busola/Work/dyrected/apps/docs/app/source.ts:4) with a runtime-aware source layer.
2. Create a helper that can resolve:
   - page tree for `cloud`
   - page tree for `self-hosted`
   - page lookup by runtime + slug
   - fallback/equivalent page lookup when switching runtimes
3. Preserve shared pages as one underlying content source while emitting runtime-scoped URLs.
4. Keep the loader abstraction thin so the rest of the app does not need to know Fumadocs internals.

Suggested new modules:

- `apps/docs/lib/docs-runtime.ts`
- `apps/docs/lib/docs-manifest.ts`
- `apps/docs/app/source.ts` as a thin adapter

Stop condition:
The app can ask for “Cloud page tree” or “Self-hosted page tree” and get the right result.

### Phase 3: Create runtime-specific routes

Goal:
Introduce the canonical runtime-specific URL model.

Implementation:

1. Add runtime-specific docs routes:
   - `app/docs/[runtime]/[[...slug]]/page.tsx`
   - `app/docs/[runtime]/layout.tsx`
2. Keep or temporarily redirect the old `/docs/...` route until migration is complete.
3. Build route validation so only supported runtimes resolve.
4. Make `generateStaticParams()` emit pages per runtime for static generation.
5. Update metadata generation so canonical URLs include runtime context.

Files to change:

- [apps/docs/app/docs/[[...slug]]/page.tsx](/Users/busola/Work/dyrected/apps/docs/app/docs/[[...slug]]/page.tsx:62)
- [apps/docs/app/docs/layout.tsx](/Users/busola/Work/dyrected/apps/docs/app/docs/layout.tsx:1)
- new runtime route files under `app/docs/[runtime]/...`

Stop condition:
The runtime-specific routes become the canonical docs paths.

### Phase 4: Add the persistent runtime selector

Goal:
Make runtime context visible and switchable on every docs page.

Implementation:

1. Add a runtime selector to the docs layout wrapper in [apps/docs/components/client-docs-layout.tsx](/Users/busola/Work/dyrected/apps/docs/components/client-docs-layout.tsx:13).
2. Store current runtime from the route first, not from client-only state.
3. On runtime switch:
   - navigate to the equivalent page if it exists
   - otherwise navigate to that runtime’s landing page or section root
4. Ensure the selector works on desktop and mobile.
5. Keep the selector above or near the sidebar title so it becomes part of normal navigation, not an afterthought.

Files to change:

- [apps/docs/components/client-docs-layout.tsx](/Users/busola/Work/dyrected/apps/docs/components/client-docs-layout.tsx:13)
- [apps/docs/components/docs-sidebar.tsx](/Users/busola/Work/dyrected/apps/docs/components/docs-sidebar.tsx:217)
- likely a new selector component such as `components/runtime-selector.tsx`

Stop condition:
Every docs page clearly exposes the active runtime and switching runtimes works predictably.

### Phase 5: Make the sidebar runtime-aware

Goal:
Show only the navigation tree that applies to the active runtime.

Implementation:

1. Update the layout tree passed from [apps/docs/app/docs/layout.tsx](/Users/busola/Work/dyrected/apps/docs/app/docs/layout.tsx:6) so it is already runtime-filtered before it reaches the sidebar.
2. Keep [apps/docs/components/docs-sidebar.tsx](/Users/busola/Work/dyrected/apps/docs/components/docs-sidebar.tsx:63) focused on presentation rather than runtime filtering logic.
3. Support:
   - shared sections
   - runtime-only sections
   - runtime-equivalent page links
4. Preserve current custom grouping behavior where possible.

Stop condition:
The sidebar does not leak self-hosted-only pages into Cloud navigation or the reverse.

### Phase 6: Preserve runtime context in internal links

Goal:
Prevent users from falling back into runtime-ambiguous paths.

Implementation:

1. Add a runtime-aware link helper for docs-internal links.
2. Rewrite hardcoded `/docs/...` references in MDX over time to route through runtime-aware helpers or transformed paths.
3. Decide how to treat absolute links inside generated outputs such as `llms.txt`.
4. Add a lint or validation pass to detect internal links that drop runtime context.

Likely touchpoints:

- [apps/docs/app/docs/[[...slug]]/page.tsx](/Users/busola/Work/dyrected/apps/docs/app/docs/[[...slug]]/page.tsx:6)
- MDX content under `apps/docs/content/docs/**`
- docs-generation scripts under `apps/docs/scripts/**`

Stop condition:
Internal navigation keeps users inside the chosen runtime unless a cross-runtime comparison page explicitly says otherwise.

### Phase 7: Scope search by runtime

Goal:
Ensure search respects runtime context.

Implementation:

1. Replace the single index built from `source.getPages()` in [apps/docs/app/api/search/route.ts](/Users/busola/Work/dyrected/apps/docs/app/api/search/route.ts:4) with runtime-aware indexing.
2. Choose one of:
   - separate Cloud and self-hosted indexes
   - one index with runtime tags and runtime filtering
3. Pass runtime context from the UI search trigger.
4. Validate that search results link to runtime-specific routes.

Stop condition:
Searching from a Cloud page does not return self-hosted-only operational guidance unless the page is explicitly shared.

### Phase 8: Build the runtime-aware AI docs outputs

Goal:
Make `llms.txt` and related machine-readable docs reflect the same runtime architecture.

Implementation:

1. Keep a shared product preamble based on the Cloud-boundary spec.
2. Decide whether to generate:
   - one shared `llms.txt` with runtime framing and runtime sections
   - runtime-specific AI docs outputs such as:
     - `/llms.txt`
     - `/llms-cloud.txt`
     - `/llms-self-hosted.txt`
3. Use `$api-doc-hitl` for any meaningful rewrite of the AI-doc preamble, runtime descriptions, or machine-readable framing so the new wording is grounded in the product-boundary and docs-architecture specs and ships with a human review packet.
4. Ensure Cloud-facing AI docs do not describe self-hosted capabilities as the default path.
5. Fix the deployed path mismatch noted in the boundary spec.

Likely touchpoints:

- `apps/docs/public/llms.txt`
- `apps/docs/public/llms-full.txt`
- docs-generation scripts

Stop condition:
AI-readable docs follow the same runtime architecture as human-readable docs.

### Phase 9: Migrate content in waves

Goal:
Move the highest-risk mixed-runtime content first.

Workflow requirement:

- Every substantial page rewrite, section split, migration note, or replacement draft in this phase must use `$api-doc-hitl`.
- Each wave should maintain its own source inventory and uncertainty register.
- Each major rewritten page set should produce a human review packet before being treated as complete.

Wave 1:

- homepage / docs landing
- `What is Dyrected?`
- `Cloud vs Self-hosted`
- `Choose a Runtime`
- authentication
- hooks vs rules/events
- quick starts
- `llms.txt`

Wave 2:

- content modeling
- media
- access control
- admin/editor workflows
- framework integrations
- examples

Wave 3:

- reference pages
- troubleshooting
- migration guides
- remaining ecosystem content

### Phase 9 initial migration inventory

This is the starting classification queue for the runtime split. It is intentionally conservative and should be refined during implementation.

#### Shared top-level pages

These should exist above the runtime-specific docs trees or be rendered for both runtimes with nearly identical content:

- `Docs Home`
- `What is Dyrected?`
- `Cloud vs Self-hosted`
- `Choose a Runtime`
- `Supported Frameworks`
- `Changelog`
- `Migration Guides`
- `Status and Known Limitations`
- `Support`

#### Cloud-first or Cloud-only rewrite candidates

These should be prioritized in Wave 1 and Wave 2 because they most directly shape the default product story:

- `basics/getting-started/what-is-dyrected`
- `basics/getting-started/use-cases`
- `quick-start-guides/**/setting-up-your-cloud-site`
- `features/authentication/overview`
- `features/authentication/handing-off-to-editors`
- `ecosystem/common-patterns/access-control`
- `ecosystem/common-patterns/custom-app-surfaces`
- `ecosystem/common-patterns/overview`
- `ecosystem/examples/overview`
- `ecosystem/examples/ecommerce`
- `ecosystem/ecommerce/overview`
- `apps/docs/public/llms.txt`
- `apps/docs/public/llms-full.txt`

Expected classification:

- mostly `cloud` or `variant`
- likely requires `$api-doc-hitl`

#### Self-hosted-first or self-hosted-only candidates

These are the pages most likely to need explicit self-hosted framing because they imply developer-controlled runtime power:

- `basics/hooks/**`
- `basics/database/**`
- `features/authentication/jwt-strategy`
- `features/authentication/cookie-strategy`
- `features/authentication/token-data`
- `features/authentication/__custom-strategies`
- `features/email/overview`
- `ecosystem/plugins/**`
- advanced examples that rely on unrestricted runtime behavior

Expected classification:

- `self-hosted` or `variant`

#### Likely shared content-modeling and editorial pages

These should usually remain shared unless a Cloud/runtime behavior difference forces a split:

- `basics/fields/**`
- `basics/configuration/collections`
- `basics/configuration/globals`
- `basics/getting-started/concepts`
- `features/upload/overview`
- `features/workflows/overview`
- `features/live-preview/overview`
- `features/admin/overview`
- `managing-data/displaying-content/overview`
- framework display/integration guides under:
  - `ecosystem/integrations/**`
  - `quick-start-guides/**/displaying-content-*`
  - `quick-start-guides/**/adding-a-visual-editor-*`

Expected classification:

- mostly `shared`
- some pages may become `variant` if setup, auth, or deployment assumptions differ

#### Likely variant pages

These probably need one conceptual page with runtime-specific sections or separate runtime renderings from shared source:

- `basics/access-control/overview`
- `basics/access-control/collections`
- `basics/access-control/globals`
- `basics/access-control/fields`
- `features/workflows/lifecycle-events`
- `quick-start-guides/**/installing-dyrected`
- `quick-start-guides/**/overview`
- `managing-data/rest-api/overview`
- `managing-data/sdk-api/overview`

Expected classification:

- `variant`

#### Wave mapping

Wave 1 queue:

- `What is Dyrected?`
- `Cloud vs Self-hosted`
- `Choose a Runtime`
- `basics/getting-started/what-is-dyrected`
- `basics/getting-started/use-cases`
- `features/authentication/overview`
- `basics/hooks/overview`
- `features/workflows/lifecycle-events`
- `apps/docs/public/llms.txt`

Wave 2 queue:

- `ecosystem/common-patterns/access-control`
- `ecosystem/common-patterns/custom-app-surfaces`
- `ecosystem/common-patterns/overview`
- `ecosystem/examples/overview`
- `ecosystem/examples/ecommerce`
- `ecosystem/ecommerce/overview`
- `basics/access-control/**`
- `quick-start-guides/**/setting-up-your-cloud-site`

Wave 3 queue:

- remaining `basics/hooks/**`
- remaining `basics/database/**`
- `ecosystem/plugins/**`
- `features/email/overview`
- remaining troubleshooting, reference, and migration pages

#### Inventory maintenance rule

Maintain this inventory as a live migration queue.

For each page or section added to the queue, record:

- current path
- target classification: `shared`, `cloud`, `self-hosted`, or `variant`
- whether `$api-doc-hitl` is required
- current source inputs
- review status
- migration wave

If a page’s runtime classification is uncertain, default it to `variant` until the product-boundary review resolves it.

Migration rule:

- split only when behavior or promise differs
- otherwise keep shared content and render under both runtime paths
- document-writing work in this phase is review-gated, not one-shot

Stop condition:
The highest-confusion pages no longer mix Cloud and self-hosted assumptions.

### Phase 10: Deprecate or redirect the old route model

Goal:
Complete the transition without breaking incoming links abruptly.

Implementation:

1. Add redirects from old generic `/docs/...` pages to the correct runtime-aware destination where the mapping is obvious.
2. For ambiguous pages, redirect to a runtime chooser or comparison page.
3. Update sitemap, canonical metadata, and any public links.

Stop condition:
Runtime-specific URLs are the durable public contract.

## Implementation Order

1. Runtime metadata contract
2. Runtime-aware source layer
3. Runtime-specific routes
4. Runtime selector
5. Runtime-filtered sidebar
6. Runtime-aware internal links
7. Runtime-scoped search
8. Runtime-aware AI docs output
9. Content migration waves
10. Redirect and cleanup

## Risks and Mitigations

### Risk: duplicated content drifts over time

Mitigation:

- default to shared pages
- only split pages when behavior differs materially
- keep runtime metadata explicit

### Risk: route migration breaks existing links

Mitigation:

- keep old routes temporarily
- add tested redirects
- introduce canonical runtime URLs before removing old ones

### Risk: search leaks cross-runtime results

Mitigation:

- add runtime tags to every indexed page
- test search from both runtimes before rollout

### Risk: authors forget runtime metadata

Mitigation:

- add validation in docs generation
- fail the build when required metadata is missing for pages under migrated sections

### Risk: Fumadocs abstractions resist the routing model

Mitigation:

- isolate runtime logic in Dyrected-owned adapters rather than scattering it through page components
- keep the loader, manifest, and route resolution under local control

## Verification Steps

### Build-time verification

- `pnpm --dir apps/docs docs:check`
- route generation succeeds for both runtimes
- runtime manifest validation passes
- no broken internal runtime links

### Runtime verification

- homepage defaults to Cloud
- selector switches to self-hosted on an equivalent page
- sidebar changes by runtime
- search results are runtime-scoped
- shared pages resolve under both runtime URLs
- runtime-specific pages 404 or redirect appropriately when invalid

### Content verification

- Cloud-auth pages only describe editor/admin auth by default
- self-hosted pages can document broader auth/runtime features
- `llms.txt` and related outputs carry the correct boundary framing
- any page rewritten through `$api-doc-hitl` has an attached review packet and is marked final only after human verification

## First Execution Slice

Start with the smallest vertical slice that proves the architecture:

1. Add runtime manifest support.
2. Add `/docs/[runtime]/[[...slug]]` routing.
3. Make one shared page work under both runtimes.
4. Make one Cloud-only page and one self-hosted-only page resolve correctly.
5. Add the selector.
6. Scope search for that slice.

Suggested pilot pages:

- `What is Dyrected?`
- authentication overview
- hooks/rules/events overview

This slice proves the architecture before the full content migration begins.

## Completion Criteria

This plan is complete when:

- runtime-specific docs routing is live
- the selector is persistent
- main navigation and search are runtime-aware
- high-confusion mixed-runtime pages are migrated
- AI docs outputs respect runtime context
- old ambiguous docs paths no longer define the public information architecture

## Explicit Non-Goal

This plan does not evaluate alternative docs frameworks.

The decision to stay on Fumadocs is already made. The work here is to make the current Fumadocs-based app implement the Dyrected runtime architecture cleanly and incrementally.
