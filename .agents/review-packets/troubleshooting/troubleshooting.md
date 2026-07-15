# Review Packet — features/troubleshooting/troubleshooting.mdx

## Review summary

- Document: Troubleshooting
- Goal: Reader can classify a Dyrected problem by layer, run the right first checks in the right order, and switch into the correct deeper feature page without guessing.
- Audience: Dyrected developers who are blocked by a broken setup or feature and need a reliable first-stop troubleshooting page.
- Scope: Full rewrite of an empty page into the canonical troubleshooting overview for the new-docs feature set.

## Source inventory

| Source                                                                      | Type          | Trust  | Notes                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/content/new-docs/features/troubleshooting/troubleshooting.mdx`   | current page  | low    | Effectively empty starting point.                                                                                                                       |
| `apps/docs/DOCS_PHILOSOPHY.md`                                              | docs standard | high   | Voice, page boundary, and teaching-shape guidance.                                                                                                      |
| `apps/docs/content/new-docs/basics/getting-started/installation.mdx`        | new docs      | high   | Canonical install paths, framework differences, and mode-specific environment expectations.                                                             |
| `apps/docs/content/new-docs/features/admin/overview.mdx`                    | new docs      | high   | Confirms admin is schema-driven and framework-mounted.                                                                                                  |
| `apps/docs/content/new-docs/features/admin/custom-admin-panel-location.mdx` | new docs      | high   | Confirms admin location is controlled by the framework route, not a separate Dyrected remap setting.                                                    |
| `apps/docs/content/new-docs/features/admin/preview.mdx`                     | new docs      | high   | Canonical previewUrl and previewMode guidance, including Cloud-safe Jexl recommendation.                                                                |
| `apps/docs/content/new-docs/features/live-preview/overview.mdx`             | new docs      | high   | Canonical live-preview mental model and frontend handshake.                                                                                             |
| `apps/docs/content/new-docs/features/authentication/overview.mdx`           | new docs      | high   | Confirms auth collection setup and `DYRECTED_JWT_SECRET` requirements.                                                                                  |
| `apps/docs/content/new-docs/features/authentication/operations.mdx`         | new docs      | high   | Canonical flow semantics for auth endpoints and follow-up links.                                                                                        |
| `apps/docs/content/new-docs/features/upload/overview.mdx`                   | new docs      | high   | Canonical upload mental model: upload collection plus root storage/image setup.                                                                         |
| `apps/docs/content/new-docs/features/upload/storage-adapters.mdx`           | new docs      | high   | Canonical provider-level storage configuration path.                                                                                                    |
| `apps/docs/content/new-docs/features/email/overview.mdx`                    | new docs      | high   | Canonical transport and built-in auth-email behavior.                                                                                                   |
| `packages/cli/src/commands/init.ts`                                         | code          | high   | Confirms framework/backend/storage choices and Cloud-only React/Vue path.                                                                               |
| `packages/cli/src/commands/sync-schema.ts`                                  | code          | high   | Confirms required sync env vars, URL fallback behavior, warning/skip behavior, function-based access stripping, and `--skip-on-error` / `--skip-types`. |
| `packages/core/src/controllers/auth.controller.ts`                          | code          | high   | Confirms auth error messages, first-user behavior, forgot-password semantics, and best-effort email sending.                                            |
| `packages/core/src/controllers/preview.controller.ts`                       | code          | high   | Confirms preview-token and preview-data semantics, 15-minute token lifetime, and invalid-token behavior.                                                |
| `packages/core/src/controllers/media.controller.ts`                         | code          | high   | Confirms upload/storage/database failure modes and serving behavior.                                                                                    |
| `packages/core/src/services/email.service.ts`                               | code          | high   | Confirms Ethereal dev fallback, `nodemailer` dependency, and best-effort behavior split.                                                                |
| `packages/admin/src/hooks/use-add-media-from-url.ts`                        | code          | high   | Confirms current admin support for creating media records from a URL as a distinct path from binary upload.                                             |
| Payload `https://payloadcms.com/docs/troubleshooting/troubleshooting`       | external      | medium | Structure source only: classify problem first, then move through symptom-led fix sections.                                                              |

## Uncertainty register

| Section                   | Claim or gap                                                                                                          | Why uncertain                                                                                                    | Reviewer needed |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------- |
| Scope boundary            | The page intentionally stops at first checks and links out for deeper fixes rather than becoming a long error catalog | This is an editorial decision, not a runtime fact                                                                | Docs owner      |
| Cloud-safe config wording | The page names preview URLs and function-based access stripping as the main Cloud serialization pitfalls              | Verified in source, but this still compresses a broader Cloud-serialization story into a troubleshooting summary | Docs owner      |

## Reviewer questions

1. Is this the right canonical boundary for troubleshooting: classify the layer here, then push readers into the feature pages for exact fixes?
2. Should this page mention any additional high-frequency failures from support history that are not yet documented in `new-docs`?
3. Is the "add media from URL" note helpful in the uploads section, or does it belong on upload docs only?

## High-risk areas

- This page crosses many feature areas, so the main risk is over-explaining one subsystem and turning the page into duplicate reference material. The rewrite deliberately keeps it symptom-led and links out once the failing layer is identified.
- Cloud sync behavior is easy to misstate. The rewrite keeps the claims tight to current CLI behavior: missing core sync env vars skip sync with warnings, and unsupported function-based access rules are stripped with warnings.
- Preview troubleshooting is another place where docs drift easily. The rewrite limits itself to the verified current contracts: `previewUrl`, `previewMode`, token-vs-postMessage split, and preview token validation behavior.

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY` placeholders remain in the page.

## Suggested status label

`ready-for-sme-review`
