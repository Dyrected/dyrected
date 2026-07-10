# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nuxtjs-quick-start/building-landing-pages-for-marketing.mdx`
- Goal: Show how to turn a working Nuxt integration into a controlled landing-page workflow for editors.
- Audience: Developers who already have schema, rendering, and preview working and now want editors to assemble new pages from approved sections.
- Scope: Blocks-based schema, component mapping, page-builder guardrails, and first real editorial workflow.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/fields/blocks`
- Why it was chosen: it is the clearest official Payload page for the flexible-section mental model behind editor-built landing pages.

## Extracted template

1. Product mental model
2. Section-definition strategy
3. Config example
4. Frontend rendering contract
5. Guardrails and validation
6. Success signal and next step

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/building-landing-pages-for-marketing.mdx` | authored docs | high | Flow benchmark |
| `apps/docs/content/docs/guides/building-a-page-builder.mdx` | authored docs | high | Existing blocks/page-builder teaching |
| `apps/docs/content/docs/guides/live-preview.mdx` | authored docs | high | Shared preview and path-scoping guidance |
| `packages/core/src/types/schema-config.ts` | package code | high | Blocks and collection config contract |
| `packages/nuxt/src/module.ts` | package code | high | `<DyrectedBlocks>` registration |
| `https://payloadcms.com/docs/fields/blocks` | official external docs | high | Structural template only |

## Reader outcome

Reader should understand how to let editors build custom pages safely in Nuxt without turning the frontend into an unconstrained page builder.

## Outline

1. Start with the right mental model
2. Choose the approved sections
3. Add the `layout` field
4. Render every approved block
5. Keep the builder controlled
6. Build one real page
7. Success check

## Reviewer questions

1. Is the title strong enough for the Nuxt audience, or should this page be renamed around "custom pages" at the file level too?

## High-risk areas

- editorial framing
- lack of rendered Nuxt code example on this page

- Status: `ready-for-sme-review`
