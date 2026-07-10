# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nuxtjs-quick-start/defining-a-schema.mdx`
- Goal: Turn the starter config into a small, Nuxt-friendly schema that matches the real frontend.
- Audience: Developers who finished install and need to shape the first content model.
- Scope: Collections vs globals, first routable collection, preview URL, and keeping the schema behind the frontend's real capabilities.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/configuration/collections`
- Why it was chosen: it teaches the collection mental model first and then moves into the configuration contract.

## Extracted template

1. Why the config file matters
2. Top-level content-model decisions
3. First practical collection example
4. Warnings against over-modeling
5. Validation and next-step guidance

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | repo guidance | high | Voice and step flow |
| `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/defining-a-schema.mdx` | authored docs | high | Sequence benchmark |
| `packages/core/src/types/schema-config.ts` | package code | high | Collection and preview option contract |
| `packages/cli/src/commands/init.ts` | package code | high | Starter config shape |
| `https://payloadcms.com/docs/configuration/collections` | official external docs | high | Structural template only |

## Reader outcome

Reader should understand how to trim the starter config into a small first schema that matches real Nuxt routes and real editor needs.

## Outline

1. Start from `dyrected.config.ts`
2. Keep the first version small
3. Review the scaffold
4. Collections vs globals
5. First `pages` collection
6. Remove anything the frontend cannot render
7. Sync or restart
8. Success check

## Reviewer questions

1. Does the page stop at the right depth before the later custom-pages guide takes over?

## High-risk areas

- starter-config framing
- preview URL example

- Status: `ready-for-sme-review`
