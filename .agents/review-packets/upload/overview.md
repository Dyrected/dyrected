# Review Packet — features/upload/overview.mdx

## Review summary

- Document: Upload Overview
- Goal: Reader understands what an upload collection is, when to create one, what `upload` controls directly, and how that differs from storage-adapter setup.
- Audience: Dyrected developers who are new to uploads and need the mental model before provider-specific configuration.
- Scope: Full rewrite of an empty page into the canonical conceptual guide for upload collections.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/types/schema-config.ts` | code | high | Confirms `upload?: boolean | UploadConfig` enables uploads and `multipart/form-data` handling. |
| `packages/core/src/types/schema-core.ts` | code | high | Confirms the top-level `UploadConfig` options (`allowedMimeTypes`, `maxFileSize`, `imageSizes`, `adminThumbnail`). |
| `packages/core/src/types/app-config.ts` and `apps/docs/content/docs/reference/configuration.mdx` | code + generated docs | high | Confirms root-level `storage` and `image` responsibilities. |
| `packages/core/src/controllers/media.controller.ts` | code | high | Confirms upload flow, image processing step, storage upload, and document creation. |
| `packages/core/src/utils/upload-validation.ts` | code | high | Confirms MIME wildcard support and current `415` / `413` validation behavior. |
| `packages/knowledge/src/recipes/upload-collection/recipe.ts` | code | high | Canonical minimal `media` collection example. |
| `packages/cli/src/commands/init.ts` | code | high | Confirms starter config creates a `media` collection with `upload: true`. |
| `apps/docs/DOCS_PHILOSOPHY.md` | docs standard | high | Voice and structure guidance. |
| Payload `https://payloadcms.com/docs/upload/overview` | external | medium | Structure only: conceptual frame first, then collection options, then deeper reference sections. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Image processing setup | The page intentionally says "configure a root-level `image` service" without naming a package | The repo currently exposes the interface and behavior, but this batch did not verify a currently shipped image-service package to recommend by name | Docs owner |
| Admin UI wording | "The Admin UI treats that collection as a media library" | Supported by current product behavior and older docs, but this page keeps it high-level instead of enumerating every upload UI feature | Docs owner |

## Reviewer questions

1. Is this the right page to be the canonical home for the upload-collection mental model, with storage-adapters linked as the deeper provider page?
2. Do we want this page to mention additional upload UI behavior such as cropping, or is that better left off the overview?
3. Should we name a specific image-service package here once that package surface is settled, or keep the guidance package-agnostic for now?

## High-risk areas

- Uploads cross page boundaries easily. The rewrite deliberately keeps provider setup off this page so it stays conceptual first.
- The validator status-code details (`415`, `413`) are accurate today, but they are implementation-level facts. If that behavior changes, this page should change with it.

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY` placeholders remain in the page.

## Suggested status label

`ready-for-sme-review`
