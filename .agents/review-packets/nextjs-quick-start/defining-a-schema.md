# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/defining-a-schema.mdx`
- Goal: Teach the first schema decisions a Next.js quick-start reader should make without turning the page into the full collections reference.
- Audience: Developers who have installed Dyrected and now need a practical first content model.
- Scope: Collections versus globals, top-level options, a minimal example, and the recommended first shape for a Next.js site.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/configuration/collections`
- Why it was chosen: it leads from the collection concept into top-level configuration choices and practical schema structure.

## Extracted template

1. Mental model for the config surface
2. Recommended first shape
3. Key top-level options
4. Practical example
5. When to add more complexity

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/basics/configuration/collections.mdx` | authored docs | high | Canonical collection mental model and `previewUrl` guidance |
| `apps/docs/content/new-docs/basics/configuration/globals.mdx` | authored docs | high | Global mental model |
| `apps/docs/content/new-docs/basics/getting-started/concepts.mdx` | authored docs | high | Config-centered framing |
| `packages/core/src/types/schema-config.ts` | package code | high | Actual contract names and option semantics |
| `packages/cli/src/commands/init.ts` | package code | high | Current starter model used for quick-start examples |
| `https://payloadcms.com/docs/configuration/collections` | official external docs | high | Structural template only |

## Reader outcome

Reader should know what the first safe schema should look like, what `slug`, `fields`, `useAsTitle`, and `previewUrl` do, and what complexity to postpone.

## Outline

1. Start with the site you already have
2. The recommended first shape
3. Collections versus globals
4. Top-level collection options that matter first
5. A practical first example
6. When to add more complexity
7. Recommended path
8. Where to go deeper
9. Success check

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Example shape | `urlPattern` included in the example as a routable hint | The quick-start page is not the canonical home for `urlPattern`, so depth may need tuning | Confirm whether to keep `urlPattern` in the example or defer it |

## Reviewer questions

1. Does this page strike the right boundary between quick-start guidance and the full collections reference?
2. Should the first example introduce blocks at all, or is it better that this page explicitly defers them?

## High-risk areas

- concept-to-config translation
- preview URL guidance
- scope creep into reference material

- Status: `ready-for-sme-review`
