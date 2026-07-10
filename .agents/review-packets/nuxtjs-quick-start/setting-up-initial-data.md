# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nuxtjs-quick-start/setting-up-initial-data.mdx`
- Goal: Explain how to avoid a blank first load by using `initialData` for starter records and globals.
- Audience: Developers who already modeled the first schema and want a fresh Nuxt environment to render real content immediately.
- Scope: First-run seeding behavior, collection vs global shape, recommended first seeds, and limits of the feature.

## Payload equivalent

- No clean single-page Payload equivalent.
- Closest official reference used for structure: `https://payloadcms.com/docs/configuration/collections`
- Why it was chosen: `initialData` is a content-model configuration concern, even though the quick-start teaching goal here is more task-oriented than Payload's reference pages.

## Extracted template

1. Outcome and fit
2. Feature mental model
3. Shape differences by content type
4. Recommended first use cases
5. What not to rely on it for
6. Success signal and next step

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/setting-up-initial-data.mdx` | authored docs | high | Flow benchmark |
| `apps/docs/content/new-docs/basics/configuration/collections.mdx` | authored docs | high | Existing `initialData` framing |
| `apps/docs/content/new-docs/basics/configuration/globals.mdx` | authored docs | high | Global config framing |
| `packages/core/src/types/schema-config.ts` | package code | high | Config contract |
| `https://payloadcms.com/docs/configuration/collections` | official external docs | medium | Structural inspiration only |

## Reader outcome

Reader should understand when `initialData` runs, what it is good for, and how to use it to make a first Nuxt render path non-empty.

## Outline

1. Why this exists
2. `initialData` mental model
3. Collections use arrays
4. Globals use one object
5. What to seed first
6. What not to do
7. Success check

## Reviewer questions

1. Is the current quick-start framing enough, or do we need an explicit note about resetting data between local environments?

## High-risk areas

- editorial guidance depth
- lack of a clean Payload equivalent

- Status: `ready-for-sme-review`
