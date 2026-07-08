# Review Packet — basics/access-control/globals.mdx

## Review summary

- Document: Global Access Control (configuration guide).
- Goal: Reader knows globals have only `read`/`update` rules, how to set them, and the common "public read / admin update" pattern.
- Audience: Developers configuring globals.
- Starting point: Empty stub (`title: Globals`). From-scratch draft.
- Structure source: Payload `access-control/globals` (Config Options → Read → Update → Read Versions). Reused the read/update shape; dropped `readVersions` (see below); original wording.

> The five cross-cutting security-relevant findings are documented in full in **access-control-overview.md**. This packet lists only page-specific items.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/types/schema-config.ts` L394-397 | code | high | Global access exposes only `read` and `update` — no `create`/`delete`. |
| `packages/core/src/router.ts` L512-519 | code | high | `GET /api/globals/:slug`→read, `PATCH`→update via `accessGate`; `/seed` ungated. |
| `packages/core/src/controllers/global.controller.ts` L16-115 | code | high | Global controller does not re-check `access` with loaded data — route-middleware boolean gate only. |
| Payload `access-control/globals` | external | medium | Structure only. |

## Uncertainty register — this page

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Operations | Only `read`/`update`; no `create`/`delete`. | Verified against the type. Payload also documents `readVersions` for versioned globals — Dyrected's global access type has no such key, so it was omitted. Confirm globals-versions access is not a thing in Dyrected. | SME |
| What a global rule receives | Same `doc`/`data` gap as collections (finding #3). | Verified; flagged. | SME (finding #3) |

## Placeholder sweep

One intentional `{/* NEEDS-HUMAN-VERIFY … */}` comment in the "What a global rule receives" `<Warning>` (finding #3).

## Reviewer questions

1. Do versioned globals expose any access key equivalent to Payload's `readVersions`? If so, this page should cover it.
2. Confirm the recommended "public `read`, admin `update`" default is the right lead pattern for globals like site settings.

## Example consistency

- Single running example (`SiteSettings`) reused throughout, consistent with the overview/collections voice.

## High-risk areas

- None unique to globals beyond the shared findings. The default-open warning is important here because an unguarded global lets any caller rewrite site-wide settings.

## Canonical links

- Links inward to overview; outward to configuration/globals and global hooks. Correct.

## Suggested status label

`ready-for-sme-review`
