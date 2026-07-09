# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/installing-dyrected.mdx`
- Goal: Explain the current Next.js install path and the scaffold files a developer should expect.
- Audience: Developers adding Dyrected to an existing Next.js App Router app.
- Scope: Requirements, CLI flow, generated files, generated environment variables, and first-boot verification.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/getting-started/installation`
- Why it was chosen: it starts with prerequisites, then shows the install command, then explains what the setup produces.

## Extracted template

1. Outcome and framing
2. Requirements
3. Install command
4. Generated files and what they do
5. Verification steps

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | repo guidance | high | Voice and quick-start structure |
| `apps/docs/content/new-docs/basics/getting-started/installation.mdx` | authored docs | high | Existing installation narrative |
| `packages/cli/src/commands/init.ts` | package code | high | Actual CLI prompts, file writes, starter config, and output flow |
| `packages/cli/src/utils/writers.ts` | package code | high | Exact Next.js file paths and App Router requirement |
| `packages/cli/src/utils/config-templates.ts` | package code | high | Actual `.env.example` variables written today |
| `https://payloadcms.com/docs/getting-started/installation` | official external docs | high | Structural template only |

## Reader outcome

Reader should understand exactly what `npx dyrected init` does in Next.js, which files it writes, and how to verify the installation before changing the schema.

## Outline

1. What gets installed into a Next.js app
2. Requirements
3. Run the installer
4. What the CLI writes
5. What the current scaffold puts in `.env.example`
6. What the starter config gives you
7. Recommended first boot
8. Escape hatches
9. Success check

## Reviewer questions

1. The page now explains that the shared scaffold writes both local-first and Cloud-oriented values, but the reader should treat them differently depending on the backend path. Does that level of distinction feel right for a quick start?
2. The page now mentions `dyrected:sync-schema` and the postbuild sync hook as orientation, not as a full workflow. Is that the right depth here?

## High-risk areas

- generated file paths
- env var accuracy
- App Router requirement
- sync-script framing

- Status: `ready-for-sme-review`
