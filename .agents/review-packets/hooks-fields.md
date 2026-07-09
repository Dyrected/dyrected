# Review Packet

## Review summary

- Document: `apps/docs/content/new-docs/basics/hooks/fields.mdx`
- Goal: Replace the stub with a clear split between server field hooks and admin field hooks, grounded in current runtime behavior.
- Audience: Developers choosing between field hooks, collection/global hooks, and admin-only reactive form hooks.
- Scope: Server `beforeChange`/`afterRead`, admin `onChange`/`options`, and guidance on when each surface fits.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs guidance | High | Voice and structure |
| `apps/docs/content/docs/concepts/hooks.mdx` | Existing docs | Medium | Legacy field/admin hook framing |
| `apps/docs/content/docs/reference/fields.mdx` | Existing docs | High | Field hook and admin hook reference material |
| `packages/core/src/types/schema-core.ts` | Source code | High | Field and admin hook signatures |
| `packages/core/src/utils/hooks.ts` | Source code | High | Recursive field hook execution |
| `packages/core/src/__tests__/hooks.test.ts` | Tests | High | Recursive `beforeChange` / `afterRead` behavior |
| `packages/admin/src/components/forms/form-engine.tsx` | Source code | High | `onChange` and `options` runtime behavior |
| `packages/admin/src/components/forms/__tests__/ui-hooks.test.tsx` | Tests | High | Async options and invalid selection reset |
| `https://payloadcms.com/docs/hooks/fields` | External comparison | High | Structural cue only; Dyrected surface is narrower |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Admin hook framing | "They improve editor experience, but they do not replace server hooks for enforcement." | Strongly implied by runtime, but phrasing is more interpretive than mechanical | Confirm phrasing |

## Reviewer questions

1. Confirmed direction: `fields.mdx` now briefly mentions that admin hooks are serialized and sandboxed in the dashboard.
2. Is the current split between server and admin hooks the right level of depth for this page?
3. Confirmed direction: the page now explicitly says admin hooks do not run for SDK or REST writes.

## High-risk areas

- Not overstating admin-hook capabilities
- Keeping the page practical without collapsing into raw API reference

## Suggested status

- `ready-for-sme-review`
