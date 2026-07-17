## Review summary

- Document: Next.js server barrel doc-set update
- Goal: Move Next.js server-only examples from `@dyrected/next` or `@dyrected/next/handler` to `@dyrected/next/server`
- Audience: Next.js developers using Dyrected docs, package README readers, and CLI-scaffolded app users
- Scope:
  - `apps/docs/content/docs/ecosystem/integrations/nextjs.mdx`
  - `apps/docs/content/docs/features/live-preview/server-side.mdx`
  - `apps/docs/content/docs/features/live-preview/client-side.mdx`
  - `apps/docs/content/docs/quick-start-guides/nextjs-quick-start/displaying-content-in-nextjs.mdx`
  - `packages/next/README.md`

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/next/src/server.ts` | implementation | high | New canonical server-only barrel |
| `packages/next/src/handler.ts` | implementation | high | Defines `dyrectedNextHandler` |
| `packages/next/src/index.ts` | implementation | high | Confirms root package remains mixed client/server |
| `packages/next/package.json` | package exports | high | Confirms `./server` and `./handler` public subpaths |
| `packages/cli/src/utils/writers.ts` | scaffolding source | high | Confirms new route template import |
| existing MDX pages under `apps/docs/content/docs/` | existing docs | medium | Used to find affected examples and keep voice/structure aligned |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| None | None | None | None |

## Placeholder sweep

No unresolved placeholders.

## Reviewer questions

1. Are there any additional Next.js guides that should switch server-side SDK examples to `@dyrected/next/server`?

## Example consistency

- Primary example: a Next App Router app that mounts Dyrected under `/dyrected` and fetches content in server code.
- The example stays consistent across the updated pages.
- No code placeholders remain beyond normal schema-specific values like collection slugs.

## High-risk areas

- public import-path stability
- generated CLI scaffolding
- server-vs-client import guidance in Next.js docs

## Resolved decisions

- `@dyrected/next/server` is the documented preferred import for server-only Next helpers going forward.
- `@dyrected/next/handler` remains an undocumented compatibility path.

## Dry-run check

- Recommended: create a fresh Next.js app with `dyrected init` and verify the generated route handler compiles under the latest supported Next.js version.

## Canonical links

- The Next.js integration page remains the canonical home for the package-level explanation.
- The quick-start and live-preview pages should link back to that page rather than re-explaining the package boundary in depth.

## Holistic review

- The result is visible early: use `@dyrected/next/server` for route handlers and other server-only helpers.
- Prerequisites still appear before dependent examples.
- Headings and links remain task-oriented.

## Suggested status labels

- `ready-for-sme-review`
