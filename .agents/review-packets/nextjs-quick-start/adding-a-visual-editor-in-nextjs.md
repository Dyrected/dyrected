# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/adding-a-visual-editor-in-nextjs.mdx`
- Goal: Explain the first Dyrected visual-preview integration path for a Next.js route.
- Audience: Developers whose Next.js pages already render Dyrected content and now need preview and click-to-edit.
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
| `packages/react/src/hooks/useLivePreview.ts` | package code | high | Actual postMessage preview behavior |
| `packages/react/src/components/Blocks.tsx` | package code | high | Path-aware block rendering |
| `packages/core/src/controllers/preview.controller.ts` | package code | high | Token-mode preview endpoints |
| `packages/core/src/types/schema-config.ts` | package code | high | `previewUrl` and `previewMode` contract |
| `apps/docs/content/new-docs/basics/configuration/collections.mdx` | authored docs | high | Existing preview option guidance |
| `https://payloadcms.com/docs/live-preview/frontend` | official external docs | high | Structural template only |

## Reader outcome

Reader should understand how preview connects the admin to a real frontend route, what the simplest Next.js implementation looks like, and when to move from postMessage to token mode.

## Outline

1. Start with the right mental model
2. The first thing to configure: `previewUrl`
3. Recommended first preview mode
4. A simple postMessage preview component
5. Where click-to-edit comes from
6. When to use token mode
7. Recommended path
8. Escape hatches
9. Success check

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Example integration | The page recommends `postMessage` as the first quick-start preview mode | Package support is clear, but product preference between modes is still editorial | Confirm recommended mode for docs |

## Reviewer questions

1. Do we want this quick-start page to mention preview origin hardening with `serverURL`, or keep that for a later security-focused page?
2. Should token mode stay as an escape hatch here, or become a first-class branch for teams using server-rendered preview routes?

## High-risk areas

- preview behavior accuracy
- mode recommendation
- code example scope

- Status: `ready-for-sme-review`
