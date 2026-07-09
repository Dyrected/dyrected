# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/overview.mdx`
- Goal: Introduce the Next.js quick-start sequence and set expectations for what the guide set delivers.
- Audience: Developers integrating Dyrected into an existing Next.js App Router project.
- Scope: Outcome, sequence, mental model, recommended path, and success signals.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/getting-started/what-is-payload`
- Why it was chosen: it leads with mental model, then explains where Payload fits, then moves readers into the next setup steps.

## Extracted template

1. Outcome-first opening
2. Short explanation of what the product adds to an existing app
3. Step-by-step sequence for the rest of the guide
4. Decision framing around when this path is appropriate
5. Concrete next steps

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | repo guidance | high | Voice, structure, and quick-start writing bar |
| `apps/docs/content/new-docs/basics/getting-started/concepts.mdx` | authored docs | high | Mental model and package framing |
| `apps/docs/content/new-docs/basics/getting-started/installation.mdx` | authored docs | high | Installation sequence and success signals |
| `apps/docs/content/docs/deployment/cloud.mdx` | authored docs | medium | Older Cloud framing still useful for quick-start sequencing |
| `https://payloadcms.com/docs/getting-started/what-is-payload` | official external docs | high | Structural template only |

## Reader outcome

Reader should leave knowing what this quick-start set covers, when it is the right path, and what a successful end state looks like in a Next.js app.

## Outline

1. What this quick start covers
2. Mental model
3. Recommended path
4. Before you begin
5. Success check

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Success framing | Quick-start sequence includes Cloud as an optional first step | Folder structure strongly suggests it, but navigation intent is editorial | Confirm sequence order is preferred for docs IA |

## Reviewer questions

1. Should the overview treat Dyrected Cloud as the default first branch, or keep Cloud and self-host equally weighted?
2. Is the quick-start end state complete enough, or should it explicitly mention deployment as out of scope?

## High-risk areas

- onboarding sequence
- expectation setting
- cross-page navigation

- Status: `ready-for-sme-review`
