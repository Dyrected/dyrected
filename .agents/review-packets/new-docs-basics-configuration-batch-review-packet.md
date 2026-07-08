# Configuration Docs Batch Review Packet

Scope: `apps/docs/content/new-docs/basics/configuration/*.mdx`

Status: `ready-for-sme-review`

## Overview

### 1. Payload equivalent

- `https://payloadcms.com/docs/configuration/overview`

### 2. Extracted template

- outcome-first intro
- explain the root config file
- show a minimal config example
- enumerate common top-level keys
- route readers to deeper topic pages

### 3. Source inventory

| Source | Why it matters | Trust |
| --- | --- | --- |
| `apps/docs/content/docs/reference/configuration.mdx` | Canonical Dyrected config behavior and examples | High |
| `apps/docs/content/docs/getting-started/quickstart.mdx` | Setup framing and collections/globals guidance | High |
| `packages/core/src/types/app-config.ts` | Public `DyrectedConfig` contract | High |

### 4. Outline

- what `dyrected.config.ts` controls
- minimal config
- collections vs globals
- common top-level keys
- practical rules
- next steps

### 5. Draft MDX

- [overview.mdx](/Users/busola/Work/dyrected/apps/docs/content/new-docs/basics/configuration/overview.mdx)

### 6. Review packet

- Verify the selected top-level keys reflect the intended public docs priority.
- Confirm whether `image`, `redis`, `events`, and `adminAuth` belong in this beginner-facing overview.
- Check that the Cloud-versus-self-hosted framing matches current product language.

### 7. Status

- `ready-for-sme-review`

## Collections

### 1. Payload equivalent

- `https://payloadcms.com/docs/configuration/collections`

### 2. Extracted template

- define the concept
- show a simple config example
- explain what the framework generates automatically
- describe common options
- end with decision guidance and related links

### 3. Source inventory

| Source | Why it matters | Trust |
| --- | --- | --- |
| `apps/docs/content/docs/reference/configuration.mdx` | Collection config semantics and admin options | High |
| `apps/docs/content/docs/concepts/collections-and-globals.mdx` | Collection mental model and examples | High |
| `apps/docs/content/docs/reference/rest-api.mdx` | Confirms generated route families | High |

### 4. Outline

- what a collection is
- generated surfaces
- when to use one
- common options
- practical habits

### 5. Draft MDX

- [collections.mdx](/Users/busola/Work/dyrected/apps/docs/content/new-docs/basics/configuration/collections.mdx)

### 6. Review packet

- Confirm the "generated automatically" list matches current collection capabilities.
- Verify whether workflow and audit logging belong in this page or should stay on later feature pages.
- Check whether `pages` is still the right beginner example alongside posts and products.

### 7. Status

- `ready-for-sme-review`

## Globals

### 1. Payload equivalent

- `https://payloadcms.com/docs/configuration/globals`

### 2. Extracted template

- define singleton content
- show a minimal global example
- explain generated API and admin behavior
- contrast globals with collections
- describe common options and patterns

### 3. Source inventory

| Source | Why it matters | Trust |
| --- | --- | --- |
| `apps/docs/content/docs/reference/configuration.mdx` | Global config semantics | High |
| `apps/docs/content/docs/concepts/collections-and-globals.mdx` | Global decision rule and examples | High |
| `apps/docs/content/docs/guides/globals-and-site-settings.mdx` | Common site-settings and navigation patterns | High |

### 4. Outline

- what a global is
- generated surfaces
- when to use one
- common options
- common patterns

### 5. Draft MDX

- [globals.mdx](/Users/busola/Work/dyrected/apps/docs/content/new-docs/basics/configuration/globals.mdx)

### 6. Review packet

- Confirm the selected examples match the intended entry-level guidance.
- Verify whether footer and theme settings should remain examples or move to a recipe-level page later.
- Check that the contrast with collections is strong enough for first-time readers.

### 7. Status

- `ready-for-sme-review`

## Environment Variables

### 1. Payload equivalent

- `https://payloadcms.com/docs/configuration/environment-vars`

### 2. Extracted template

- explain why env vars exist
- show where env files live
- group variables by purpose
- give framework-specific examples
- end with operational rules

### 3. Source inventory

