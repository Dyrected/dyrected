# Review Packet — features/typescript/typescript-plugin.mdx

## Review summary

- Document: TypeScript Plugin
- Goal: Reader understands the current product truth: Dyrected does not ship a dedicated TypeScript language-service plugin today, and should use inference plus generated types instead.
- Audience: Dyrected developers who arrive expecting a Payload-style TypeScript plugin and need an accurate current-status answer without product fiction.
- Scope: Full rewrite of an empty page into an honest status page plus redirection to the real TypeScript workflows Dyrected supports today.

## Source inventory

| Source                                                                                       | Type          | Trust  | Notes                                                                                                 |
| -------------------------------------------------------------------------------------------- | ------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `apps/docs/content/new-docs/features/typescript/typescript-plugin.mdx`                       | current page  | low    | Empty starting point, but the title creates a strong expectation that needed verification.            |
| `apps/docs/DOCS_PHILOSOPHY.md`                                                               | docs standard | high   | Confirms the page should stay task-oriented and human, even when the answer is "this does not exist." |
| `packages/core/src/index.ts`                                                                 | code          | high   | Confirms the inference-first TypeScript tooling Dyrected actually ships today.                        |
| `packages/core/src/types/schema-inference.ts`                                                | code          | high   | Confirms `InferDocShape` as a real public helper.                                                     |
| `packages/sdk/src/index.ts`                                                                  | code          | high   | Confirms `InferSchema` as a real public helper for typed client usage.                                |
| `packages/cli/src/commands/generate-types.ts` and `packages/cli/src/utils/type-generator.ts` | code          | high   | Confirms generated types as the real alternative to a dedicated plugin.                               |
| Repo-wide search for `typescript plugin`, `ts-plugin`, and language-service style contracts  | code search   | high   | No Dyrected-specific TypeScript plugin package or install surface found.                              |
| Payload `https://payloadcms.com/docs/typescript/ts-plugin`                                   | external      | medium | Useful as the comparison point the page title implies, but not a behavior source for Dyrected.        |

## Uncertainty register

| Section         | Claim or gap                                                                                            | Why uncertain                                             | Reviewer needed |
| --------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------- |
| Page naming     | The page keeps the existing slug/title even though Dyrected does not ship the feature that name implies | This is a docs IA question, not a runtime question        | Docs owner      |
| Future-proofing | The page says it should become the canonical install/config page if a plugin ships later                | Sensible editorial guidance, but not a product commitment | Docs owner      |

## Reviewer questions

1. Should this page keep the current slug and title for discoverability, or should the docs IA change later to something like "Editor Tooling" or "TypeScript Tooling"?
2. Is the direct "no plugin today" framing acceptable, or do we want a short callout at the top clarifying that the page name is retained only because the route already exists?

## High-risk areas

- This page could easily drift into invented product behavior. The rewrite avoids that by making the absence of a dedicated plugin the headline fact and redirecting readers to the real supported TypeScript surfaces.
- The title itself is the risk. The review packet calls that out explicitly so the docs owner can decide whether to keep the route for continuity or rename it later.

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY` placeholders remain in the page.

## Suggested status label

`ready-for-sme-review`
