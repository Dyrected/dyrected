# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nuxtjs-quick-start/adding-a-visual-editor-in-nuxtjs.mdx`
- Goal: Explain the first Dyrected visual-preview integration path for a Nuxt route.
- Audience: Developers whose Nuxt pages already render Dyrected content and now need preview and click-to-edit.
- Scope: `previewUrl`, first preview mode, `useLivePreview`, block path mapping, token mode, and success criteria.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/live-preview/frontend`
- Why it was chosen: it teaches the preview contract from the frontend side rather than from schema reference alone.

## Extracted template

1. Preview mental model
2. Required config on the content type
3. Frontend implementation example
4. Notes on advanced or alternate preview modes
5. Validation and next-step guidance

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/adding-a-visual-editor-in-nextjs.mdx` | authored docs | high | Sequence benchmark |
| `apps/docs/content/docs/integrations/nuxt.mdx` | authored docs | high | Existing Nuxt preview examples |
| `apps/docs/content/docs/guides/live-preview.mdx` | authored docs | high | Click-to-edit and route guidance |
| `packages/vue/src/composables/useLivePreview.ts` | package code | high | Actual postMessage preview behavior |
| `packages/nuxt/src/module.ts` | package code | high | Auto-imports for `useDyPath` and `<DyrectedBlocks>` |
| `https://payloadcms.com/docs/live-preview/frontend` | official external docs | high | Structural template only |

## Reader outcome

Reader should understand how preview connects the admin to a real Nuxt route, what the simplest implementation looks like, and when to move from postMessage to token mode.

## Outline

1. Start with the right mental model
2. Set `previewUrl`
3. Start with postMessage mode
4. Add `useLivePreview` to the real route
5. Add click-to-edit
6. When to use token mode
7. Success check

## Reviewer questions

1. Should this quick-start page mention `serverURL` for stricter origin control, or leave that to a deeper preview guide?

## High-risk areas

- preview behavior accuracy
- mode recommendation

- Status: `ready-for-sme-review`
