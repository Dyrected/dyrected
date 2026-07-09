# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/setting-up-your-cloud-site.mdx`
- Goal: Explain how a Next.js team should prepare a Dyrected Cloud site before wiring the rest of the quick start.
- Audience: Developers who want Dyrected Cloud to host the backend for a Next.js app.
- Scope: Cloud purpose, credentials, env variable split, hosted versus embedded admin, and decision checkpoints.

## Payload equivalent

- Closest official Payload page: no clean Payload docs equivalent found
- Fallback structure source: `https://payloadcms.com/docs/getting-started/installation` for setup sequencing only
- Why the gap is noted: Payload docs do not present a close one-to-one page for Dyrected's Cloud-site setup and hosted-versus-embedded admin decision.

## Extracted template

1. Outcome-first framing
2. What this setup changes and what it does not
3. Required credentials
4. Decision branch for editor entry point
5. Success check and next step

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/quick-start-guides/coding-agents-and-ai-app-builders/setting-up-your-cloud-site.mdx` | authored docs | high | Strong existing Cloud page with current terminology |
| `apps/docs/content/docs/deployment/cloud.mdx` | older authored docs | medium | Backend-versus-admin distinction |
| `packages/cli/src/utils/config-templates.ts` | package code | high | Exact Next.js scaffold env vars |
| `packages/cli/src/commands/init.ts` | package code | high | Confirms `.env.example` write behavior |

## Reader outcome

Reader should know what a Cloud site is responsible for, which values to collect, and how to decide between hosted admin and embedded admin before continuing.

## Outline

1. What a Cloud site changes
2. Recommended use case
3. Create the site first
4. Collect the three values that matter
5. What the current Next.js scaffold writes
6. Choose the editor entry point
7. Recommended path
8. Escape hatches
9. Success check

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Payload equivalent | No clean official Payload equivalent | External docs gap rather than code uncertainty | Confirm that reporting the gap is acceptable for this batch |

## Reviewer questions

1. Should this page link directly to any future dedicated Dyrected Cloud reference page once it exists?
2. Do we want a screenshot or settings-location callout in this Next.js-specific version, or reserve that for the broader Cloud guide?

## High-risk areas

- hosted vs embedded admin framing
- env var accuracy
- docs-structure gap reporting

- Status: `ready-for-sme-review`
