# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nuxtjs-quick-start/displaying-content-in-nuxtjs.mdx`
- Goal: Explain the first real Nuxt render path for Dyrected content.
- Audience: Developers whose schema and initial data already exist and now need to render content in Nuxt.
- Scope: Nuxt composables, first route example, helper components, blocks rendering, and success criteria before preview.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/getting-started/rendering-content`
- Why it was chosen: it focuses on the frontend rendering contract rather than on schema reference alone.

## Extracted template

1. Rendering mental model
2. Recommended data-fetch path
3. First complete route example
4. Common renderer helpers
5. Layout rendering pattern
6. Validation and next-step guidance

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/displaying-content-in-nextjs.mdx` | authored docs | high | Flow benchmark |
| `apps/docs/content/new-docs/managing-data/displaying-content/overview.mdx` | authored docs | high | Existing renderer guidance |
| `packages/nuxt/src/runtime/composables/useDyrected.ts` | package code | high | Actual Nuxt fetch helpers |
| `packages/nuxt/src/module.ts` | package code | high | Auto-imported components and `@nuxt/image` behavior |
| `https://payloadcms.com/docs/getting-started/rendering-content` | official external docs | medium | Structural template only |

## Reader outcome

Reader should understand how to fetch and render one real Nuxt route from Dyrected content before moving into preview.

## Outline

1. The rendering mental model
2. Recommended fetch path
3. First route example
4. Which renderer to use for common fields
5. Rendering blocks
6. Recommended path
7. Escape hatches
8. Success check

## Reviewer questions

1. The page recommends `useDyrectedCollection` first for slug-driven routes. Is that the clearest default for Nuxt quick starts, or should it start from the raw client instead?

## High-risk areas

- example accuracy
- official Payload URL availability

- Status: `ready-for-sme-review`
