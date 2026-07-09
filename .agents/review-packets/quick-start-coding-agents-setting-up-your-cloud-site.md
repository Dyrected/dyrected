## Document purpose

Review packet for `apps/docs/content/new-docs/quick-start-guides/coding-agents-and-ai-app-builders/setting-up-your-cloud-site.mdx`.

Goal: make the Cloud-site page the canonical setup-choice page for AI-builder users before schema work starts.

Page type: configuration guide.

Reader outcome: the reader should understand what a Dyrected Cloud site is, when to use it, which credentials matter, which env vars the current CLI actually writes, and how hosted admin differs from embedded admin.

## Payload equivalent

Closest live Payload docs page: `https://payloadcms.com/docs/getting-started/installation`

Reason: the structure is setup-first and choice-oriented, moving from prerequisites into installation shape and generated files. There was no closer Payload page specifically about a Cloud site plus AI-builder handoff.

## Extracted template

- outcome-first opening
- explain what the setup path gives the reader
- list prerequisites before commands or credentials
- move into the recommended path early
- switch from mental model to concrete setup details
- end with a success check and next page

## Source inventory

- `apps/docs/content/docs/getting-started/quickstart.mdx`
  - High
  - Existing Dyrected quickstart copy for Cloud and AI-builder flow.
- `apps/docs/content/docs/deployment/cloud.mdx`
  - High
  - Existing explanation of hosted vs embedded admin.
- `packages/admin/src/pages/setup/setup-prompt.tsx`
  - High
  - Confirms current setup UI wording, presence of pre-filled prompt flow, and API docs link behavior.
- `packages/admin/src/pages/setup/utils.ts`
  - High
  - Confirms guide URL generation and prompt credential replacement behavior.
- `packages/cli/src/utils/config-templates.ts`
  - High
  - Source of truth for which env vars the current CLI writes into `.env.example`.
- `packages/cli/src/commands/sync-schema.ts`
  - High
  - Confirms runtime fallback env vars supported by `sync:schema`.
- `/Users/busola/Work/dyrected-pro/apps/www/src/app/guide/page.tsx`
  - Medium
  - Product-shape and onboarding framing for the public AI-builder guide.

## Uncertainty register

- The docs say `DYRECTED_URL=https://cloud.dyrected.com` in CLI templates. The public app/dashboard copy often points readers to `app.dyrected.com` and docs copy says "Base URL" rather than a hardcoded API host. The page avoids over-explaining the host relationship.
- I did not claim any exact hosted-admin route beyond Dyrected's hosted dashboard because the docs source focuses on the product decision, not a stable path contract.

## Specific review questions

1. Is the hosted-admin versus embedded-admin split framed clearly enough as a handoff choice rather than a backend choice?
2. Do you want this page to mention the public setup guide URL explicitly, or keep it within the product UI and prompt page?
3. Should the env-var section stay here, or be shortened and linked out once a dedicated environment variables page exists in `new-docs`?

## High-risk claims to verify

- CLI-generated variables:
  - self-hosted: `DYRECTED_URL`, `DYRECTED_API_KEY`, `DYRECTED_SITE_ID`
  - Next.js public vars: `NEXT_PUBLIC_DYRECTED_URL`, `NEXT_PUBLIC_DYRECTED_API_KEY`
  - Nuxt public vars: `NUXT_PUBLIC_DYRECTED_URL`, `NUXT_PUBLIC_DYRECTED_API_KEY`
  - Vite vars: `VITE_DYRECTED_URL`, `VITE_DYRECTED_API_KEY`, `VITE_DYRECTED_SITE_ID`
- "Hosted admin" and "embedded admin" are both valid with the same Cloud backend.

## Screenshot candidates

- `NEEDS-SCREENSHOT`: the Dyrected Cloud site setup screen that shows the prompt entry point.
- `NEEDS-SCREENSHOT`: the site settings area where `Site ID`, `Site API key`, and `Base URL` are visible or explained.

## Status

Review-ready draft. No JSDoc or generator changes required.
