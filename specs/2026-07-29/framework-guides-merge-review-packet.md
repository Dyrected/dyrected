# Framework Guides Merge Review Packet

## Review summary

- Document: Framework Guides merge
- Goal: Merge `Framework Integrations` into `Framework Guides` so developers choose by framework first, then use package-reference pages for Cloud, self-hosted, provider, admin, SDK, and package setup details.
- Audience: Developers integrating Dyrected with Next.js, Nuxt, React, Vue, or the framework-agnostic SDK.
- Scope: Docs IA, moved package-reference pages, package-selection copy, metadata, internal links, generated docs/search/LLM outputs.
- Status: `ready-for-sme-review`

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs writing standard | High | Used for task-oriented structure, progressive depth, package-choice framing, and runtime language. |
| `apps/docs/content/docs/guides/frameworks/**` | Current workflow guides | High | Canonical task flows for setup, schema, rendering, visual editing, and framework onboarding. |
| `apps/docs/content/docs/framework-integrations/**` | Previous package docs | Medium | Source for package map and setup/reference details; moved into package-reference pages and trimmed where examples duplicated workflow guides. |
| `packages/next/src/index.ts`, `server.ts`, `admin.tsx`, `config.ts` | Package implementation | High | Confirms `dyrectedNextHandler`, `getDyrectedClient`, `DyrectedAdmin`, media exports, env defaults, and `withDyrected`. |
| `packages/nuxt/src/module.ts` | Package implementation | High | Confirms module options, relative `apiBase` server handler behavior, auto-imported composables, and auto-registered components. |
| `packages/react/src/index.ts` | Package implementation | High | Confirms provider, hooks, live preview, media, blocks, admin, and SDK re-exports. |
| `packages/vue/src/index.ts` | Package implementation | High | Confirms Vue composables, media/rich-text/blocks components, admin bridge, live preview, and SDK typing exports. |
| `packages/sdk/src/index.ts` | Package implementation | High | Confirms SDK export surface and typed client entrypoints. |
| `specs/TODO-2026-07-29/dyrected-docs-architecture.md` | IA source spec | High | Confirms Framework Guides should be the developer-facing framework section after IA cleanup. |
| `specs/TODO-2026-07-29/phase-9-wave-1-review-packet.md` and Wave 2 notes | Prior migration packets | Medium | Used for runtime boundary continuity and open-review status. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Next.js package reference | Recommended install set includes `@dyrected/core`, `@dyrected/sdk`, `@dyrected/react`, and a database adapter for self-hosted mode. | This matches previous docs and current exports, but package peer/dependency behavior should be checked against the latest package publishing setup. | Package owner should confirm the minimal install command before publication. |
| Next.js and Nuxt package references | Cloud-backed mode uses the same framework packages as remote API clients. | User confirmed React/Vue Cloud-backed paths; Next/Nuxt remote mode is source-supported but should be reviewed against actual Cloud onboarding. | Product/Cloud owner should confirm wording and env names. |
| Admin wrappers | Theme prop names and admin embedding behavior are retained from previous docs and package exports. | Source confirms exported admin wrappers, but exact public prop support should be verified against admin package types and a running example. | Package owner should confirm prop names and required peer dependencies. |
| SDK page | SDK read/write examples remain valid after the IA move. | The SDK exports support typed clients and collection/global APIs, but example payload fields depend on the reader's schema. | Reviewer should confirm examples are clearly illustrative and not presented as universal schema. |
| Vercel Content Link | Unsupported page was deleted with no replacement page. | User requested deletion because the behavior is unsupported. | Reviewer should confirm no current product surface requires a replacement page. |

## Placeholder sweep

- `NEEDS-HUMAN-VERIFY`: none left in authored docs. Open factual checks are captured in this packet.
- `NEEDS-SCREENSHOT`: none.
- `NEEDS-DIAGRAM`: none.
- `NEEDS-CODE`: none.

## Reviewer questions

1. Are the package-reference pages the right depth, or should any remaining admin/provider setup move back into the main framework quick-starts?
2. Are the install commands still accurate for the currently published package dependencies and peer dependencies?
3. Should Cloud-backed Next.js and Nuxt docs recommend `@dyrected/next` and `@dyrected/nuxt` before lower-level SDK usage?
4. Are the environment variable names shown for Next.js and the Vue/React examples the preferred public names?
5. Is deleting the Vercel Content Link page enough, or should there be a short unsupported-feature note elsewhere?

## Example consistency

- Package-reference pages use a content-reading/admin-embedding scenario rather than a full app tutorial.
- Long content rendering examples were removed from package-reference pages and replaced with links to the framework-specific `Displaying Content` guides.
- Admin/theme examples remain on package-reference pages because they are package-boundary details.
- Placeholder environment variables are shown as framework env names, not as real secrets.

## High-risk areas

- Package install commands and peer dependencies.
- Admin wrapper props and required CSS imports.
- Cloud-backed framework recommendations for Next.js and Nuxt.
- Self-hosted server handler behavior in Next.js and Nuxt.
- Generated search/LLM output paths after removing `framework-integrations`.

## Dry-run check

Before publication, have one developer start from `Framework Guides > Choose a Package`, pick their framework, and complete the package setup path from scratch.

Record:

- who ran the dry run
- which framework they used
- whether they could find the package-reference page from the sidebar
- whether the install/setup command worked
- where they expected package details versus task guides
- what changed in the docs afterward

## Canonical links

- Package selection: `/docs/<runtime>/framework-guides/choose-a-package`
- SDK reference page: `/docs/<runtime>/framework-guides/sdk`
- Next.js package reference: `/docs/<runtime>/framework-guides/nextjs/package-reference`
- Nuxt package reference: `/docs/<runtime>/framework-guides/nuxt/package-reference`
- React package reference: `/docs/<runtime>/framework-guides/react/package-reference`
- Vue package reference: `/docs/<runtime>/framework-guides/vue/package-reference`

## Holistic review

- The sidebar should show `Framework Guides` only.
- Developers should no longer need to understand the distinction between "guides" and "integrations" before choosing a framework.
- Package-reference pages should answer "what does this package add?" without duplicating the main setup/rendering tutorials.
- The result remains review-ready, not final, until the SME checks above are complete.
