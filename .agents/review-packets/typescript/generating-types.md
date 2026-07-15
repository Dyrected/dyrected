# Review Packet — features/typescript/generating-types.mdx

## Review summary

- Document: Generating Types
- Goal: Reader can run `npx dyrected generate:types`, understand where it reads schema from, choose local-config vs remote-schema generation, and use the generated file with the SDK.
- Audience: Dyrected developers who want a generated TypeScript contract file instead of relying only on direct schema imports and inference.
- Scope: Full rewrite of an empty page into the canonical CLI workflow page for TypeScript generation.

## Source inventory

| Source                                                                | Type          | Trust  | Notes                                                                                                               |
| --------------------------------------------------------------------- | ------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/content/new-docs/features/typescript/generating-types.mdx` | current page  | low    | Empty starting point.                                                                                               |
| `apps/docs/DOCS_PHILOSOPHY.md`                                        | docs standard | high   | Voice and structure guidance.                                                                                       |
| `packages/cli/src/commands/generate-types.ts`                         | code          | high   | Canonical source for flags, defaults, examples, and command wording.                                                |
| `packages/cli/src/commands/init.ts`                                   | code          | high   | Confirms the CLI now adds a `dyrected:generate-types` package script during init.                                   |
| `packages/cli/src/utils/type-generator.ts`                            | code          | high   | Canonical source for source resolution order, generated file shape, type mapping behavior, and output file default. |
| `packages/sdk/src/index.ts`                                           | code          | high   | Confirms `DyrectedSchema` is an appropriate shape to pass to `createClient<TSchema>()` once generated.              |
| `apps/docs/content/new-docs/basics/getting-started/installation.mdx`  | new docs      | high   | Confirms `generate:types` is already recommended as a next step after setup.                                        |
| `packages/sdk/README.md`                                              | package docs  | medium | Supports the high-level positioning of the SDK as a typed client, but not used for behavioral claims.               |
| Payload `https://payloadcms.com/docs/typescript/generating-types`     | external      | medium | Closest live structural equivalent for a generated-types workflow page.                                             |

## Uncertainty register

| Section                        | Claim or gap                                                                               | Why uncertain                                                                                                        | Reviewer needed |
| ------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------- |
| Commit-generated-file guidance | The page says to commit the generated file when the project treats it as a shared contract | Good practical guidance, but that is a workflow recommendation rather than a product requirement                     | Docs owner      |
| Cloud remote generation        | Resolved in this pass: the page no longer claims a verified Dyrected Cloud `--url` flow    | The current generator only appends `/api/schemas` to the passed URL and does not accept Cloud-specific remote inputs | —               |

## Reviewer questions

1. Should this page include a short warning about regenerating after every schema change near the top, or is the current recommendation enough?
2. Is the current emphasis on committing the generated file strong enough now that the docs recommend treating it as a shared contract?

## High-risk areas

- This page is close to implementation details, so the risk is drift if the generator changes. The rewrite keeps claims tight to current command and generator behavior only.
- The page intentionally avoids inventing environment-variable requirements because the command itself does not require special TypeScript env vars; it uses config paths and URLs.
- The earlier Cloud `--url` example was too loose. The page now limits remote generation claims to the verified self-hosted `/api/schemas` flow and treats local config as the safe Cloud-adjacent path for now.

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY` placeholders remain in the page.

## Suggested status label

`ready-for-sme-review`
