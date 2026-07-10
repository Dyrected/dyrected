# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nuxtjs-quick-start/installing-dyrected.mdx`
- Goal: Explain the current Nuxt install path and the scaffold files a developer should expect.
- Audience: Developers adding Dyrected to an existing Nuxt 3 app.
- Scope: Requirements, CLI flow, Cloud vs self-hosted branching, generated files, generated environment variables, and first-boot verification.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/getting-started/installation`
- Why it was chosen: it starts with prerequisites, then shows the install path, then explains what the setup produces.

## Extracted template

1. Outcome and framing
2. Requirements
3. Recommended install path
4. Alternate install path
5. Generated files and variables
6. Verification steps

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | repo guidance | high | Voice and quick-start structure |
| `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/installing-dyrected.mdx` | authored docs | high | Branching and cloud-first flow benchmark |
| `packages/cli/src/utils/writers.ts` | package code | high | Exact Nuxt file paths and `nuxt.config.ts` patching |
| `packages/cli/src/utils/config-templates.ts` | package code | high | Actual `.env.example` variables written today |
| `packages/cli/src/commands/init.ts` | package code | high | Sync-script guidance and CLI flow |
| `packages/nuxt/src/module.ts` | package code | high | How local `apiBase` mounts in self-hosted mode |
| `https://payloadcms.com/docs/getting-started/installation` | official external docs | high | Structural template only |

## Reader outcome

Reader should understand exactly what `npx dyrected init` does in Nuxt, which path to pick first, which files it writes, and how to verify the installation before changing the schema.

## Outline

1. Cloud-first framing
2. Requirements
3. Cloud install steps
4. Self-hosted install steps
5. Starter config orientation
6. Short troubleshooting
7. Success check

## Reviewer questions

1. The page calls out the `NUXT_PUBLIC_DYRECTED_SITE_ID` template difference explicitly for self-hosted installs. Is that the right level of detail for this quick start?
2. Should the self-hosted section mention the default `/dyrected` path more aggressively, or is the current explanation enough?

## High-risk areas

- generated file paths
- env var accuracy
- Cloud vs self-hosted distinctions

- Status: `ready-for-sme-review`
