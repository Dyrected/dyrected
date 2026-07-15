# Integrations Docs Review Packet

## Purpose

Review the new `new-docs/ecosystem/integrations` pages for correctness, package-boundary clarity, and whether the recommended package choices match the product's actual framework surfaces.

## Pages in Scope

- `apps/docs/content/new-docs/ecosystem/integrations/overview.mdx`
- `apps/docs/content/new-docs/ecosystem/integrations/nextjs.mdx`
- `apps/docs/content/new-docs/ecosystem/integrations/nuxt.mdx`
- `apps/docs/content/new-docs/ecosystem/integrations/react.mdx`
- `apps/docs/content/new-docs/ecosystem/integrations/vue.mdx`
- `apps/docs/content/new-docs/ecosystem/integrations/sdk.mdx`
- `apps/docs/content/new-docs/ecosystem/integrations/vercel-content-link.mdx`

## Source Inventory

- `packages/next/src/index.ts`
  - Why it matters: proves exported surface such as `getDyrectedClient` and re-exports.
  - Trust: high
  - Gap: does not by itself show the recommended file structure.

- `packages/next/src/handler.ts`
  - Why it matters: proves default `/dyrected` base path and custom `basePath` support.
  - Trust: high

- `packages/next/src/config.ts`
  - Why it matters: proves the need and effect of `withDyrected`.
  - Trust: high

- `packages/next/README.md`
  - Why it matters: confirms the recommended catch-all route location at `app/dyrected/[...route]/route.ts`.
  - Trust: high

- `packages/nuxt/src/module.ts`
  - Why it matters: proves module auto-imports, component registration, `apiBase` behavior, and dev logging assumptions.
  - Trust: high

- `packages/nuxt/src/runtime/composables/useDyrected.ts`
  - Why it matters: proves the auto-imported composable layer and how the client is constructed.
  - Trust: high

- `packages/react/src/index.ts`, `packages/react/src/components/DyrectedAdmin.tsx`
  - Why it matters: proves React exports and admin wrapper existence.
  - Trust: high

- `packages/vue/src/index.ts`, `packages/vue/src/composables/useDyrected.ts`, `packages/vue/src/components/DyrectedAdmin.vue`
  - Why it matters: proves Vue composables, provider key, and admin bridge shape.
  - Trust: high

- `packages/admin/package.json`
  - Why it matters: proves `react-router-dom` and `@tanstack/react-query` peer requirements for embedded admin usage.
  - Trust: high

## Uncertainty Register

- There is no verified shipped Vercel Content Link package or setup flow in this repo. The page intentionally documents absence of first-class support rather than inventing instructions.
- The Vue-side client provision API is documented via `DYRECTED_CLIENT_KEY` because that is the clearest verified pattern in code. If a higher-level helper should be the preferred public API instead, the package surface may need adjustment or extra docs.

## High-Risk Claims To Verify

- `/dyrected` is the safest documented default mount path for both Next and Nuxt.
- `@dyrected/next` is the recommended package for Next App Router projects.
- `@dyrected/nuxt` can act as either a remote-client module or a self-hosted integration depending on `apiBase`.
- The React admin path depends on `react-router-dom` and `@tanstack/react-query`.

## Review Questions

- Are the recommended package choices strong enough, or should any page push harder against mixing lower-level packages?
- Should the Next page also show the alternate `/api` mounting pattern, or is sticking to `/dyrected` the better docs default?
- Does the Vue page need a second example focused purely on data consumption without the admin bridge?
