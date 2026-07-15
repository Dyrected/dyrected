# Review Packet — features/upload/storage-adapters.mdx

## Review summary

- Document: Storage Adapters
- Goal: Reader understands which storage adapters Dyrected currently ships, how to choose one, which env vars the CLI really scaffolds, and where adapter concerns stop and upload-collection concerns begin.
- Audience: Self-hosting Dyrected developers choosing or configuring file storage.
- Scope: Major rewrite of the authored prose around the generated storage contract, plus a source correction for the generated adapter description.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/storage-local/src/index.ts` | code | high | Confirms `localStorage` options and root-relative URL behavior. |
| `packages/storage-s3/src/index.ts` | code | high | Confirms `s3Storage` options: `bucket`, `region`, credentials, `endpoint`, `forcePathStyle`, `baseUrl`. |
| `packages/storage-b2/src/index.ts` | code | high | Confirms `b2Storage` options and optional `baseUrl`. |
| `packages/storage-cloudinary/src/index.ts` | code | high | Confirms `cloudinaryStorage` options and optional `folder`. |
| `packages/core/src/types/adapters.ts` | code | high | Canonical JSDoc source for the generated `StorageAdapter` reference block; updated in this pass to remove the false R2-package claim. |
| `packages/cli/src/utils/config-templates.ts` | code | high | Confirms exactly which storage env vars `dyrected init` writes into `.env.example` for `s3`, `b2`, and `cloudinary`. |
| `packages/cli/src/commands/init.ts` | code | high | Confirms the CLI only offers `local`, `s3`, `b2`, and `cloudinary` storage choices today. |
| `apps/docs/content/docs/adapters/storage.mdx` and `apps/docs/content/docs/guides/configuring-storage.mdx` | older docs | medium | Useful predecessor material, but currently drifted from code by mentioning R2/Spaces as if they were first-class documented adapter paths. |
| Payload `https://payloadcms.com/docs/upload/overview` | external | medium | Closest live structural analogue, but not a clean 1:1 page because Payload does not have a separate "storage adapters" guide with the same shape. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| S3-compatible providers | The page now says "AWS S3 and other S3-compatible services through the S3 adapter" | This is an inference from the adapter's `endpoint`, `forcePathStyle`, and `baseUrl` support rather than an explicit provider support matrix in current docs | Docs owner |
| Cloudinary positioning | "Provider-owned media pipeline" | Accurate as guidance, but still editorial wording rather than a direct code claim | Docs owner |

## Reviewer questions

1. Do we want a separate future page for S3-compatible provider recipes, or is the current "use `s3Storage` plus custom endpoint/base URL" guidance enough?
2. Should the docs continue mentioning R2 and Spaces anywhere once this batch is done, or should those older guides be rewritten to talk about S3-compatible configuration instead?
3. Is the env-var distinction clear enough between what the CLI scaffolds and what the runtime adapter also supports but leaves to the user?

## High-risk areas

- Older docs currently overstate first-class support for R2 and Spaces. This page now stays aligned with the actual shipped packages and CLI scaffolding.
- The page hosts a generated contract block. The generated-source JSDoc was updated in this pass so the public interface description no longer claims a dedicated R2 adapter exists.

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY` placeholders remain in the page. The generated reference block is intentional and source-backed.

## Suggested status label

`ready-for-sme-review`
