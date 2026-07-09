# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/setting-up-initial-data.mdx`
- Goal: Teach how `initialData` should be used in a quick-start Next.js project.
- Audience: Developers who want a fresh environment to render meaningful content on first load.
- Scope: First-run seeding behavior, collections versus globals, recommended starter seeds, and misuse boundaries.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/configuration/collections`
- Why it was chosen: Payload's collection configuration page is the closest structural analog for teaching collection-level setup choices before narrowing into one option.

## Extracted template

1. Explain the option's purpose
2. Show the data shape
3. Clarify lifecycle and limitations
4. Recommend common use cases
5. Warn against misuse

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/basics/configuration/collections.mdx` | authored docs | high | Canonical `initialData` guidance for collections |
| `apps/docs/content/new-docs/basics/configuration/globals.mdx` | authored docs | high | Canonical `initialData` guidance for globals |
| `packages/core/src/types/schema-config.ts` | package code | high | Confirms collection/global `initialData` types |
| `https://payloadcms.com/docs/configuration/collections` | official external docs | high | Structural template only |

## Reader outcome

Reader should understand that `initialData` seeds empty collections or globals once, what shapes those values take, and which first-run defaults are worth adding in a Next.js site.

## Outline

1. What `initialData` is for
2. The most important rule
3. Collections use an array
4. Globals use one object
5. What to seed first in a Next.js site
6. What not to do
7. Recommended path
8. Where to go deeper
9. Success check

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| None at source level | No unresolved code-behavior conflict found | The behavior is consistent across code and authored docs | No |

## Reviewer questions

1. Should this quick-start page mention the generated `/seed` endpoints at all, or would that distract from the `initialData` mental model?
2. Do we want one richer example using `navigation` and `settings`, or is the current split between collection and global examples clearer?

## High-risk areas

- first-run lifecycle wording
- collection/global distinction
- overpromising re-seed behavior

- Status: `ready-for-sme-review`
