# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/displaying-content-in-nextjs.mdx`
- Goal: Teach the first practical Dyrected-to-Next.js render path.
- Audience: Developers who have schema and data but need the frontend route to render it correctly.
- Scope: Server-side fetch path, common rendering helpers, blocks, recommended first proof path, and next links.

## Payload equivalent

- Closest official Payload page: no clean Payload docs equivalent found
- Supplementary note: this page still follows the same official-doc structure pattern of mental model -> implementation -> escape hatches, but the content is Dyrected-specific because the rendering helpers are package-level features.

## Extracted template

1. Explain the role of the frontend in rendering content
2. Show the recommended data-fetch path
3. Walk one complete example
4. Call out special field shapes and helper components
5. End with a proof-oriented success check

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/managing-data/displaying-content/overview.mdx` | authored docs | high | Canonical renderer mental model |
| `apps/docs/content/new-docs/managing-data/sdk-api/overview.mdx` | authored docs | high | SDK guidance and query shape |
| `packages/next/src/index.ts` | package code | high | Confirms `getDyrectedClient` and Next re-exports |
| `packages/next/src/components/DyrectedImage.tsx` | package code | high | Confirms image helper export |
| `packages/next/src/components/DyrectedMedia.tsx` | package code | high | Confirms media helper export |
| `packages/react/src/components/Blocks.tsx` | package code | high | Confirms block renderer behavior and `path` prop |

## Reader outcome

Reader should know how to fetch one document in a Next.js route, which helper to use for each common structured field type, and how to prove one render path before expanding the site.

## Outline

1. Mental model
2. Recommended fetch path
3. Simple page route example
4. Which renderer to use for common field shapes
5. Rendering blocks
6. Recommended path
7. Escape hatches
8. Success check

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Payload equivalent | No clean Payload analogue for Dyrected's framework rendering helpers | Product feature mismatch rather than factual uncertainty | Confirm gap reporting |

## Reviewer questions

1. Should this quick-start page mention React Server Components explicitly, or is the current Next.js route example enough?
2. Is `getDyrectedClient()` the right default quick-start helper, or should the page start with `createClient()` for transparency?

## High-risk areas

- code example realism
- helper export accuracy
- docs-structure gap reporting

- Status: `ready-for-sme-review`