| Source | Why it matters | Trust |
| --- | --- | --- |
| `apps/docs/content/docs/integrations/nextjs.mdx` | Next.js env names and admin auto-read behavior | High |
| `apps/docs/content/docs/integrations/nuxt.mdx` | Nuxt env names and public runtime config behavior | High |
| `packages/next/src/index.ts` | Confirms Next.js env fallback order | High |
| `packages/nuxt/src/module.ts` | Confirms Nuxt public env names | High |
| `apps/docs/content/docs/guides/adding-authentication.mdx` | Confirms `DYRECTED_JWT_SECRET` guidance | High |

### 4. Outline

- env file placement
- API base URL
- API keys
- site ID
- database and provider secrets
- Next.js example
- Nuxt example
- practical rules

### 5. Draft MDX

- [environment-variables.mdx](/Users/busola/Work/dyrected/apps/docs/content/new-docs/basics/configuration/environment-variables.mdx)

### 6. Review packet

- Verify the public-versus-server key guidance matches the current security posture.
- Confirm whether `NEXT_PUBLIC_SITE_ID` should stay as written or align to a different naming convention.
- Check whether the page should mention CLI-generated `ENCRYPTION_KEY` or leave it to framework-specific setup docs.

### 7. Status

- `ready-for-sme-review`

## I18n

### 1. Payload equivalent

- `https://payloadcms.com/docs/configuration/i18n`

### 2. Extracted template

- Payload provides a full feature page
- Dyrected currently has no matching public contract
- convert the page into an explicit documentation gap marker instead of inventing feature behavior

### 3. Source inventory

| Source | Why it matters | Trust |
| --- | --- | --- |
| `packages/core/src/types/app-config.ts` | Confirms no public `i18n` root key | High |
| `apps/docs/content/docs/reference/configuration.mdx` | Confirms canonical config docs omit `i18n` | High |
| `packages/core/src/types/schema-config.ts` | Shows the narrow preview `locale` context only | High |

### 4. Outline

- what is missing today
- what is verified
- what docs cannot claim yet
- SME review questions

### 5. Draft MDX

- [i18n.mdx](/Users/busola/Work/dyrected/apps/docs/content/new-docs/basics/configuration/i18n.mdx)

### 6. Review packet

- Confirm whether admin interface translation support exists in any public package.
- If it exists, identify the owning package, config key, and reader-visible behavior.
- Decide whether this page should stay unpublished until the contract is documented.

### 7. Status

- `ready-for-sme-review`

## Localization

### 1. Payload equivalent

- `https://payloadcms.com/docs/configuration/localization`

### 2. Extracted template

- Payload provides a full multilingual content page
- Dyrected currently has no matching public localization contract
- keep the rewrite as a review-only gap page

### 3. Source inventory

| Source | Why it matters | Trust |
| --- | --- | --- |
| `packages/core/src/types/app-config.ts` | Confirms no public `localization` root key | High |
| `apps/docs/content/docs/reference/configuration.mdx` | Canonical config docs do not define localization behavior | High |
| `packages/core/src/types/schema-config.ts` | Narrow preview `locale` context does not establish localization support | High |

### 4. Outline

- missing public contract
- verified constraints
- why the page stays narrow
- SME review questions

### 5. Draft MDX

- [localization.mdx](/Users/busola/Work/dyrected/apps/docs/content/new-docs/basics/configuration/localization.mdx)

### 6. Review packet

- Confirm whether multilingual content storage exists in any public surface today.
- If it exists, identify config keys, API behavior, fallback rules, and field-level semantics.
- Decide whether this page should remain a gap marker until feature docs are ready.

### 7. Status

- `ready-for-sme-review`

## 8. Batch summary

- Rewrote four pages as real draft docs: overview, collections, globals, and environment variables.
- Preserved Payload as the comparison source for structure, but grounded Dyrected facts in `apps/docs/content/docs/` and package exports.
- Converted `i18n` and `localization` into explicit gap pages because the current public Dyrected config surface does not document equivalent features.
- Avoided old `/docs/...` links in the rewritten pages.
- Remaining validation gap: SME confirmation is still needed for the two gap pages and for the final scope balance of the beginner-facing overview pages.
