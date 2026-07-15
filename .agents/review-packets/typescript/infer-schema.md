# Review Packet — features/typescript/infer-schema.mdx

## Review summary

- Document: InferSchema
- Goal: Reader understands how to derive a typed SDK schema from exported Dyrected collection and global constants, when that workflow is the best fit, and where its limits are.
- Audience: Dyrected developers whose schema and application code live in the same repo and who want typed SDK usage without generating a separate file.
- Scope: New page added to cover the same-repo typed SDK path that sits between the overview page and the generated-types workflow.

## Source inventory

| Source                                                            | Type          | Trust  | Notes                                                                                       |
| ----------------------------------------------------------------- | ------------- | ------ | ------------------------------------------------------------------------------------------- |
| `apps/docs/content/new-docs/features/typescript/infer-schema.mdx` | current page  | low    | New page drafted in this pass.                                                              |
| `apps/docs/DOCS_PHILOSOPHY.md`                                    | docs standard | high   | Voice and teaching-shape guidance.                                                          |
| `packages/sdk/src/index.ts`                                       | code          | high   | Confirms `InferSchema` is exported from `@dyrected/sdk` and intended for `createClient<T>`. |
| `packages/core/src/index.ts`                                      | code          | high   | Confirms schema constants are created through `defineCollection` and `defineGlobal`.        |
| `packages/core/src/types/schema-inference.ts`                     | code          | high   | Confirms adjacent inference helpers and the boundary between config-time and SDK typing.    |
| `apps/docs/content/docs/reference/sdk.mdx`                        | old docs      | medium | Useful prior explanation of typed SDK usage from exported schema constants.                 |
| `apps/docs/content/new-docs/features/typescript/overview.mdx`     | new docs      | high   | Confirms positioning of this page in the section flow.                                      |
| Payload `https://payloadcms.com/docs/typescript/overview`         | external      | medium | Used only as structural influence for mental-model-first teaching flow.                     |

## Uncertainty register

| Section                  | Claim or gap                                                        | Why uncertain                                                                      | Reviewer needed |
| ------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| Recommended-path wording | The page recommends `InferSchema` as the default same-repo SDK path | This is a docs recommendation based on current ergonomics, not a mandate           | Docs owner      |
| Slug-key emphasis        | The page stresses exact key-to-slug matching in the schema map      | The behavior is consistent with SDK usage, but the docs framing is still editorial | Docs owner      |

## Reviewer questions

1. Is the current boundary between `InferSchema` and generated types clear enough, or do we want an even sharper "same repo vs file boundary" framing?
2. Should this page eventually include a short relationship-field example, or is the current generic explanation enough for now?

## High-risk areas

- The biggest risk is collapsing `InferSchema` and generated types into one workflow. The page keeps that boundary explicit and teaches when each approach is better.
- The page avoids claiming that `InferSchema` solves runtime population typing or every config-authoring inference case. Those limits are called out directly.

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY` placeholders remain in the page.

## Suggested status label

`ready-for-sme-review`
