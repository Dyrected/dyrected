# Phase 8 `llms` Runtime Framing Review Packet

Date: 2026-07-29
Status: Draft ready for human review
Deliverable type: Machine-readable docs preamble and runtime docs index
Audience: Product, docs, platform

## Purpose

Review the new runtime-aware `llms` framing before treating it as final product positioning.

The implementation now emits:

- `apps/docs/public/llms.txt`
- `apps/docs/public/llm.txt`
- `apps/docs/public/llms-cloud.txt`
- `apps/docs/public/llms-self-hosted.txt`
- `apps/docs/public/llms-full-cloud.txt`
- `apps/docs/public/llms-full-self-hosted.txt`
- `apps/docs/public/llms-full.txt`

## Source Inventory

| Source | Trust | Why it matters | Notes |
|---|---|---|---|
| `specs/TODO-2026-07-29/dyrected-cloud-product-boundary-and-docs-spec.md` | High | Defines the Cloud vs self-hosted product boundary and required `llms.txt` framing. | Explicitly calls for a boundary-setting preamble and fixes the `llm.txt` path issue. |
| `specs/TODO-2026-07-29/dyrected-docs-architecture.md` | High | Defines the runtime-specific docs model and selector behavior. | Confirms AI-readable docs should follow the same runtime split as the site. |
| `packages/knowledge/generated/docs-runtime-manifest.json` | High | Runtime availability source of truth for page inclusion and canonical URLs. | Generated from docs frontmatter and section metadata. |
| Current docs corpus under `apps/docs/content/docs` | High | Provides page titles, descriptions, and body content for the generated outputs. | Still contains incremental runtime classification fallback for unclassified pages. |

## Uncertainty Register

- `legacy-unclassified` pages still default to `shared`, so some runtime-scoped outputs may contain pages that should later become runtime-specific.
- The new preamble reflects the current July 29, 2026 specs, not independently verified product copy from product leadership.

## High-Risk Claims To Verify

- `Dyrected Cloud is a managed content backend for website content, media, content APIs, editor access, publishing workflows, content rules, and content events.`
- `Self-hosted Dyrected runs inside your server application and supports arbitrary TypeScript hooks, custom authentication, custom endpoints, and broader application-specific backend logic.`
- `Use the Cloud docs when you want managed content infrastructure. Use the self-hosted docs when Dyrected must run inside your own runtime.`

## Review Questions

- Does the Cloud description over-promise anything the product does not currently support?
- Does the self-hosted description imply guarantees broader than the current runtime actually provides?
- Should the `llms.txt` index remain neutral, or should it explicitly prefer Cloud as the primary default path?
- Are there any runtime-specific pages that should be removed from `shared` fallback before these AI outputs are considered stable?

## Validation Notes

- The generator now derives all runtime-scoped `llms` URLs from the runtime manifest rather than legacy `/docs/<path>` path guesses.
- `llm.txt` is emitted as a compatibility alias for the singular path noted in the boundary spec.
