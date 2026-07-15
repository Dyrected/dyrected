# Review Packet — features/typescript/overview.mdx

## Review summary

- Document: TypeScript Overview
- Goal: Reader understands Dyrected's full TypeScript story, when inference is enough, when generated types are the better boundary, and what the recommended path is for a same-repo application.
- Audience: Dyrected developers who want end-to-end type safety but do not yet know how Dyrected's schema inference, SDK typing, and generated file workflow fit together.
- Scope: Full rewrite of an empty page into the canonical overview for TypeScript in Dyrected.

## Source inventory

| Source                                                          | Type          | Trust  | Notes                                                                                                                                           |
| --------------------------------------------------------------- | ------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/content/new-docs/features/typescript/overview.mdx`   | current page  | low    | Empty starting point.                                                                                                                           |
| `apps/docs/DOCS_PHILOSOPHY.md`                                  | docs standard | high   | Voice and page-shape guidance.                                                                                                                  |
| `packages/core/src/index.ts`                                    | code          | high   | Confirms inference behavior of `defineCollection`, `defineGlobal`, `defineField`, and `defineBlock`, including explicit generic escape hatches. |
| `packages/core/src/types/schema-inference.ts`                   | code          | high   | Confirms `InferDocShape` behavior and current inferred field-shape limits.                                                                      |
| `packages/sdk/src/index.ts`                                     | code          | high   | Confirms `InferSchema` contract and intended usage with `createClient<Schema>()`.                                                               |
| `apps/docs/content/docs/reference/sdk.mdx`                      | old docs      | medium | Useful prior explanation of `InferSchema` and typed SDK usage.                                                                                  |
| `apps/docs/content/new-docs/managing-data/sdk-api/overview.mdx` | new docs      | high   | Confirms current typed SDK positioning and cross-link target.                                                                                   |
| `apps/docs/content/new-docs/basics/fields/overview.mdx`         | new docs      | high   | Confirms `InferDocShape` is already a documented public contract.                                                                               |
| `packages/cli/src/commands/generate-types.ts`                   | code          | high   | Confirms the existence of the generated-types workflow that this overview should position, not fully document.                                  |
| Payload `https://payloadcms.com/docs/typescript/overview`       | external      | medium | Closest live structural equivalent for a TypeScript section overview.                                                                           |

## Uncertainty register

| Section                  | Claim or gap                                                                                       | Why uncertain                                                          | Reviewer needed |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------- |
| Recommended path wording | The page recommends inference plus `InferSchema` first, with generated types as the secondary path | This is an editorial recommendation, not an exclusive product contract | Docs owner      |

## Reviewer questions

1. Is the overview drawing the right boundary between the three TypeScript layers: schema inference, SDK typing, and generated files?
2. Is the current level of detail on inference limits and edge cases right for an overview page, or does any of it belong deeper in the `InferSchema` or generated-types pages?

## High-risk areas

- The main risk is overselling inference and hiding the generated-types workflow. The rewrite deliberately names both and explains when each one is the better boundary.
- The page now adds explicit inference limits and edge cases. The remaining editorial risk is overloading the overview instead of keeping it as the strategy page.
- The page avoids promising IDE-specific plugin behavior because that is not currently supported by source evidence.

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY` placeholders remain in the page.

## Suggested status label

`ready-for-sme-review`
